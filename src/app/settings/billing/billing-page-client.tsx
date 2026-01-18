"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    Button,
    Badge,
    toast,
} from "@/components/ui";
import {
    CreditCard,
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    ExternalLink,
    Loader2,
    Check,
    X,
    Clock,
} from "lucide-react";

interface PlanFeature {
    text: string;
    enabled: boolean;
}

interface Plan {
    id: string;
    name: string;
    quotesLimit: number;
    priceMonthly: number;
    hasStripePrice: boolean;
    features: PlanFeature[];
}

interface BillingData {
    organization: {
        id: string;
        trialEndsAt: string | null;
    };
    subscription: {
        planId: string;
        planName: string;
        status: string;
        quotesLimit: number;
        currentPeriodEnd: string | null;
        cancelAtPeriodEnd: boolean;
        hasStripeCustomer: boolean;
        hasStripeSubscription: boolean;
    } | null;
    entitlements: {
        tier: "trial" | "free" | "paid";
        planName: string;
        quotesUsed: number;
        effectivePlanLimit: number;
        trialDaysRemaining: number | null;
        autoEmailEnabled: boolean;
        bccInboundEnabled: boolean;
        subscriptionStatus: string | null;
    };
    plans: Plan[];
}

interface BillingPageClientProps {
    data: BillingData;
}

