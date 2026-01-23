"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, Loader2, ArrowRight, CreditCard, Calendar, AlertTriangle } from "lucide-react";
import { Button, Badge } from "@/components/ui";
import { SystemPageLayout } from "@/components/layout/system-page-layout";

interface SubscriptionData {
    planName: string;
    priceFormatted: string;
    nextBillingDate: string | null;
    status: string;
}

function BillingSuccessContent() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("session_id");

    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [showSlowLoadingHint, setShowSlowLoadingHint] = useState(false);

    useEffect(() => {
        // Only start timer if we have a valid session_id (Stripe redirected us here)
        // This ensures we only show "payment processed" when checkout actually completed
        if (!sessionId) return;

        // Show fallback CTA after 30 seconds
        const slowLoadingTimer = setTimeout(() => {
            if (status === "loading") {
                setShowSlowLoadingHint(true);
            }
        }, 30000);

        return () => clearTimeout(slowLoadingTimer);
    }, [status, sessionId]);

    useEffect(() => {
        async function verifySession() {
            if (!sessionId) {
                setStatus("error");
                setErrorMessage("Sessão de checkout não encontrada.");
                return;
            }

            try {
                const response = await fetch(`/api/billing/verify?session_id=${sessionId}`);
                const data = await response.json();

                if (!response.ok || !data.success) {
                    setStatus("error");
                    setErrorMessage(data.message || "Erro ao verificar a subscrição.");
                    return;
                }

                setSubscription({
                    planName: data.planName || "Plano ativo",
                    priceFormatted: data.priceFormatted || "—",
                    nextBillingDate: data.nextBillingDate || null,
                    status: data.status || "active",
                });
                setStatus("success");
            } catch (error) {
                console.error("Error verifying session:", error);
                setStatus("error");
                setErrorMessage("Erro ao verificar a subscrição. Por favor, verifique a sua conta.");
            }
        }

        verifySession();
    }, [sessionId]);

    // Loading state
    if (status === "loading") {
        return (
            <SystemPageLayout
                icon={<Loader2 className="h-10 w-10 text-white animate-spin" />}
                iconBg="bg-[var(--color-info)]"
                title="A confirmar subscrição..."
                subtitle="Por favor, aguarde enquanto verificamos o seu pagamento."
            >
                <div className="py-4">
                    <div className="animate-pulse space-y-3">
                        <div className="h-4 bg-[var(--color-muted)] rounded w-3/4 mx-auto" />
                        <div className="h-4 bg-[var(--color-muted)] rounded w-1/2 mx-auto" />
                    </div>
                </div>

                {/* Fallback hint after 30 seconds */}
                {showSlowLoadingHint && (
                    <div className="mt-6 pt-6 border-t border-[var(--color-border)]">
                        <p className="text-sm text-[var(--color-muted-foreground)] mb-4">
                            A confirmação está a demorar mais do que o esperado.
                            O seu pagamento foi processado com sucesso.
                        </p>
                        <div className="space-y-3">
                            <Link href="/settings/billing" className="block">
                                <Button variant="outline" className="w-full gap-2">
                                    <CreditCard className="h-4 w-4" />
                                    Ver faturação
                                </Button>
                            </Link>
                            <Link href="/dashboard" className="block">
                                <Button variant="ghost" className="w-full gap-2">
                                    <ArrowRight className="h-4 w-4" />
                                    Ir para o Dashboard
                                </Button>
                            </Link>
                        </div>
                    </div>
                )}
            </SystemPageLayout>
        );
    }

    // Error state
    if (status === "error") {
        return (
            <SystemPageLayout
                icon={<AlertTriangle className="h-10 w-10 text-white" />}
                iconBg="bg-orange-500"
                title="Não foi possível confirmar"
                subtitle={errorMessage || "Ocorreu um erro ao verificar a sua subscrição."}
            >
                <div className="space-y-3">
                    <Link href="/settings/billing" className="block">
                        <Button variant="brand" size="lg" className="w-full gap-2 text-base">
                            <CreditCard className="h-5 w-5" />
                            Ver faturação
                        </Button>
                    </Link>
                    <Link href="/dashboard" className="block">
                        <Button variant="outline" className="w-full gap-2">
                            <ArrowRight className="h-4 w-4" />
                            Ir para o Dashboard
                        </Button>
                    </Link>
                </div>
            </SystemPageLayout>
        );
    }

    // Success state
    return (
        <SystemPageLayout
            icon={<Check className="h-10 w-10 text-white" />}
            iconBg="bg-green-500"
            title="Plano ativado"
            subtitle="A sua subscrição está ativa. Pode continuar a usar o Ritmo."
        >
            {/* Subscription summary */}
            {subscription && (
                <div className="mb-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/20 p-1 text-left">
                    <div className="divide-y divide-[var(--color-border)]">
                        <div className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-3">
                                <CreditCard className="h-5 w-5 text-[var(--color-muted-foreground)]" />
                                <span className="text-sm font-medium">Plano</span>
                            </div>
                            <Badge className="bg-green-500">{subscription.planName}</Badge>
                        </div>
                        <div className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-[var(--color-muted-foreground)]">Valor mensal</span>
                            </div>
                            <span className="text-sm font-semibold">{subscription.priceFormatted}</span>
                        </div>
                        {subscription.nextBillingDate && (
                            <div className="flex items-center justify-between p-4">
                                <div className="flex items-center gap-3">
                                    <Calendar className="h-5 w-5 text-[var(--color-muted-foreground)]" />
                                    <span className="text-sm text-[var(--color-muted-foreground)]">Próxima renovação</span>
                                </div>
                                <span className="text-sm">{subscription.nextBillingDate}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="space-y-3">
                <Link href="/dashboard" className="block">
                    <Button variant="brand" size="lg" className="w-full gap-2 text-base">
                        <ArrowRight className="h-5 w-5" />
                        Ir para o Dashboard
                    </Button>
                </Link>
                <Link href="/settings/billing" className="block">
                    <Button variant="outline" className="w-full gap-2">
                        <CreditCard className="h-4 w-4" />
                        Ver faturação
                    </Button>
                </Link>
            </div>
        </SystemPageLayout>
    );
}

function BillingSuccessFallback() {
    return (
        <SystemPageLayout
            icon={<Loader2 className="h-10 w-10 text-white animate-spin" />}
            iconBg="bg-[var(--color-info)]"
            title="A carregar..."
            subtitle="Por favor, aguarde."
        >
            <div className="py-4">
                <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-[var(--color-muted)] rounded w-3/4 mx-auto" />
                    <div className="h-4 bg-[var(--color-muted)] rounded w-1/2 mx-auto" />
                </div>
            </div>
        </SystemPageLayout>
    );
}

export default function BillingSuccessPage() {
    return (
        <Suspense fallback={<BillingSuccessFallback />}>
            <BillingSuccessContent />
        </Suspense>
    );
}
