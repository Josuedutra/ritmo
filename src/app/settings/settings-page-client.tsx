"use client";

import Link from "next/link";
import {
    Card,
    CardContent,
    Button,
    Badge,
} from "@/components/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    CreditCard,
    FileText,
    Check,
    AlertTriangle,
    Settings,
    ExternalLink,
} from "lucide-react";
import { Organization } from "@prisma/client";
import { EmailSettings } from "@/components/settings/email-settings";
import { BccSettings } from "@/components/settings/bcc-settings";
import { GeneralSettings } from "@/components/settings/general-settings";
import { useRouter, useSearchParams } from "next/navigation";

interface SettingsData {
    organization: Organization;
    email: {
        mode: "smtp" | "ritmo";
        smtpHost: string | null;
        smtpPort: number | null;
        smtpUser: string | null;
        smtpFrom: string | null;
    };
    bcc: {
        address: string;
    };
    templates: {
        count: number;
    };
    entitlements: {
        tier: "trial" | "free" | "paid";
        planName: string;
        autoEmailEnabled: boolean;
        bccInboundEnabled: boolean;
    };
}

interface SettingsPageClientProps {
    data: SettingsData;
}

export function SettingsPageClient({ data }: SettingsPageClientProps) {
    const { organization, email, bcc, templates, entitlements } = data;
    const router = useRouter();
    const searchParams = useSearchParams();

    // Default tab from URL or 'general' as first usually, but email is fine. Let's make General first? 
    // User asked to integrate general organization settings.
    const defaultTab = searchParams.get('tab') || 'general';

    const isFree = entitlements.tier === "free";
    const canAutoEmail = entitlements.autoEmailEnabled;
    const canBcc = entitlements.bccInboundEnabled;

    // Health status logic
    const smtpConfigured = email.mode === "smtp" && !!email.smtpHost;
    const emailReady = email.mode === "ritmo" || smtpConfigured;
    const bccReady = !!bcc.address;
    const templatesReady = templates.count > 0;

    const HealthCheck = ({ ok, label }: { ok: boolean; label: string }) => (
        <div className="flex items-center gap-1.5 text-xs">
            <div
                className={`h-2 w-2 rounded-full ${ok ? "bg-green-500" : "bg-yellow-500"
                    }`}
            />
            <span className={ok ? "text-green-600" : "text-yellow-600"}>{label}</span>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Status banner with health mini */}
            <Card>
                <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div
                                className={`rounded-full p-2 ${isFree
                                    ? "bg-yellow-500/10 text-yellow-500"
                                    : "bg-green-500/10 text-green-500"
                                    }`}
                            >
                                {isFree ? (
                                    <AlertTriangle className="h-5 w-5" />
                                ) : (
                                    <Check className="h-5 w-5" />
                                )}
                            </div>
                            <div>
                                <p className="font-medium">
                                    {isFree ? "Modo Manual" : "Automação Ativa"}
                                </p>
                                <p className="text-sm text-[var(--color-muted-foreground)]">
                                    {isFree
                                        ? "Emails e captura BCC bloqueados no plano gratuito"
                                        : `Plano ${entitlements.planName} · Emails automáticos ativos`}
                                </p>
                            </div>
                        </div>
                        <Link href="/settings/billing">
                            <Button variant="outline" className="gap-1.5">
                                <CreditCard className="h-4 w-4" />
                                {isFree ? "Atualizar" : "Gerir plano"}
                            </Button>
                        </Link>
                    </div>
                    {/* Health mini */}
                    {!isFree && (
                        <div className="mt-3 flex items-center gap-4 border-t border-[var(--color-border)] pt-3">
                            <span className="text-xs text-[var(--color-muted-foreground)]">Estado:</span>
                            <HealthCheck ok={emailReady} label={emailReady ? "Email OK" : "Email pendente"} />
                            <HealthCheck ok={bccReady} label={bccReady ? "BCC OK" : "BCC pendente"} />
                            <HealthCheck ok={templatesReady} label={templatesReady ? `${templates.count} Templates` : "Sem templates"} />
                        </div>
                    )}
                </CardContent>
            </Card>

            <Tabs defaultValue={defaultTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
                    <TabsTrigger value="general">Geral</TabsTrigger>
                    <TabsTrigger value="email">Email (Envio)</TabsTrigger>
                    <TabsTrigger value="bcc">Captura BCC</TabsTrigger>
                    <TabsTrigger value="templates">Templates</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="mt-6">
                    <GeneralSettings organization={organization} />
                </TabsContent>

                <TabsContent value="email" className="mt-6">
                    <EmailSettings organization={organization} isFree={isFree} />
                </TabsContent>

                <TabsContent value="bcc" className="mt-6">
                    <BccSettings organization={organization} isFree={isFree} />
                </TabsContent>

                <TabsContent value="templates" className="mt-6">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium">Os seus templates</h3>
                                <Badge variant="secondary">{templates.count} ativos</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-6">
                                Personalize os emails automáticos e scripts de chamada que o Ritmo utiliza.
                            </p>

                            <Link href="/templates">
                                <Button className="gap-2">
                                    <FileText className="h-4 w-4" />
                                    Gerir Templates
                                    <ExternalLink className="h-4 w-4 ml-1" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
