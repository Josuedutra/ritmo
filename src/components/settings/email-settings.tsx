"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/components/ui/use-toast";
import { Organization } from "@prisma/client";
import { ExternalLink, Lock, Mail } from "lucide-react";

type SmtpProvider = "gmail" | "other";

const smtpSchema = z.object({
  smtpHost: z.string().min(1, "Host obrigatório"),
  smtpPort: z.coerce.number().min(1, "Porta obrigatória"),
  smtpUser: z.string().min(1, "Email de envio obrigatório"),
  smtpPassEncrypted: z.string().min(1, "Password obrigatória"),
  smtpFrom: z.string().email("Email inválido"),
});

interface EmailSettingsProps {
  organization: Organization;
  isFree?: boolean;
}

const GMAIL_HOST = "smtp.gmail.com";
const GMAIL_PORT = 587;

function detectProvider(host: string | null): SmtpProvider {
  if (!host || host.includes("gmail") || host.includes("google")) return "gmail";
  return "other";
}

export function EmailSettings({ organization, isFree = false }: EmailSettingsProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [provider, setProvider] = useState<SmtpProvider>(
    detectProvider(organization.smtpHost || null)
  );

  const form = useForm<z.infer<typeof smtpSchema>>({
    resolver: zodResolver(
      smtpSchema.extend({
        smtpPassEncrypted: z.string().optional(),
      })
    ),
    defaultValues: {
      smtpHost: organization.smtpHost || (provider === "gmail" ? GMAIL_HOST : ""),
      smtpPort: organization.smtpPort || (provider === "gmail" ? GMAIL_PORT : 587),
      smtpUser: organization.smtpUser || organization.smtpFrom || "",
      smtpPassEncrypted: "",
      smtpFrom: organization.smtpFrom || organization.smtpUser || "",
    },
  });

  function handleProviderChange(next: SmtpProvider) {
    setProvider(next);
    if (next === "gmail") {
      form.setValue("smtpHost", GMAIL_HOST);
      form.setValue("smtpPort", GMAIL_PORT);
    } else {
      form.setValue("smtpHost", organization.smtpHost || "");
      form.setValue("smtpPort", organization.smtpPort || 587);
    }
  }

  async function handleTest(data: z.infer<typeof smtpSchema>) {
    if (!data.smtpPassEncrypted) {
      toast({
        variant: "warning",
        title: "Password necessária para teste",
        description: "Por favor insira a password de aplicação para testar a conexão.",
      });
      return false;
    }

    try {
      const host = provider === "gmail" ? GMAIL_HOST : data.smtpHost;
      const port = provider === "gmail" ? GMAIL_PORT : data.smtpPort;

      const response = await fetch("/api/settings/smtp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host,
          port,
          user: data.smtpUser,
          pass: data.smtpPassEncrypted,
          from: data.smtpUser,
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
        variant: "error",
        title: "Falha no teste",
        description: error instanceof Error ? error.message : "Erro desconhecido",
      });
      return false;
    }
  }

  function onSubmit(data: z.infer<typeof smtpSchema>) {
    startTransition(async () => {
      if (data.smtpPassEncrypted) {
        const testSuccess = await handleTest(data);
        if (!testSuccess) return;
      }

      const host = provider === "gmail" ? GMAIL_HOST : data.smtpHost;
      const port = provider === "gmail" ? GMAIL_PORT : data.smtpPort;

      try {
        const response = await fetch("/api/settings/smtp", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "smtp",
            host,
            port,
            user: data.smtpUser,
            pass: data.smtpPassEncrypted,
            from: data.smtpUser,
          }),
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || "Erro ao guardar");
        }

        toast({
          title: "Sucesso",
          description: "Configuração de email guardada com sucesso.",
        });
      } catch (error) {
        toast({
          variant: "error",
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
            <Badge variant="default" className="bg-green-600">
              Automático disponível
            </Badge>
          ) : (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-muted-foreground">
                Modo manual
              </Badge>
              {isFree && (
                <Button size="sm" variant="link">
                  Fazer Upgrade
                </Button>
              )}
            </div>
          )}
        </div>
        <CardDescription>Configure como os emails de follow-up serão enviados.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Option A: SMTP */}
        <div className={`space-y-4 ${isFree ? "pointer-events-none opacity-50" : ""}`}>
          <h3 className="text-sm font-medium">Opção A — Email Próprio</h3>

          {/* Provider selector */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={provider === "gmail" ? "default" : "outline"}
              size="sm"
              onClick={() => handleProviderChange("gmail")}
            >
              Gmail / Google Workspace
            </Button>
            <Button
              type="button"
              variant={provider === "other" ? "default" : "outline"}
              size="sm"
              onClick={() => handleProviderChange("other")}
            >
              Outro servidor
            </Button>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Email field — shown for all providers */}
              <FormField
                control={form.control}
                name="smtpUser"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email de envio</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder={
                          provider === "gmail" ? "eu@minhagmail.com" : "eu@minhaempresa.com"
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password field */}
              <FormField
                control={form.control}
                name="smtpPassEncrypted"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>
                        {provider === "gmail" ? "Password de aplicação" : "Password"}
                      </FormLabel>
                      {provider === "gmail" && (
                        <a
                          href="https://support.google.com/accounts/answer/185833"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary flex items-center gap-1 text-xs hover:underline"
                        >
                          Como criar uma password de aplicação no Gmail
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder={organization.smtpHost ? "••••••••" : ""}
                      />
                    </FormControl>
                    <FormMessage />
                    {provider === "gmail" && (
                      <p className="text-muted-foreground text-xs">
                        Nas definições da conta Google → Segurança → Passwords de aplicação
                      </p>
                    )}
                  </FormItem>
                )}
              />

              {/* Advanced config — hidden by default for other providers; not shown for Gmail */}
              {provider === "other" && (
                <Accordion type="single" collapsible className="rounded-md border px-3">
                  <AccordionItem value="advanced" className="border-0">
                    <AccordionTrigger className="py-3 text-sm font-normal hover:no-underline">
                      Configuração avançada (Host e Porta)
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-2 gap-4 pt-1">
                        <FormField
                          control={form.control}
                          name="smtpHost"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Host SMTP</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="smtp.exemplo.com" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="smtpPort"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Porta</FormLabel>
                              <FormControl>
                                <Input {...field} type="number" placeholder="587" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={form.handleSubmit((data) => handleTest(data))}
                  disabled={isPending}
                >
                  Testar conexão
                </Button>
                <Button type="submit" disabled={isPending}>
                  Guardar configuração
                </Button>
              </div>
            </form>
          </Form>
        </div>

        {isFree && (
          <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-600">
            <Lock className="h-4 w-4" />
            <span className="text-sm font-medium">Disponível em planos pagos/trial</span>
          </div>
        )}

        {/* Option B: Via Ritmo */}
        <div className="border-t pt-6">
          <h3 className="mb-2 text-sm font-medium">Opção B — Via Ritmo</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-muted-foreground text-sm">
                O Ritmo envia em seu nome. Sem configuração necessária.
              </p>
              <Badge variant="outline" className="flex items-center gap-1 font-mono text-xs">
                <Mail className="h-3 w-3" />
                @useritmo.pt
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs">
              Os seus contactos recebem os emails enviados pelo domínio Ritmo.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
