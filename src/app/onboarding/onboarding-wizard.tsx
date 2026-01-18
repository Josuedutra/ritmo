"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle, toast } from "@/components/ui";
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
}

const STEPS = [
    { id: "welcome", title: "Bem-vindo" },
    { id: "templates", title: "Templates" },
    { id: "smtp", title: "Email" },
    { id: "bcc", title: "BCC" },
    { id: "complete", title: "Pronto" },
];

export function OnboardingWizard({
    orgName,
    bccEmail,
    hasSmtp,
    hasBcc,
    hasTemplates,
    hasQuotes,
    templates,
}: OnboardingWizardProps) {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [bccCopied, setBccCopied] = useState(false);
    const [completing, setCompleting] = useState(false);
    const [smtpChoice, setSmtpChoice] = useState<"own" | "ritmo">(hasSmtp ? "own" : "ritmo");

    const handleCopyBcc = async () => {
        try {
            await navigator.clipboard.writeText(bccEmail);
            setBccCopied(true);
            toast.success("Email BCC copiado!");
            setTimeout(() => setBccCopied(false), 3000);
        } catch (error) {
            console.error("Failed to copy:", error);
            toast.error("Erro ao copiar");
        }
    };

    const handleSkip = async () => {
        setCompleting(true);
        try {
            const response = await fetch("/api/onboarding", {
                method: "PUT",
            });

            if (!response.ok) {
                toast.error("Erro ao completar onboarding");
                return;
            }

            toast.success("Configuração concluída. Vamos ao primeiro orçamento.");
            router.push("/dashboard?onboarding=complete");
        } catch (error) {
            console.error("Error completing onboarding:", error);
            toast.error("Erro ao completar onboarding");
        } finally {
            setCompleting(false);
        }
    };

    const handleComplete = async () => {
        setCompleting(true);
        try {
            const response = await fetch("/api/onboarding", {
                method: "PUT",
            });

            if (!response.ok) {
                toast.error("Erro ao completar onboarding");
                return;
            }

            // Requirement E: Toast message after onboarding
            toast.success("Configuração concluída. Vamos ao primeiro orçamento.");
            router.push("/dashboard?onboarding=complete");
        } catch (error) {
            console.error("Error completing onboarding:", error);
            toast.error("Erro ao completar onboarding");
        } finally {
            setCompleting(false);
        }
    };

    const nextStep = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] p-4">
            <div className="w-full max-w-2xl">
                {/* Progress indicator */}
                <div className="mb-8 flex items-center justify-center gap-2">
                    {STEPS.map((step, index) => (
                        <div key={step.id} className="flex items-center">
                            <div
                                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                                    index < currentStep
                                        ? "bg-green-500 text-white"
                                        : index === currentStep
                                          ? "bg-[var(--color-primary)] text-white"
                                          : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
                                }`}
                            >
                                {index < currentStep ? (
                                    <Check className="h-4 w-4" />
                                ) : (
                                    index + 1
                                )}
                            </div>
                            {index < STEPS.length - 1 && (
                                <div
                                    className={`mx-1 h-0.5 w-8 ${
                                        index < currentStep
                                            ? "bg-green-500"
                                            : "bg-[var(--color-muted)]"
                                    }`}
                                />
                            )}
                        </div>
                    ))}
                </div>

                <Card className="shadow-xl">
                    <CardContent className="p-8">
                        {/* Step 0: Welcome */}
                        {currentStep === 0 && (
                            <div className="text-center">
                                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary)]/10">
                                    <Sparkles className="h-8 w-8 text-[var(--color-primary)]" />
                                </div>
                                <h1 className="mb-2 text-2xl font-bold">
                                    Bem-vindo ao Ritmo, {orgName}!
                                </h1>
                                <p className="mb-8 text-[var(--color-muted-foreground)]">
                                    Vamos configurar a sua conta em poucos passos para começar a
                                    fazer follow-up automático dos seus orçamentos.
                                </p>
                                <div className="space-y-4">
                                    <Button onClick={nextStep} className="w-full gap-2">
                                        Começar configuração
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={handleSkip}
                                        disabled={completing}
                                        className="w-full"
                                    >
                                        {completing ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : null}
                                        Saltar e configurar depois
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step 1: Templates */}
                        {currentStep === 1 && (
                            <div>
                                <div className="mb-6 flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                                        <FileText className="h-5 w-5 text-blue-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold">Templates de Email</h2>
                                        <p className="text-sm text-[var(--color-muted-foreground)]">
                                            Personalize as mensagens de follow-up
                                        </p>
                                    </div>
                                </div>

                                {hasTemplates ? (
                                    <div className="mb-6 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
                                        <div className="flex items-center gap-2 text-green-600">
                                            <Check className="h-5 w-5" />
                                            <span className="font-medium">
                                                {templates.length} templates configurados
                                            </span>
                                        </div>
                                        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                                            Pode editar os templates a qualquer momento em Definições.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="mb-6 rounded-lg border border-orange-500/30 bg-orange-500/10 p-4">
                                        <p className="text-sm text-orange-600">
                                            Ainda não tem templates configurados. Os templates
                                            predefinidos serão usados automaticamente.
                                        </p>
                                    </div>
                                )}

                                <div className="mb-6">
                                    <h3 className="mb-3 text-sm font-medium">
                                        Templates disponíveis:
                                    </h3>
                                    <div className="space-y-2">
                                        {[
                                            { code: "T2", name: "Follow-up D+1", type: "Email" },
                                            { code: "T3", name: "Follow-up D+3", type: "Email" },
                                            { code: "CALL_SCRIPT", name: "Script Chamada D+7", type: "Chamada" },
                                            { code: "T5", name: "Follow-up D+14", type: "Email" },
                                        ].map((t) => (
                                            <div
                                                key={t.code}
                                                className="flex items-center justify-between rounded-md border border-[var(--color-border)] p-3"
                                            >
                                                <span className="text-sm">{t.code} - {t.name}</span>
                                                <span className="text-xs text-[var(--color-muted-foreground)]">
                                                    {t.type}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <Button variant="outline" onClick={prevStep}>
                                        <ChevronLeft className="mr-2 h-4 w-4" />
                                        Voltar
                                    </Button>
                                    <Link href="/templates" className="flex-1">
                                        <Button variant="outline" className="w-full gap-2">
                                            <Settings className="h-4 w-4" />
                                            Editar templates
                                        </Button>
                                    </Link>
                                    <Button onClick={nextStep} className="flex-1 gap-2">
                                        Continuar
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step 2: SMTP */}
                        {currentStep === 2 && (
                            <div>
                                <div className="mb-6 flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                                        <Mail className="h-5 w-5 text-purple-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold">Configuração de Email</h2>
                                        <p className="text-sm text-[var(--color-muted-foreground)]">
                                            Como pretende enviar os follow-ups?
                                        </p>
                                    </div>
                                </div>

                                <div className="mb-6 space-y-3">
                                    {/* Option 1: Own SMTP */}
                                    <button
                                        type="button"
                                        onClick={() => setSmtpChoice("own")}
                                        className={`w-full rounded-lg border-2 p-4 text-left transition-colors ${
                                            smtpChoice === "own"
                                                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                                                : "border-[var(--color-border)] hover:border-[var(--color-muted-foreground)]"
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                                                smtpChoice === "own"
                                                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
                                                    : "border-[var(--color-muted-foreground)]"
                                            }`}>
                                                {smtpChoice === "own" && (
                                                    <Check className="h-3 w-3 text-white" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">SMTP próprio</span>
                                                    {hasSmtp && (
                                                        <span className="rounded bg-green-500/10 px-1.5 py-0.5 text-xs font-medium text-green-600">
                                                            Configurado
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                                                    Emails enviados do seu domínio (ex: voce@suaempresa.pt)
                                                </p>
                                                {smtpChoice === "own" && !hasSmtp && (
                                                    <Link href="/settings" className="mt-3 inline-block">
                                                        <Button variant="outline" size="sm" className="gap-2">
                                                            <Settings className="h-4 w-4" />
                                                            Configurar SMTP
                                                        </Button>
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </button>

                                    {/* Option 2: Ritmo fallback */}
                                    <button
                                        type="button"
                                        onClick={() => setSmtpChoice("ritmo")}
                                        className={`w-full rounded-lg border-2 p-4 text-left transition-colors ${
                                            smtpChoice === "ritmo"
                                                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                                                : "border-[var(--color-border)] hover:border-[var(--color-muted-foreground)]"
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                                                smtpChoice === "ritmo"
                                                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
                                                    : "border-[var(--color-muted-foreground)]"
                                            }`}>
                                                {smtpChoice === "ritmo" && (
                                                    <Check className="h-3 w-3 text-white" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <span className="font-medium">Serviço Ritmo</span>
                                                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                                                    Emails enviados pelo nosso servidor (pode configurar SMTP mais tarde)
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                </div>

                                <div className="flex gap-3">
                                    <Button variant="outline" onClick={prevStep}>
                                        <ChevronLeft className="mr-2 h-4 w-4" />
                                        Voltar
                                    </Button>
                                    <Button onClick={nextStep} className="flex-1 gap-2">
                                        Continuar
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: BCC */}
                        {currentStep === 3 && (
                            <div>
                                <div className="mb-6 flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                                        <Copy className="h-5 w-5 text-orange-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold">Email BCC</h2>
                                        <p className="text-sm text-[var(--color-muted-foreground)]">
                                            Capture propostas automaticamente
                                        </p>
                                    </div>
                                </div>

                                <div className="mb-6 space-y-4">
                                    <p className="text-sm text-[var(--color-muted-foreground)]">
                                        O Ritmo captura automaticamente a proposta (PDF/link) enviada
                                        por email e associa ao orçamento, para acelerar chamadas D+7.
                                    </p>

                                    <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/50 p-3">
                                        <code className="flex-1 text-sm font-mono">{bccEmail}</code>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleCopyBcc}
                                            className="gap-1.5"
                                        >
                                            {bccCopied ? (
                                                <>
                                                    <Check className="h-4 w-4 text-green-500" />
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

                                    <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
                                        <h3 className="mb-2 text-sm font-medium text-blue-600">
                                            Como usar:
                                        </h3>
                                        <ol className="space-y-1 text-sm text-[var(--color-muted-foreground)]">
                                            <li>1. Ao enviar um orçamento, adicione o email acima em BCC</li>
                                            <li>2. O Ritmo extrai o PDF/link da proposta do email</li>
                                            <li>3. Na chamada D+7, a proposta fica disponível com um clique</li>
                                        </ol>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <Button variant="outline" onClick={prevStep}>
                                        <ChevronLeft className="mr-2 h-4 w-4" />
                                        Voltar
                                    </Button>
                                    <Button onClick={nextStep} className="flex-1 gap-2">
                                        Continuar
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Complete */}
                        {currentStep === 4 && (
                            <div className="text-center">
                                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                                    <Check className="h-8 w-8 text-green-500" />
                                </div>
                                <h1 className="mb-2 text-2xl font-bold">Está tudo pronto!</h1>
                                <p className="mb-8 text-[var(--color-muted-foreground)]">
                                    A sua conta está configurada. Crie o seu primeiro orçamento
                                    para começar a fazer follow-up automático.
                                </p>

                                <div className="mb-6 space-y-2">
                                    <div className="flex items-center justify-between rounded-md border border-[var(--color-border)] p-3">
                                        <span className="text-sm">Templates de email</span>
                                        <span className={hasTemplates ? "text-green-500" : "text-[var(--color-muted-foreground)]"}>
                                            {hasTemplates ? "Configurado" : "Usar predefinidos"}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between rounded-md border border-[var(--color-border)] p-3">
                                        <span className="text-sm">Envio de email</span>
                                        <span className={hasSmtp ? "text-green-500" : "text-[var(--color-muted-foreground)]"}>
                                            {hasSmtp ? "SMTP próprio" : "Via Ritmo"}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between rounded-md border border-[var(--color-border)] p-3">
                                        <span className="text-sm">Captura de propostas</span>
                                        <span className="text-green-500">BCC configurado</span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Link href="/quotes/new" className="block">
                                        <Button className="w-full gap-2">
                                            Criar primeiro orçamento
                                            <ArrowRight className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                    <Button
                                        variant="outline"
                                        onClick={handleComplete}
                                        disabled={completing}
                                        className="w-full"
                                    >
                                        {completing ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : null}
                                        Ir para o Dashboard
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Skip link */}
                {currentStep > 0 && currentStep < STEPS.length - 1 && (
                    <div className="mt-4 text-center">
                        <button
                            onClick={handleSkip}
                            disabled={completing}
                            className="text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] disabled:opacity-50"
                        >
                            Saltar configuração
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
