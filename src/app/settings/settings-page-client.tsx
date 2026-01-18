"use client";

import { useState } from "react";
import Link from "next/link";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    Button,
    Badge,
    Input,
    Label,
    toast,
} from "@/components/ui";
import {
    Mail,
    Copy,
    ExternalLink,
    CreditCard,
    FileText,
    Lock,
    Check,
    AlertTriangle,
    Loader2,
    Settings,
    Inbox,
} from "lucide-react";

interface SettingsData {
    organization: {
        id: string;
        name: string;
        timezone: string;
        sendWindowStart: string;
        sendWindowEnd: string;
    };
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
    const { email, bcc, templates, entitlements } = data;
    const [smtpForm, setSmtpForm] = useState({
        host: email.smtpHost || "",
        port: email.smtpPort?.toString() || "587",
        user: email.smtpUser || "",
        pass: "",
        from: email.smtpFrom || "",
    });
    const [emailMode, setEmailMode] = useState<"smtp" | "ritmo">(email.mode);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);

    const isFree = entitlements.tier === "free";
    const canAutoEmail = entitlements.autoEmailEnabled;
    const canBcc = entitlements.bccInboundEnabled;

    const handleCopyBcc = async () => {
        try {
            await navigator.clipboard.writeText(bcc.address);
            toast.success("Endereço BCC copiado!");
        } catch {
            toast.error("Erro ao copiar");
        }
    };

    const handleSaveSmtp = async () => {
        setSaving(true);
        try {
            const response = await fetch("/api/settings/smtp", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mode: emailMode,
                    ...(emailMode === "smtp" && {
                        host: smtpForm.host,
                        port: parseInt(smtpForm.port),
                        user: smtpForm.user,
                        pass: smtpForm.pass || undefined,
                        from: smtpForm.from,
                    }),
                }),
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || "Erro ao guardar");
            }

            toast.success("Configuração guardada!");
        } catch (error) {
            toast.error("Erro", error instanceof Error ? error.message : "Erro desconhecido");
        } finally {
            setSaving(false);
        }
    };

    const handleTestSmtp = async () => {
        setTesting(true);
        try {
            const response = await fetch("/api/settings/smtp/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    host: smtpForm.host,
                    port: parseInt(smtpForm.port),
                    user: smtpForm.user,
                    pass: smtpForm.pass,
                    from: smtpForm.from,
                }),
            });

            const result = await response.json();

            if (response.ok && result.success) {
                toast.success("Teste bem-sucedido!", "Conexão SMTP verificada.");
            } else {
                toast.error("Teste falhou", result.error || "Verifique as credenciais.");
            }
        } catch {
            toast.error("Erro", "Não foi possível testar a conexão.");
        } finally {
            setTesting(false);
        }
    };

    // Feature lock overlay component
    const FeatureLock = ({ feature }: { feature: string }) => (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-[var(--color-background)]/80 backdrop-blur-[2px]">
            <div className="text-center">
                <Lock className="mx-auto mb-2 h-6 w-6 text-[var(--color-muted-foreground)]" />
                <p className="text-sm font-medium">{feature}</p>
                <p className="mb-3 text-xs text-[var(--color-muted-foreground)]">
                    Disponível em planos pagos ou trial
                </p>
                <Link href="/settings/billing">
                    <Button size="sm" variant="outline" className="gap-1.5">
                        <CreditCard className="h-3.5 w-3.5" />
                        Atualizar plano
                    </Button>
                </Link>
            </div>
        </div>
    );

    // Health status - P1-SET-06
    const smtpConfigured = emailMode === "smtp" && !!email.smtpHost;
    const emailReady = emailMode === "ritmo" || smtpConfigured;
    const bccReady = !!bcc.address;
    const templatesReady = templates.count > 0;

    const HealthCheck = ({ ok, label }: { ok: boolean; label: string }) => (
        <div className="flex items-center gap-1.5 text-xs">
            <div
                className={`h-2 w-2 rounded-full ${
                    ok ? "bg-green-500" : "bg-yellow-500"
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
                                className={`rounded-full p-2 ${
                                    isFree
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
                    {/* Health mini - P1-SET-06 */}
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

            {/* Email Section - P0-SET-03 */}
            <Card className="relative">
                {isFree && !canAutoEmail && <FeatureLock feature="Emails automáticos" />}
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        <CardTitle>Configuração de Email</CardTitle>
                    </div>
                    <CardDescription>
                        Configure como os emails de follow-up são enviados
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Mode selection */}
                    <div className="grid gap-3 sm:grid-cols-2">
                        <button
                            type="button"
                            onClick={() => setEmailMode("ritmo")}
                            className={`rounded-lg border p-4 text-left transition-colors ${
                                emailMode === "ritmo"
                                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                                    : "border-[var(--color-border)] hover:bg-[var(--color-muted)]"
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <div
                                    className={`h-4 w-4 rounded-full border-2 ${
                                        emailMode === "ritmo"
                                            ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
                                            : "border-[var(--color-muted-foreground)]"
                                    }`}
                                >
                                    {emailMode === "ritmo" && (
                                        <Check className="h-3 w-3 text-white" />
                                    )}
                                </div>
                                <span className="font-medium">Via Ritmo</span>
                            </div>
                            <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                                Emails enviados através do Ritmo. Simples e sem configuração.
                            </p>
                        </button>

                        <button
                            type="button"
                            onClick={() => setEmailMode("smtp")}
                            className={`rounded-lg border p-4 text-left transition-colors ${
                                emailMode === "smtp"
                                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                                    : "border-[var(--color-border)] hover:bg-[var(--color-muted)]"
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <div
                                    className={`h-4 w-4 rounded-full border-2 ${
                                        emailMode === "smtp"
                                            ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
                                            : "border-[var(--color-muted-foreground)]"
                                    }`}
                                >
                                    {emailMode === "smtp" && (
                                        <Check className="h-3 w-3 text-white" />
                                    )}
                                </div>
                                <span className="font-medium">SMTP próprio</span>
                            </div>
                            <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                                Enviar através do seu servidor de email (Gmail, Outlook, etc.)
                            </p>
                        </button>
                    </div>

                    {/* SMTP form */}
                    {emailMode === "smtp" && (
                        <div className="space-y-4 rounded-lg border border-[var(--color-border)] p-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="smtp-host">Servidor SMTP</Label>
                                    <Input
                                        id="smtp-host"
                                        value={smtpForm.host}
                                        onChange={(e) =>
                                            setSmtpForm((prev) => ({
                                                ...prev,
                                                host: e.target.value,
                                            }))
                                        }
                                        placeholder="smtp.gmail.com"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="smtp-port">Porta</Label>
                                    <Input
                                        id="smtp-port"
                                        value={smtpForm.port}
                                        onChange={(e) =>
                                            setSmtpForm((prev) => ({
                                                ...prev,
                                                port: e.target.value,
                                            }))
                                        }
                                        placeholder="587"
                                    />
                                </div>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="smtp-user">Utilizador</Label>
                                    <Input
                                        id="smtp-user"
                                        value={smtpForm.user}
                                        onChange={(e) =>
                                            setSmtpForm((prev) => ({
                                                ...prev,
                                                user: e.target.value,
                                            }))
                                        }
                                        placeholder="email@exemplo.com"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="smtp-pass">Password</Label>
                                    <Input
                                        id="smtp-pass"
                                        type="password"
                                        value={smtpForm.pass}
                                        onChange={(e) =>
                                            setSmtpForm((prev) => ({
                                                ...prev,
                                                pass: e.target.value,
                                            }))
                                        }
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="smtp-from">Email de envio (From)</Label>
                                <Input
                                    id="smtp-from"
                                    value={smtpForm.from}
                                    onChange={(e) =>
                                        setSmtpForm((prev) => ({
                                            ...prev,
                                            from: e.target.value,
                                        }))
                                    }
                                    placeholder="nome@empresa.com"
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    onClick={handleTestSmtp}
                                    disabled={testing || !smtpForm.host}
                                    variant="outline"
                                    className="gap-1.5"
                                >
                                    {testing && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Testar conexão
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end">
                        <Button onClick={handleSaveSmtp} disabled={saving} className="gap-1.5">
                            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                            Guardar configuração
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* BCC Section - P0-SET-04 */}
            <Card className="relative">
                {isFree && !canBcc && <FeatureLock feature="Captura BCC" />}
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Inbox className="h-5 w-5" />
                        <CardTitle>Captura BCC</CardTitle>
                    </div>
                    <CardDescription>
                        Adicione em BCC ao enviar orçamentos para anexar automaticamente
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/30 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <code className="flex-1 rounded bg-[var(--color-background)] px-3 py-2 text-sm font-mono">
                                {bcc.address}
                            </code>
                            <Button
                                onClick={handleCopyBcc}
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                            >
                                <Copy className="h-4 w-4" />
                                Copiar
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-2 text-sm text-[var(--color-muted-foreground)]">
                        <p>
                            <strong>Como funciona:</strong> Ao enviar um orçamento por email,
                            adicione este endereço em BCC. O Ritmo irá capturar automaticamente
                            o PDF ou link da proposta e associar ao orçamento correto.
                        </p>
                        <p>
                            Funciona com Gmail, Outlook e qualquer cliente de email.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Templates Section - P0-SET-05 */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            <CardTitle>Templates</CardTitle>
                        </div>
                        <Badge variant="secondary">{templates.count} ativos</Badge>
                    </div>
                    <CardDescription>
                        Personalizar emails de follow-up e scripts de chamada
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Link href="/templates">
                        <Button variant="outline" className="w-full gap-1.5">
                            <Settings className="h-4 w-4" />
                            Gerir templates
                            <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                    </Link>
                </CardContent>
            </Card>

            {/* Quick links */}
            <div className="grid gap-4 sm:grid-cols-2">
                <Link href="/settings/billing">
                    <Card className="h-full transition-colors hover:bg-[var(--color-muted)]/50">
                        <CardContent className="flex items-center gap-3 py-4">
                            <CreditCard className="h-5 w-5 text-[var(--color-muted-foreground)]" />
                            <div>
                                <p className="font-medium">Faturação</p>
                                <p className="text-sm text-[var(--color-muted-foreground)]">
                                    {entitlements.planName} · Gerir plano e pagamentos
                                </p>
                            </div>
                            <ExternalLink className="ml-auto h-4 w-4 text-[var(--color-muted-foreground)]" />
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/templates">
                    <Card className="h-full transition-colors hover:bg-[var(--color-muted)]/50">
                        <CardContent className="flex items-center gap-3 py-4">
                            <FileText className="h-5 w-5 text-[var(--color-muted-foreground)]" />
                            <div>
                                <p className="font-medium">Templates</p>
                                <p className="text-sm text-[var(--color-muted-foreground)]">
                                    {templates.count} templates · Editar emails e scripts
                                </p>
                            </div>
                            <ExternalLink className="ml-auto h-4 w-4 text-[var(--color-muted-foreground)]" />
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    );
}
