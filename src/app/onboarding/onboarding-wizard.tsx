"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardFooter,
    toast,
    Badge,
    Alert,
    AlertDescription,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
    StatusBadge,
    type StatusBadgeStatus,
} from "@/components/ui";
import {
    FileText,
    Mail,
    Copy,
    Check,
    ChevronRight,
    ChevronLeft,
    Sparkles,
    Settings,
    ArrowRight,
    Loader2,
    LogOut,
    Info,
    Inbox,
    Rocket,
    Zap,
    Search,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Clock,
} from "lucide-react";

interface Template {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
}

interface OnboardingWizardProps {
    orgName: string;
    bccEmail: string;
    hasSmtp: boolean;
    hasBcc: boolean;
    hasTemplates: boolean;
    hasQuotes: boolean;
    templates: Template[];
    bccInboundEnabled: boolean;
    trialBccLimitReached: boolean;
    tier: "free" | "trial" | "paid";
}

const STEPS = [
    { id: "welcome", title: "Início", description: "Conheça o Ritmo" },
    { id: "templates", title: "Mensagens", description: "Templates de follow-up" },
    { id: "smtp", title: "Envio", description: "Configurar email" },
    { id: "bcc", title: "Captura", description: "Receber propostas" },
    { id: "complete", title: "Pronto", description: "Começar a usar" },
];