export function BillingPageClient({ data }: BillingPageClientProps) {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState<string | null>(null);

    const success = searchParams.get("success") === "true";
    const canceled = searchParams.get("canceled") === "true";

    const { subscription, entitlements, plans } = data;

    // Usage calculation
    const usagePercentage =
        entitlements.effectivePlanLimit > 0
            ? Math.min(
                  (entitlements.quotesUsed / entitlements.effectivePlanLimit) * 100,
                  100
              )
            : 0;

    // Status helpers
    const isPastDue = entitlements.subscriptionStatus === "past_due";
    const isCancelled = entitlements.subscriptionStatus === "cancelled";
    const isCancelAtPeriodEnd = subscription?.cancelAtPeriodEnd ?? false;

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "-";
        return new Date(dateStr).toLocaleDateString("pt-PT", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    const formatPrice = (cents: number) => {
        if (cents === 0) return "Grátis";
        return `€${(cents / 100).toFixed(0)}/mês`;
    };

    const handlePortal = async () => {
        setLoading("portal");
        try {
            const response = await fetch("/api/billing/portal", {
                method: "POST",
            });
            const result = await response.json();

            if (response.ok && result.url) {
                window.location.href = result.url;
            } else if (result.action === "choose_plan") {
                // No Stripe customer - scroll to plans section
                toast({ title: "Escolha um plano", description: result.message || "Selecione um plano para começar." });
                document.getElementById("plans-section")?.scrollIntoView({ behavior: "smooth" });
            } else {
                toast.error("Erro", result.error || "Erro ao abrir portal");
            }
        } catch {
            toast.error("Erro", "Erro ao abrir portal");
        } finally {
            setLoading(null);
        }
    };

    const handleCheckout = async (planId: string) => {
        setLoading(planId);
        try {
            const response = await fetch("/api/billing/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planKey: planId }),
            });
            const result = await response.json();

            if (response.ok && result.url) {
                window.location.href = result.url;
            } else {
                toast.error("Erro", result.error || "Erro ao criar checkout");
            }
        } catch {
            toast.error("Erro", "Erro ao criar checkout");
        } finally {
            setLoading(null);
        }
    };

    // Get "Inclui" text for plan card
    const getIncludesText = () => {
        if (entitlements.tier === "trial") {
            return `Inclui ${entitlements.effectivePlanLimit} envios no trial`;
        }
        if (entitlements.tier === "free") {
            return `Inclui ${entitlements.effectivePlanLimit} envios/mês`;
        }
        return `${entitlements.effectivePlanLimit} envios/mês`;
    };

    // Get helper text for usage section
    const getUsageHelper = () => {
        if (entitlements.tier === "trial" && entitlements.trialDaysRemaining) {
            return ` · faltam ${entitlements.trialDaysRemaining} dias`;
        }
        return "";
    };

    // Get status display
    const getStatusDisplay = () => {
        if (isPastDue) return { text: "Em atraso", color: "text-red-600" };
        if (isCancelled) return { text: "Cancelado", color: "text-gray-500" };
        if (subscription?.cancelAtPeriodEnd)
            return { text: "Termina no fim do período", color: "text-yellow-600" };
        return { text: "Ativo", color: "text-green-600" };
    };

    // Get CTA for usage card
    const getUsageCTA = () => {
        if (isPastDue) {
            return (
                <Button
                    onClick={handlePortal}
                    disabled={loading === "portal"}
                    variant="destructive"
                    className="w-full"
                >
                    {loading === "portal" && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Atualizar pagamento
                </Button>
            );
        }
        if (isCancelled) {
            return (
                <Button
                    onClick={handlePortal}
                    disabled={loading === "portal"}
                    variant="outline"
                    className="w-full"
                >
                    {loading === "portal" && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Reativar plano
                </Button>
            );
        }
        if (entitlements.tier === "trial" || entitlements.tier === "free") {
            return (
                <Button
                    onClick={() => {
                        document
                            .getElementById("plans-section")
                            ?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="w-full"
                >
                    Atualizar plano
                </Button>
            );
        }
        return null;
    };

    const status = getStatusDisplay();

    return (
        <div className="space-y-6">
            {/* Success/Cancel messages */}
            {success && (
                <Card className="border-green-500/50 bg-green-500/10">
                    <CardContent className="flex items-center gap-3 py-4">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <p className="text-sm text-green-700 dark:text-green-300">
                            Pagamento concluído com sucesso! O seu plano foi atualizado.
                        </p>
                    </CardContent>
                </Card>
            )}

            {canceled && (
                <Card className="border-yellow-500/50 bg-yellow-500/10">
                    <CardContent className="flex items-center gap-3 py-4">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                            O processo de checkout foi cancelado. Pode tentar novamente
                            quando quiser.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Past due banner */}
            {isPastDue && (
                <Card className="border-red-500/50 bg-red-500/10">
                    <CardContent className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            <div>
                                <p className="font-medium text-red-700 dark:text-red-300">
                                    Pagamento em atraso
                                </p>
                                <p className="text-sm text-red-600 dark:text-red-400">
                                    Atualize o método de pagamento para continuar a enviar.
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={handlePortal}
                            disabled={loading === "portal"}
                            variant="destructive"
                        >
                            {loading === "portal" && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Atualizar pagamento
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Cancelled banner */}
            {isCancelled && (
                <Card className="border-red-500/50 bg-red-500/10">
                    <CardContent className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            <div>
                                <p className="font-medium text-red-700 dark:text-red-300">
                                    Subscrição cancelada
                                </p>
                                <p className="text-sm text-red-600 dark:text-red-400">
                                    Reative para voltar a enviar.
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={handlePortal}
                            disabled={loading === "portal"}
                            variant="outline"
                        >
                            {loading === "portal" && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Reativar
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Cancel at period end banner - P0-BILL-06 */}
            {isCancelAtPeriodEnd && !isCancelled && (
                <Card className="border-yellow-500/50 bg-yellow-500/10">
                    <CardContent className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-3">
                            <Clock className="h-5 w-5 text-yellow-500" />
                            <div>
                                <p className="font-medium text-yellow-700 dark:text-yellow-300">
                                    Termina em {formatDate(subscription?.currentPeriodEnd ?? null)}
                                </p>
                                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                                    A subscrição não será renovada. Pode reativar a qualquer momento.
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={handlePortal}
                            disabled={loading === "portal"}
                            variant="outline"
                        >
                            {loading === "portal" && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Reativar
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* A. Plano atual + B. Utilização */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* A. Plano atual */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            Plano atual
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Plano</span>
                            <span className="text-lg font-semibold">
                                {entitlements.planName}
                            </span>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Estado</span>
                            <span className={`font-medium ${status.color}`}>
                                {status.text}
                            </span>
                        </div>

                        {subscription?.currentPeriodEnd &&
                            !entitlements.tier.startsWith("trial") && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">
                                        Renovação
                                    </span>
                                    <span>{formatDate(subscription.currentPeriodEnd)}</span>
                                </div>
                            )}

                        <div className="flex items-center gap-2 rounded bg-muted/50 p-3 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>{getIncludesText()}</span>
                        </div>

                        {/* Portal button for paid users */}
                        {subscription?.hasStripeCustomer && (
                            <Button
                                onClick={handlePortal}
                                disabled={loading === "portal"}
                                variant="outline"
                                className="w-full"
                            >
                                {loading === "portal" && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Gerir subscrição
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* B. Utilização */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Utilização
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-lg font-medium">
                            {entitlements.quotesUsed} / {entitlements.effectivePlanLimit}{" "}
                            envios
                            {getUsageHelper()}
                        </div>

                        {/* Progress bar */}
                        <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                            <div
                                className={`h-full transition-all ${
                                    usagePercentage >= 90
                                        ? "bg-red-500"
                                        : usagePercentage >= 70
                                          ? "bg-yellow-500"
                                          : "bg-primary"
                                }`}
                                style={{ width: `${usagePercentage}%` }}
                            />
                        </div>

                        {/* Status text */}
                        {usagePercentage >= 90 && (
                            <p className="text-sm font-medium text-red-600">
                                Limite a atingir
                            </p>
                        )}
                        {usagePercentage >= 70 && usagePercentage < 90 && (
                            <p className="text-sm text-yellow-600">
                                A aproximar-se do limite
                            </p>
                        )}

                        {/* Helper text for trial/free */}
                        {entitlements.tier === "trial" && (
                            <p className="text-xs text-muted-foreground">
                                Inclui {entitlements.effectivePlanLimit} envios. Termina em{" "}
                                {entitlements.trialDaysRemaining} dias.
                            </p>
                        )}
                        {entitlements.tier === "free" && (
                            <p className="text-xs text-muted-foreground">
                                Modo manual. Inclui {entitlements.effectivePlanLimit}{" "}
                                envios/mês.
                            </p>
                        )}

                        {/* CTA */}
                        {getUsageCTA()}
                    </CardContent>
                </Card>
            </div>

            {/* C. Planos disponíveis */}
            <div id="plans-section">
                <h2 className="mb-4 text-lg font-semibold">Planos disponíveis</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {plans.map((plan) => {
                        const isCurrent =
                            subscription?.planId === plan.id ||
                            (entitlements.tier === "free" && plan.id === "free");

                        return (
                            <Card
                                key={plan.id}
                                className={`relative ${isCurrent ? "border-primary ring-1 ring-primary" : ""}`}
                            >
                                {isCurrent && (
                                    <div className="absolute -top-3 left-4">
                                        <Badge variant="default">Plano atual</Badge>
                                    </div>
                                )}
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                                    <CardDescription>
                                        {plan.quotesLimit} envios/mês
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="text-2xl font-bold">
                                        {formatPrice(plan.priceMonthly)}
                                    </div>

                                    {/* Features - P0-BILL-03 */}
                                    {plan.features.length > 0 && (
                                        <ul className="space-y-1.5 text-sm">
                                            {plan.features.map((feature, i) => (
                                                <li
                                                    key={i}
                                                    className={`flex items-center gap-2 ${
                                                        feature.enabled
                                                            ? "text-foreground"
                                                            : "text-muted-foreground"
                                                    }`}
                                                >
                                                    {feature.enabled ? (
                                                        <Check className="h-4 w-4 text-green-500" />
                                                    ) : (
                                                        <X className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                    {feature.text}
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    {/* Button */}
                                    {isCurrent ? (
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            disabled
                                        >
                                            Plano atual
                                        </Button>
                                    ) : subscription?.hasStripeCustomer ? (
                                        <Button
                                            onClick={handlePortal}
                                            disabled={loading === "portal"}
                                            variant="outline"
                                            className="w-full"
                                        >
                                            {loading === "portal" && (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            )}
                                            Gerir subscrição
                                        </Button>
                                    ) : plan.hasStripePrice ? (
                                        <Button
                                            onClick={() => handleCheckout(plan.id)}
                                            disabled={loading === plan.id}
                                            className="w-full"
                                        >
                                            {loading === plan.id && (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            )}
                                            Escolher plano
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            disabled
                                        >
                                            {plan.priceMonthly === 0
                                                ? "Plano gratuito"
                                                : "Contactar vendas"}
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
