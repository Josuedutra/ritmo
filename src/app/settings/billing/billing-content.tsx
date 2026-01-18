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
} from "@/components/ui";
import {
    CreditCard,
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    ExternalLink,
    Loader2,
} from "lucide-react";

interface Plan {
    id: string;
    name: string;
    quotesLimit: number;
    priceMonthly: number;
    hasStripePrice: boolean;
}

interface BillingData {
    subscription: {
        planId: string;
        planName: string;
        status: string;
        quotesLimit: number;
        currentPeriodStart: string | null;
        currentPeriodEnd: string | null;
        cancelAtPeriodEnd: boolean;
        hasStripeCustomer: boolean;
        hasStripeSubscription: boolean;
    } | null;
    usage: {
        quotesSent: number;
        quotesLimit: number;
    };
    // P0-05: Entitlements for tier-based display
    entitlements: {
        tier: "trial" | "free" | "paid";
        quotesUsed: number;
        effectivePlanLimit: number;
        trialDaysRemaining: number | null;
        planName: string;
    };
    plans: Plan[];
}

interface BillingContentProps {
    data: BillingData;
}

export function BillingContent({ data }: BillingContentProps) {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState<string | null>(null);

    const success = searchParams.get("success") === "true";
    const canceled = searchParams.get("canceled") === "true";

    const { subscription, usage, entitlements, plans } = data;

    // P0-05: Use entitlements for accurate usage display
    const usagePercentage = entitlements.effectivePlanLimit > 0
        ? Math.min((entitlements.quotesUsed / entitlements.effectivePlanLimit) * 100, 100)
        : 0;

    // P0-05: Tier label for display
    const tierLabel = entitlements.tier === "trial"
        ? "Trial"
        : entitlements.tier === "paid"
            ? entitlements.planName
            : "Gratuito";

    // P0-05: Subtitle with context
    const tierSubtitle = entitlements.tier === "trial" && entitlements.trialDaysRemaining
        ? `${entitlements.trialDaysRemaining} dias restantes`
        : entitlements.tier === "free"
            ? "modo manual"
            : null;

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "-";
        return new Date(dateStr).toLocaleDateString("pt-PT", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    };

    const formatPrice = (cents: number) => {
        if (cents === 0) return "Grátis";
        return `${(cents / 100).toFixed(2)}€/mês`;
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "active":
                return <Badge variant="default">Ativo</Badge>;
            case "past_due":
                return <Badge variant="destructive">Pagamento em atraso</Badge>;
            case "cancelled":
                return <Badge variant="secondary">Cancelado</Badge>;
            case "trialing":
                return <Badge variant="outline">Período de teste</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
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
            } else {
                alert(result.error || "Erro ao abrir portal");
            }
        } catch {
            alert("Erro ao abrir portal");
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
                alert(result.error || "Erro ao criar checkout");
            }
        } catch {
            alert("Erro ao criar checkout");
        } finally {
            setLoading(null);
        }
    };

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
                            O processo de checkout foi cancelado. Pode tentar novamente quando quiser.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Past due warning */}
            {subscription?.status === "past_due" && (
                <Card className="border-red-500/50 bg-red-500/10">
                    <CardContent className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            <div>
                                <p className="font-medium text-red-700 dark:text-red-300">
                                    Pagamento em atraso
                                </p>
                                <p className="text-sm text-red-600 dark:text-red-400">
                                    Atualize o seu método de pagamento para continuar a usar todas as funcionalidades.
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

            {/* Subscription and Usage Cards */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Current Plan Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            Plano atual
                        </CardTitle>
                        <CardDescription>
                            Informações sobre a sua subscrição
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {subscription ? (
                            <>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-[var(--color-muted-foreground)]">
                                        Plano
                                    </span>
                                    <span className="font-medium">
                                        {subscription.planName}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-[var(--color-muted-foreground)]">
                                        Estado
                                    </span>
                                    {getStatusBadge(subscription.status)}
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-[var(--color-muted-foreground)]">
                                        Limite mensal
                                    </span>
                                    <span className="font-medium">
                                        {subscription.quotesLimit} orçamentos
                                    </span>
                                </div>
                                {subscription.currentPeriodEnd && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-[var(--color-muted-foreground)]">
                                            {subscription.cancelAtPeriodEnd
                                                ? "Termina em"
                                                : "Próxima renovação"}
                                        </span>
                                        <span className="font-medium">
                                            {formatDate(subscription.currentPeriodEnd)}
                                        </span>
                                    </div>
                                )}
                                {subscription.cancelAtPeriodEnd && (
                                    <p className="text-sm text-yellow-600 dark:text-yellow-400">
                                        A subscrição será cancelada no final do período.
                                    </p>
                                )}

                                {/* Action buttons */}
                                <div className="pt-4">
                                    {subscription.hasStripeCustomer ? (
                                        <Button
                                            onClick={handlePortal}
                                            disabled={loading === "portal"}
                                            className="w-full"
                                        >
                                            {loading === "portal" && (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            )}
                                            <ExternalLink className="mr-2 h-4 w-4" />
                                            Gerir no Stripe Portal
                                        </Button>
                                    ) : (
                                        <p className="text-sm text-[var(--color-muted-foreground)]">
                                            Escolha um plano pago para aceder ao portal de gestão.
                                        </p>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="py-4 text-center">
                                <p className="text-sm text-[var(--color-muted-foreground)]">
                                    Nenhuma subscrição encontrada.
                                </p>
                                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                                    Escolha um plano abaixo para começar.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Usage Card - P0-05: Updated to use entitlements */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" />
                                Utilização este mês
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline">{tierLabel}</Badge>
                                {tierSubtitle && (
                                    <span className="text-xs text-[var(--color-muted-foreground)]">
                                        {tierSubtitle}
                                    </span>
                                )}
                            </div>
                        </div>
                        <CardDescription>
                            Orçamentos enviados no período atual
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-end justify-between">
                            <div>
                                <span className="text-4xl font-bold">
                                    {entitlements.quotesUsed}
                                </span>
                                <span className="text-lg text-[var(--color-muted-foreground)]">
                                    {" "}
                                    / {entitlements.effectivePlanLimit}
                                </span>
                            </div>
                            <span className="text-sm text-[var(--color-muted-foreground)]">
                                {usagePercentage.toFixed(0)}% utilizado
                            </span>
                        </div>

                        {/* Progress bar */}
                        <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--color-muted)]">
                            <div
                                className={`h-full transition-all ${
                                    usagePercentage >= 90
                                        ? "bg-red-500"
                                        : usagePercentage >= 75
                                          ? "bg-yellow-500"
                                          : "bg-[var(--color-primary)]"
                                }`}
                                style={{ width: `${usagePercentage}%` }}
                            />
                        </div>

                        {usagePercentage >= 90 && (
                            <p className="text-sm text-red-600 dark:text-red-400">
                                Está a aproximar-se do limite. Considere fazer upgrade do plano.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Plans Grid */}
            <div>
                <h2 className="mb-4 text-lg font-semibold">Planos disponíveis</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {plans.map((plan) => {
                        const isCurrent = subscription?.planId === plan.id;
                        const isUpgrade =
                            subscription &&
                            plan.priceMonthly >
                                (plans.find((p) => p.id === subscription.planId)
                                    ?.priceMonthly || 0);
                        const isDowngrade =
                            subscription &&
                            plan.priceMonthly <
                                (plans.find((p) => p.id === subscription.planId)
                                    ?.priceMonthly || 0);

                        return (
                            <Card
                                key={plan.id}
                                className={`relative ${isCurrent ? "border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]" : ""}`}
                            >
                                {isCurrent && (
                                    <div className="absolute -top-3 left-4">
                                        <Badge variant="default">Plano atual</Badge>
                                    </div>
                                )}
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                                    <CardDescription>
                                        {plan.quotesLimit} orçamentos/mês
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="text-2xl font-bold">
                                        {formatPrice(plan.priceMonthly)}
                                    </div>

                                    {isCurrent ? (
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            disabled
                                        >
                                            Plano atual
                                        </Button>
                                    ) : plan.hasStripePrice ? (
                                        subscription?.hasStripeCustomer ? (
                                            <Button
                                                onClick={handlePortal}
                                                disabled={loading === "portal"}
                                                variant={isUpgrade ? "default" : "outline"}
                                                className="w-full"
                                            >
                                                {loading === "portal" && (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                )}
                                                {isUpgrade
                                                    ? "Fazer upgrade"
                                                    : isDowngrade
                                                      ? "Fazer downgrade"
                                                      : "Alterar plano"}
                                            </Button>
                                        ) : (
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
                                        )
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
