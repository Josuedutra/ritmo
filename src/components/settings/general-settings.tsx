"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Organization } from "@prisma/client";

const settingsSchema = z.object({
    timezone: z.string().min(1, "Fuso horário obrigatório"),
    sendWindowStart: z.coerce.number().min(0).max(23),
    sendWindowEnd: z.coerce.number().min(0).max(23),
}).refine((data) => data.sendWindowEnd > data.sendWindowStart, {
    message: "A hora de fim deve ser posterior à de início",
    path: ["sendWindowEnd"],
});

interface GeneralSettingsProps {
    organization: Organization;
}

export function GeneralSettings({ organization }: GeneralSettingsProps) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const form = useForm<z.infer<typeof settingsSchema>>({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            timezone: organization.timezone,
            sendWindowStart: parseInt(organization.sendWindowStart) || 9,
            sendWindowEnd: parseInt(organization.sendWindowEnd) || 18,
        },
    });

    function onSubmit(data: z.infer<typeof settingsSchema>) {
        startTransition(async () => {
            try {
                const response = await fetch("/api/settings/organization", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                });

                if (!response.ok) {
                    const result = await response.json();
                    throw new Error(result.error || "Erro ao guardar");
                }

                toast({
                    title: "Sucesso",
                    description: "Definições guardadas com sucesso. A nova cadência respeitará estes horários.",
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

    // Common timezones
    const timezones = [
        "Europe/Lisbon",
        "Europe/Madrid",
        "Europe/London",
        "Europe/Paris",
        "America/Sao_Paulo",
        "America/New_York",
        "UTC"
    ];

    // Hours for dropdown
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Geral</CardTitle>
                <CardDescription>
                    Configure o fuso horário e horário de envio dos emails automáticos.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                        <FormField control={form.control} name="timezone" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Fuso Horário</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o fuso horário" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {timezones.map((tz) => (
                                            <SelectItem key={tz} value={tz}>
                                                {tz}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="sendWindowStart" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Início da Janela de Envio</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Início" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {hours.map((h) => (
                                                <SelectItem key={h} value={String(h)}>
                                                    {h.toString().padStart(2, '0')}:00
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="sendWindowEnd" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Fim da Janela de Envio</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Fim" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {hours.map((h) => (
                                                <SelectItem key={h} value={String(h)}>
                                                    {h.toString().padStart(2, '0')}:00
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>

                        <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                            <p>
                                O Ritmo apenas enviará emails automáticos entre as {form.watch("sendWindowStart")}:00 e as {form.watch("sendWindowEnd")}:00 do fuso horário selecionado.
                                Envs fora deste horário serão agendados para a próxima janela disponível.
                            </p>
                        </div>

                        <Button type="submit" disabled={isPending}>Guardar</Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