export function OnboardingWizard({
    orgName,
    bccEmail,
    hasSmtp,
    hasBcc,
    hasTemplates,
    hasQuotes,
    templates,
    bccInboundEnabled,
    trialBccLimitReached,
    tier,
}: OnboardingWizardProps) {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [bccCopied, setBccCopied] = useState(false);
    const [completing, setCompleting] = useState(false);
    const [saving, setSaving] = useState(false);
    // Default é "ritmo" (recomendado para começar), exceto se já tem SMTP configurado
    const [smtpChoice, setSmtpChoice] = useState<"own" | "ritmo">(hasSmtp ? "own" : "ritmo");

    // Verificar captura modal state
    const [verifyModalOpen, setVerifyModalOpen] = useState(false);
    const [verifyStatus, setVerifyStatus] = useState<"idle" | "loading" | "success" | "not_found" | "trial_limit" | "error">("idle");
    const [verifyData, setVerifyData] = useState<{ receivedAt?: string; subject?: string } | null>(null);

    const handleVerifyCapture = async () => {
        setVerifyStatus("loading");
        try {
            const response = await fetch("/api/inbound/status");
            const data = await response.json();

            if (!response.ok) {
                setVerifyStatus("error");
                return;
            }

            if (data.found) {
                setVerifyStatus("success");
                setVerifyData({
                    receivedAt: data.receivedAt,
                    subject: data.subject,
                });
            } else if (data.trialLimitReached) {
                setVerifyStatus("trial_limit");
            } else {
                setVerifyStatus("not_found");
            }
        } catch (error) {
            console.error("Error verifying capture:", error);
            setVerifyStatus("error");
        }
    };

    const resetVerifyModal = () => {
        setVerifyStatus("idle");
        setVerifyData(null);
    };

    // Derive BCC status for StatusBadge
    const getBccStatus = (): StatusBadgeStatus => {
        if (!bccInboundEnabled) return "disabled";
        if (trialBccLimitReached) return "limited";
        if (verifyStatus === "loading") return "pending";
        if (verifyStatus === "success") return "verified";
        return "active";
    };

    const handleCopyBcc = async () => {
        try {
            await navigator.clipboard.writeText(bccEmail);
            setBccCopied(true);
            toast.success("Email BCC copiado");
            setTimeout(() => setBccCopied(false), 3000);
        } catch (error) {
            console.error("Failed to copy:", error);
            toast.error("Erro ao copiar");
        }
    };

    // Guardar e sair - NÃO marca onboarding como completo
    const handleSaveAndExit = async () => {
        setSaving(true);
        try {
            toast.success("Progresso guardado. Pode continuar mais tarde.");
            router.push("/dashboard");
        } catch (error) {
            console.error("Error saving:", error);
            toast.error("Erro ao guardar");
        } finally {
            setSaving(false);
        }
    };

    // Concluir onboarding - marca como completo
    const handleComplete = async () => {
        setCompleting(true);
        try {
            const response = await fetch("/api/onboarding", {
                method: "PUT",
            });

            if (!response.ok) {
                toast.error("Erro ao concluir configuração");
                return;
            }

            toast.success("Configuração concluída. Bem-vindo ao Ritmo.");
            router.push("/dashboard?onboarding=complete");
        } catch (error) {
            console.error("Error completing onboarding:", error);
            toast.error("Erro ao concluir configuração");
        } finally {
            setCompleting(false);
        }
    };

    // Verifica se pode avançar no passo SMTP
    const canAdvanceFromSmtp = () => {
        if (smtpChoice === "own" && !hasSmtp) {
            return false;
        }
        return true;
    };

    // Handler para fallback no alert SMTP
    const handleUseRitmoFallback = () => {
        setSmtpChoice("ritmo");
        toast.success("Opção alterada para envio via Ritmo");
    };

    const nextStep = () => {
        if (currentStep === 2 && !canAdvanceFromSmtp()) {
            toast.error("Configure o SMTP ou selecione envio via Ritmo para continuar.");
            return;
        }
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    // Header consistente com "Guardar e sair" no topo direito
    const renderHeader = (icon: React.ReactNode, iconBg: string, title: string, subtitle: string, statusBadge?: React.ReactNode) => {
        return (
            <CardHeader className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/20 px-8 py-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg} shadow-sm`}>
                            {icon}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-lg">{title}</CardTitle>
                                {statusBadge}
                            </div>
                            <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
                                {subtitle}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSaveAndExit}
                        disabled={saving}
                        className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                    >
                        {saving ? (
                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : (
                            <LogOut className="mr-1.5 h-4 w-4" />
                        )}
                        Guardar e sair
                    </Button>
                </div>
            </CardHeader>
        );
    };

    // Footer consistente com navegação
    const renderFooter = (options: {
        showBack?: boolean;
        showNext?: boolean;
        nextLabel?: string;
        nextDisabled?: boolean;
        customActions?: React.ReactNode;
    }) => {
        const { showBack = true, showNext = true, nextLabel = "Continuar", nextDisabled = false, customActions } = options;

        return (
            <CardFooter className="flex items-center justify-between border-t border-[var(--color-border)] bg-[var(--color-muted)]/30 px-8 py-4">
                <div>
                    {showBack && currentStep > 0 && (
                        <Button variant="ghost" onClick={prevStep} className="gap-2">
                            <ChevronLeft className="h-4 w-4" />
                            Voltar
                        </Button>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {customActions}
                    {showNext && (
                        <Button onClick={nextStep} disabled={nextDisabled} className="gap-2">
                            {nextLabel}
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </CardFooter>
        );
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] p-4">
            <div className="w-full max-w-2xl">
                {/* Stepper com títulos */}
                <div className="mb-8">
                    <div className="flex items-center justify-center gap-1">
                        {STEPS.map((step, index) => (
                            <div key={step.id} className="flex items-center">
                                <div className="flex flex-col items-center">
                                    <div
                                        className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300 ${
                                            index < currentStep
                                                ? "bg-green-500 text-white shadow-md shadow-green-500/25"
                                                : index === currentStep
                                                  ? "bg-gradient-to-r from-[var(--color-brand-from)] to-[var(--color-brand-to)] text-white shadow-lg shadow-[var(--color-brand-from)]/30 ring-4 ring-[var(--color-brand-from)]/20"
                                                  : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
                                        }`}
                                    >
                                        {index < currentStep ? (
                                            <Check className="h-5 w-5" />
                                        ) : (
                                            index + 1
                                        )}
                                    </div>
                                    <span className={`mt-2 text-xs font-medium ${
                                        index === currentStep
                                            ? "text-[var(--color-foreground)]"
                                            : "text-[var(--color-muted-foreground)]"
                                    }`}>
                                        {step.title}
                                    </span>
                                </div>
                                {index < STEPS.length - 1 && (
                                    <div
                                        className={`mx-2 mt-[-20px] h-1 w-12 rounded-full transition-colors duration-300 ${
                                            index < currentStep
                                                ? "bg-green-500"
                                                : "bg-[var(--color-muted)]"
                                        }`}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <Card className="overflow-hidden shadow-2xl shadow-black/5 border-[var(--color-border)]">
                    {/* Step 0: Welcome */}
                    {currentStep === 0 && (
                        <>
                            <CardContent className="p-8">
                                <div className="text-center">
                                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--color-primary)] shadow-lg shadow-[var(--color-primary)]/25">
                                        <Sparkles className="h-10 w-10 text-white" />
                                    </div>
                                    <h1 className="mb-2 text-2xl font-bold tracking-tight">
                                        Bem-vindo ao Ritmo, {orgName}.
                                    </h1>
                                    <p className="mb-2 text-[var(--color-muted-foreground)] leading-relaxed max-w-md mx-auto">
                                        Configure a sua conta e comece a automatizar
                                        o follow-up dos seus orçamentos.
                                    </p>
                                    <p className="mb-8 text-sm text-[var(--color-muted-foreground)]">
                                        Em menos de 2 minutos fica pronto a enviar follow-ups.
                                    </p>
                                    <div className="space-y-3">
                                        <Button onClick={nextStep} variant="brand" size="lg" className="w-full gap-2 text-base">
                                            <Rocket className="h-5 w-5" />
                                            Começar configuração
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            onClick={handleSaveAndExit}
                                            disabled={saving}
                                            className="w-full text-[var(--color-muted-foreground)]"
                                        >
                                            {saving ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <ArrowRight className="mr-2 h-4 w-4" />
                                            )}
                                            Ir para o Dashboard
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </>
                    )}

                    {/* Step 1: Templates */}
                    {currentStep === 1 && (
                        <>
                            {renderHeader(
                                <FileText className="h-6 w-6 text-[var(--color-info)]" />,
                                "bg-[var(--color-info-muted)]",
                                "Mensagens de Follow-up",
                                "Personalize o tom das suas comunicações"
                            )}
                            <CardContent className="p-8">
                                {hasTemplates ? (
                                    <Alert className="mb-6 border-green-500/30 bg-green-500/5">
                                        <Check className="h-5 w-5 text-green-500" />
                                        <AlertDescription className="ml-2">
                                            <span className="font-medium text-green-600">
                                                {templates.length} templates prontos a usar
                                            </span>
                                            <span className="block mt-1 text-[var(--color-muted-foreground)]">
                                                Pode personalizar em Definições a qualquer momento.
                                            </span>
                                        </AlertDescription>
                                    </Alert>
                                ) : (
                                    <Alert className="mb-6 border-[var(--color-info)]/30 bg-[var(--color-info)]/5">
                                        <Sparkles className="h-5 w-5 text-[var(--color-info)]" />
                                        <AlertDescription className="ml-2">
                                            <span className="font-medium text-[var(--color-info-foreground)]">
                                                Templates profissionais incluídos
                                            </span>
                                            <span className="block mt-1 text-[var(--color-muted-foreground)]">
                                                Otimizados para maximizar respostas. Personalize quando quiser.
                                            </span>
                                        </AlertDescription>
                                    </Alert>
                                )}

                                <div>
                                    <h3 className="mb-2 text-sm font-semibold text-[var(--color-foreground)]">
                                        Sequência de follow-up automática:
                                    </h3>
                                    <p className="mb-4 text-sm text-[var(--color-muted-foreground)]">
                                        Cada mensagem tem texto otimizado. Pode editar em Definições.
                                    </p>
                                    <div className="space-y-3">
                                        {[
                                            { code: "T2", name: "Lembrete gentil", timing: "D+1", type: "Email", desc: "Verificar se recebeu a proposta" },
                                            { code: "T3", name: "Interesse", timing: "D+3", type: "Email", desc: "Esclarecer dúvidas pendentes" },
                                            { code: "CALL", name: "Chamada", timing: "D+7", type: "Chamada", desc: "Contacto direto para decisão" },
                                            { code: "T5", name: "Última oportunidade", timing: "D+14", type: "Email", desc: "Fechar ou arquivar" },
                                        ].map((t) => (
                                            <div
                                                key={t.code}
                                                className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4 transition-colors hover:bg-[var(--color-muted)]/30"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Badge variant="outline" className="font-mono text-xs min-w-[45px] justify-center">
                                                        {t.timing}
                                                    </Badge>
                                                    <div>
                                                        <span className="font-medium">{t.name}</span>
                                                        <span className="block text-xs text-[var(--color-muted-foreground)]">{t.desc}</span>
                                                    </div>
                                                </div>
                                                <Badge variant={t.type === "Chamada" ? "default" : "secondary"} className="text-xs">
                                                    {t.type}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                            {renderFooter({
                                customActions: (
                                    <Link href="/templates">
                                        <Button variant="outline" className="gap-2">
                                            <Settings className="h-4 w-4" />
                                            Personalizar
                                        </Button>
                                    </Link>
                                ),
                            })}
                        </>
                    )}

                    {/* Step 2: SMTP - Default é Ritmo (recomendado) */}
                    {currentStep === 2 && (
                        <>
                            {renderHeader(
                                <Mail className="h-6 w-6 text-purple-500" />,
                                "bg-purple-500/10",
                                "Envio de emails",
                                "Escolha como enviar os follow-ups"
                            )}
                            <CardContent className="p-8">
                                <div className="space-y-4">
                                    {/* Option 1: Ritmo (Recomendado - DEFAULT) */}
                                    <button
                                        type="button"
                                        onClick={() => setSmtpChoice("ritmo")}
                                        className={`w-full rounded-xl border-2 p-5 text-left transition-all duration-200 ${
                                            smtpChoice === "ritmo"
                                                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-md shadow-[var(--color-primary)]/10"
                                                : "border-[var(--color-border)] hover:border-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]/30"
                                        }`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                                                smtpChoice === "ritmo"
                                                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
                                                    : "border-[var(--color-muted-foreground)]"
                                            }`}>
                                                {smtpChoice === "ritmo" && (
                                                    <Check className="h-4 w-4 text-white" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-base font-semibold">Enviar via Ritmo</span>
                                                    <Badge className="bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/30 text-xs">
                                                        <Zap className="mr-1 h-3 w-3" />
                                                        Recomendado
                                                    </Badge>
                                                </div>
                                                <p className="mt-2 text-sm text-[var(--color-muted-foreground)] leading-relaxed">
                                                    Comece já. Os emails saem do servidor Ritmo com remetente noreply@useritmo.pt.
                                                    Pode ligar o seu próprio domínio mais tarde.
                                                </p>
                                            </div>
                                        </div>
                                    </button>

                                    {/* Option 2: SMTP próprio (Avançado) */}
                                    <button
                                        type="button"
                                        onClick={() => setSmtpChoice("own")}
                                        className={`w-full rounded-xl border-2 p-5 text-left transition-all duration-200 ${
                                            smtpChoice === "own"
                                                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-md shadow-[var(--color-primary)]/10"
                                                : "border-[var(--color-border)] hover:border-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]/30"
                                        }`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                                                smtpChoice === "own"
                                                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
                                                    : "border-[var(--color-muted-foreground)]"
                                            }`}>
                                                {smtpChoice === "own" && (
                                                    <Check className="h-4 w-4 text-white" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-base font-semibold">Usar o meu email</span>
                                                    <Badge variant="outline" className="text-xs">
                                                        Avançado
                                                    </Badge>
                                                    {hasSmtp && (
                                                        <Badge className="bg-green-500/10 text-green-600 border-green-500/30 text-xs">
                                                            <Check className="mr-1 h-3 w-3" />
                                                            Configurado
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="mt-2 text-sm text-[var(--color-muted-foreground)] leading-relaxed">
                                                    Os emails saem do seu domínio (ex: comercial@suaempresa.pt).
                                                    Maior reconhecimento e taxa de abertura.
                                                </p>

                                                {/* Alert info com 2 ações quando SMTP não configurado */}
                                                {smtpChoice === "own" && !hasSmtp && (
                                                    <div className="mt-4">
                                                        <Alert className="border-[var(--color-info)]/30 bg-[var(--color-info)]/5">
                                                            <Info className="h-4 w-4 text-[var(--color-info)]" />
                                                            <AlertDescription className="ml-2 text-sm">
                                                                <span className="font-medium text-[var(--color-info-foreground)]">Configuração SMTP necessária</span>
                                                                <span className="block mt-1 text-[var(--color-muted-foreground)]">
                                                                    Configure as credenciais do seu servidor de email para usar esta opção.
                                                                </span>
                                                                <div className="mt-3 flex items-center gap-2">
                                                                    <Link href="/settings/email">
                                                                        <Button size="sm" className="gap-2">
                                                                            <Settings className="h-4 w-4" />
                                                                            Configurar SMTP
                                                                        </Button>
                                                                    </Link>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleUseRitmoFallback();
                                                                        }}
                                                                    >
                                                                        Usar Ritmo por agora
                                                                    </Button>
                                                                </div>
                                                            </AlertDescription>
                                                        </Alert>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            </CardContent>
                            {renderFooter({
                                nextDisabled: smtpChoice === "own" && !hasSmtp,
                            })}
                        </>
                    )}

                    {/* Step 3: BCC */}
                    {currentStep === 3 && (
                        <>
                            {renderHeader(
                                <Inbox className="h-6 w-6 text-orange-500" />,
                                "bg-orange-500/10",
                                "Captura de propostas",
                                "Mantenha o contexto de cada orçamento",
                                <StatusBadge status={getBccStatus()} />
                            )}
                            <CardContent className="p-8">
                                <div className="space-y-6">
                                    <p className="text-[var(--color-muted-foreground)] leading-relaxed">
                                        Ao enviar uma proposta, adicione este endereço em BCC.
                                        O Ritmo captura automaticamente o PDF ou link para referência rápida.
                                    </p>

                                    <div className="rounded-xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/30 p-4">
                                        <label className="mb-2 block text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wide">
                                            Endereço BCC exclusivo da sua conta
                                        </label>
                                        <div className="flex items-center gap-3">
                                            <code className="flex-1 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] px-4 py-3 text-sm font-mono select-all">
                                                {bccEmail}
                                            </code>
                                            <Button
                                                variant={bccCopied ? "default" : "outline"}
                                                onClick={handleCopyBcc}
                                                className={`gap-2 transition-all ${bccCopied ? "bg-green-500 hover:bg-green-600" : ""}`}
                                            >
                                                {bccCopied ? (
                                                    <>
                                                        <Check className="h-4 w-4" />
                                                        Copiado
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="h-4 w-4" />
                                                        Copiar
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                        <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
                                            O cliente não vê o BCC. É uma cópia invisível apenas para o Ritmo.
                                        </p>
                                    </div>

                                    {/* FAQ Inline */}
                                    <div className="space-y-3">
                                        <details className="group rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]">
                                            <summary className="flex cursor-pointer items-center justify-between p-4 text-sm font-medium">
                                                O que é BCC?
                                                <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                                            </summary>
                                            <div className="border-t border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
                                                BCC (Blind Carbon Copy) é uma cópia oculta do email. O destinatário
                                                não vê os endereços em BCC, por isso é ideal para capturar as suas
                                                propostas sem que o cliente saiba.
                                            </div>
                                        </details>
                                        <details className="group rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]">
                                            <summary className="flex cursor-pointer items-center justify-between p-4 text-sm font-medium">
                                                O cliente vê o endereço BCC?
                                                <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                                            </summary>
                                            <div className="border-t border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
                                                Não. O BCC é completamente invisível para o destinatário.
                                                Apenas o Ritmo recebe a cópia para capturar a proposta.
                                            </div>
                                        </details>
                                        <details className="group rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]">
                                            <summary className="flex cursor-pointer items-center justify-between p-4 text-sm font-medium">
                                                Como adiciono automaticamente?
                                                <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                                            </summary>
                                            <div className="border-t border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
                                                Configure uma regra no seu cliente de email (Outlook, Gmail, etc.)
                                                para adicionar este BCC automaticamente às mensagens com
                                                &quot;proposta&quot; ou &quot;orçamento&quot; no assunto.
                                            </div>
                                        </details>
                                    </div>

                                    {/* Verificar captura */}
                                    <Dialog open={verifyModalOpen} onOpenChange={(open) => {
                                        setVerifyModalOpen(open);
                                        if (!open) resetVerifyModal();
                                    }}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" className="w-full gap-2">
                                                <Search className="h-4 w-4" />
                                                Verificar captura
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-md">
                                            <DialogHeader>
                                                <DialogTitle>Verificar captura BCC</DialogTitle>
                                                <DialogDescription>
                                                    Verifique se o Ritmo já recebeu algum email enviado em BCC.
                                                </DialogDescription>
                                            </DialogHeader>

                                            <div className="py-4">
                                                {/* Idle State */}
                                                {verifyStatus === "idle" && (
                                                    <div className="text-center">
                                                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-muted)]">
                                                            <Search className="h-8 w-8 text-[var(--color-muted-foreground)]" />
                                                        </div>
                                                        <p className="mb-6 text-sm text-[var(--color-muted-foreground)]">
                                                            Clique para verificar se já recebemos algum email BCC da sua conta.
                                                        </p>
                                                        <Button onClick={handleVerifyCapture} className="gap-2">
                                                            <Search className="h-4 w-4" />
                                                            Verificar agora
                                                        </Button>
                                                    </div>
                                                )}

                                                {/* Loading State */}
                                                {verifyStatus === "loading" && (
                                                    <div className="text-center py-8">
                                                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--color-primary)]" />
                                                        <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">
                                                            A verificar...
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Success State */}
                                                {verifyStatus === "success" && verifyData && (
                                                    <div className="text-center">
                                                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                                                            <CheckCircle className="h-8 w-8 text-green-500" />
                                                        </div>
                                                        <h3 className="mb-2 font-semibold text-green-600">
                                                            Captura encontrada
                                                        </h3>
                                                        <div className="mb-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/30 p-4 text-left">
                                                            <div className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
                                                                <Clock className="h-4 w-4" />
                                                                <span>
                                                                    {verifyData.receivedAt
                                                                        ? new Date(verifyData.receivedAt).toLocaleString("pt-PT", {
                                                                            dateStyle: "medium",
                                                                            timeStyle: "short",
                                                                        })
                                                                        : "Data desconhecida"}
                                                                </span>
                                                            </div>
                                                            {verifyData.subject && (
                                                                <p className="mt-2 text-sm">
                                                                    <span className="text-[var(--color-muted-foreground)]">Assunto: </span>
                                                                    {verifyData.subject}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-[var(--color-muted-foreground)]">
                                                            A captura BCC está a funcionar corretamente.
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Not Found State */}
                                                {verifyStatus === "not_found" && (
                                                    <div className="text-center">
                                                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/10">
                                                            <AlertTriangle className="h-8 w-8 text-orange-500" />
                                                        </div>
                                                        <h3 className="mb-2 font-semibold">
                                                            Nenhuma captura encontrada
                                                        </h3>
                                                        <p className="mb-4 text-sm text-[var(--color-muted-foreground)]">
                                                            Ainda não recebemos nenhum email em BCC. Envie um email de teste
                                                            para o endereço BCC e volte a verificar.
                                                        </p>
                                                        <Button variant="outline" onClick={handleVerifyCapture} className="gap-2">
                                                            <Search className="h-4 w-4" />
                                                            Verificar novamente
                                                        </Button>
                                                    </div>
                                                )}

                                                {/* Trial Limit State */}
                                                {verifyStatus === "trial_limit" && (
                                                    <div className="text-center">
                                                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-info-muted)]">
                                                            <Info className="h-8 w-8 text-[var(--color-info)]" />
                                                        </div>
                                                        <h3 className="mb-2 font-semibold text-[var(--color-info-foreground)]">
                                                            Limite de trial atingido
                                                        </h3>
                                                        <p className="mb-4 text-sm text-[var(--color-muted-foreground)]">
                                                            Durante o período de trial, pode capturar 1 proposta via BCC.
                                                            Para capturas ilimitadas, faça upgrade para um plano pago.
                                                        </p>
                                                        <Link href="/settings/billing">
                                                            <Button className="gap-2">
                                                                Ver planos
                                                                <ArrowRight className="h-4 w-4" />
                                                            </Button>
                                                        </Link>
                                                    </div>
                                                )}

                                                {/* Error State */}
                                                {verifyStatus === "error" && (
                                                    <div className="text-center">
                                                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
                                                            <XCircle className="h-8 w-8 text-red-500" />
                                                        </div>
                                                        <h3 className="mb-2 font-semibold text-red-600">
                                                            Erro ao verificar
                                                        </h3>
                                                        <p className="mb-4 text-sm text-[var(--color-muted-foreground)]">
                                                            Ocorreu um erro ao verificar a captura. Por favor, tente novamente.
                                                        </p>
                                                        <Button variant="outline" onClick={handleVerifyCapture} className="gap-2">
                                                            <Search className="h-4 w-4" />
                                                            Tentar novamente
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </CardContent>
                            {renderFooter({})}
                        </>
                    )}

                    {/* Step 4: Complete */}
                    {currentStep === 4 && (
                        <>
                            <CardContent className="p-8">
                                <div className="text-center">
                                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-green-500 shadow-lg shadow-green-500/25">
                                        <Check className="h-10 w-10 text-white" />
                                    </div>
                                    <h1 className="mb-2 text-2xl font-bold tracking-tight">
                                        Configuração concluída.
                                    </h1>
                                    <p className="mb-4 text-[var(--color-muted-foreground)] leading-relaxed max-w-md mx-auto">
                                        A sua conta está pronta. Crie o primeiro orçamento para
                                        ativar o follow-up automático.
                                    </p>
                                    <p className="mb-8 text-sm text-[var(--color-muted-foreground)] max-w-md mx-auto">
                                        O Ritmo só envia follow-ups após criar um orçamento — nada é enviado até lá.
                                    </p>

                                    {/* Resumo de configuração */}
                                    <div className="mb-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/20 p-1 text-left">
                                        <div className="divide-y divide-[var(--color-border)]">
                                            <div className="flex items-center justify-between p-4">
                                                <div className="flex items-center gap-3">
                                                    <FileText className="h-5 w-5 text-[var(--color-muted-foreground)]" />
                                                    <span className="text-sm font-medium">Templates</span>
                                                </div>
                                                <Badge variant={hasTemplates ? "default" : "secondary"} className={hasTemplates ? "bg-green-500" : ""}>
                                                    {hasTemplates ? "Personalizados" : "Predefinidos"}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center justify-between p-4">
                                                <div className="flex items-center gap-3">
                                                    <Mail className="h-5 w-5 text-[var(--color-muted-foreground)]" />
                                                    <span className="text-sm font-medium">Envio de emails</span>
                                                </div>
                                                <Badge variant="default" className={hasSmtp ? "bg-green-500" : ""}>
                                                    {hasSmtp ? "SMTP próprio" : "Via Ritmo"}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center justify-between p-4">
                                                <div className="flex items-center gap-3">
                                                    <Inbox className="h-5 w-5 text-[var(--color-muted-foreground)]" />
                                                    <span className="text-sm font-medium">Captura BCC</span>
                                                </div>
                                                <StatusBadge status={getBccStatus()} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Ações finais */}
                                    <div className="space-y-3">
                                        <Link href="/quotes/new" className="block">
                                            <Button variant="brand" size="lg" className="w-full gap-2 text-base">
                                                <Rocket className="h-5 w-5" />
                                                Criar orçamento
                                            </Button>
                                        </Link>
                                        <Button
                                            variant="outline"
                                            onClick={handleComplete}
                                            disabled={completing}
                                            className="w-full gap-2"
                                        >
                                            {completing ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <ArrowRight className="h-4 w-4" />
                                            )}
                                            Explorar dashboard
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </>
                    )}
                </Card>
            </div>
        </div>
    );
}
