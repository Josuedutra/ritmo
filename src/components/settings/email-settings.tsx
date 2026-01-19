"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Organization } from "@prisma/client";
import { Lock } from "lucide-react";

const smtpSchema = z.object({
    smtpHost: z.string().min(1, "Host obrigatório"),
    smtpPort: z.coerce.number().min(1, "Porta obrigatória"),
    smtpUser: z.string().min(1, "Utilizador obrigatório"),
    smtpPassEncrypted: z.string().min(1, "Password obrigatória"),
    smtpFrom: z.string().email("Email inválido"),
});

interface EmailSettingsProps {
    organization: Organization;
    isFree?: boolean;
}

export function EmailSettings({ organization, isFree = false }: EmailSettingsProps) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    // Password is optional validation-wise because it might be already set on server
    const form = useForm<z.infer<typeof smtpSchema>>({
        resolver: zodResolver(
            smtpSchema.extend({
                smtpPassEncrypted: z.string().optional(),
            })
        ),
        defaultValues: {
            smtpHost: organization.smtpHost || "",
            smtpPort: organization.smtpPort || 587,
            smtpUser: organization.smtpUser || "",
            smtpPassEncrypted: "", // Don't show existing password
            smtpFrom: organization.smtpFrom || "",
        },
    });

    async function handleTest(data: z.infer<typeof smtpSchema>) {
        // If testing, we need a password. If field is empty, we can't test unless we assume server has it.
        // But for "Test Connection", we usually want to test the inputs active in the form.
        // If the user hasn't typed a password, we can't really test efficiently without a backend change to support "test with stored password".
        // The /api/settings/smtp/test endpoint expects a password.

        // Strategy: Require password for Test only if it's not empty? 
        // Or warn user "Enter password to test".

        if (!data.smtpPassEncrypted) {
            toast({
                variant: "warning",
                title: "Password necessária para teste",
                description: "Por favor insira a password para testar a conexão.",
            });
            return false;
        }

        try {
            const response = await fetch("/api/settings/smtp/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    host: data.smtpHost,
                    port: data.smtpPort,
                    user: data.smtpUser,
                    pass: data.smtpPassEncrypted,
                    from: data.smtpFrom,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Erro no teste de conexão");
            }

            toast({
                title: "Conexão OK",
                description: "Teste de conexão SMTP realizado com sucesso.",
            });
            return true;
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Falha no teste",
                description: error instanceof Error ? error.message : "Erro desconhecido",
            });
            return false;
        }
    }

    function onSubmit(data: z.infer<typeof smtpSchema>) {
        startTransition(async () => {
            // 1. Run test first if password is provided
            if (data.smtpPassEncrypted) {
                const testSuccess = await handleTest(data);
                if (!testSuccess) return; // Don't save if test fails
            }

            try {
                const response = await fetch("/api/settings/smtp", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        mode: "smtp",
                        host: data.smtpHost,
                        port: data.smtpPort,
                        user: data.smtpUser,
                        pass: data.smtpPassEncrypted, // Empty string will be ignored by server
                        from: data.smtpFrom,
                    }),
                });

                if (!response.ok) {
                    const result = await response.json();
                    throw new Error(result.error || "Erro ao guardar");
                }

                toast({
                    title: "Sucesso",
                    description: "Configuração SMTP guardada com sucesso.",
                });
            } catch (error) {
                toast({
                    variant: "destructive",
                    title: "Erro",
                    description: error instanceof Error ? error.message : "Erro desconhecido",
                });
            }
        });
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Email (Envio)</CardTitle>
                    {organization.autoEmailEnabled ? (
                        <Badge variant="default" className="bg-green-600">Automático disponível</Badge>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-muted-foreground">Modo manual</Badge>
                            {isFree && <Button size="sm" variant="link">Fazer Upgrade</Button>}
                        </div>
                    )}
                </div>
                <CardDescription>
                    Configure como os emails de follow-up serão enviados.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Option A: SMTP */}
                <div className={`space-y-4 ${isFree ? "opacity-50 pointer-events-none" : ""}`}>
                    <h3 className="text-sm font-medium">Opção A — SMTP Próprio</h3>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="smtpHost" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Host</FormLabel>
                                        <FormControl><Input {...field} placeholder="smtp.gmail.com" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="smtpPort" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Porta</FormLabel>
                                        <FormControl><Input {...field} type="number" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="smtpUser" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Utilizador</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="smtpPassEncrypted" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Password</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                type="password"
                                                placeholder={organization.smtpHost ? "••••••••" : ""}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>

                            <FormField control={form.control} name="smtpFrom" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email de Envio (From)</FormLabel>
                                    <FormControl><Input {...field} placeholder="eu@minhaempresa.com" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <div className="flex gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={form.handleSubmit((data) => handleTest(data))}
                                    disabled={isPending}
                                >
                                    Testar conexão
                                </Button>
                                <Button type="submit" disabled={isPending}>Guardar configuração</Button>
                            </div>
                        </form>
                    </Form>
                </div>

                {isFree && (
                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-4 rounded-md border border-amber-200">
                        <Lock className="w-4 h-4" />
                        <span className="text-sm font-medium">Disponível em planos pagos/trial</span>
                    </div>
                )}

                {/* Option B: Ritmo */}
                <div className="pt-6 border-t">
                    <h3 className="text-sm font-medium mb-2">Opção B — Via Ritmo</h3>
                    <p className="text-sm text-muted-foreground mb-1">
                        Se não configurar SMTP, o Ritmo pode enviar emails por si.
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Remetente configurado pela sua organização.
                    </p>
                </div>

            </CardContent>
        </Card>
    );
}
