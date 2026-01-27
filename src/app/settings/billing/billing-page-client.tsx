"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
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
    maxUsers: number;
    hasStripePrice: boolean;
    hasAnnualPrice: boolean;
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
        isHiddenPlan?: boolean; // True for pro_plus, enterprise (early access)
        billingInterval?: string;
        extraSeats?: number;
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

// Feature flag for payments - read from env at build time
const PAYMENTS_ENABLED = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === "true";

export function BillingPageClient({ data }: BillingPageClientProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const [loading, setLoading] = useState<string | null>(null);
    const [isAnnual, setIsAnnual] = useState(false);
    const [starterExtraSeats, setStarterExtraSeats] = useState(0);

    // Reset extra seats when switching to annual (no annual seat addon available)
    const handleBillingIntervalChange = (annual: boolean) => {
        setIsAnnual(annual);
        if (annual) {
            setStarterExtraSeats(0);
        }
    };

    const success = searchParams.get("success") === "true";
    const canceled = searchParams.get("canceled") === "true";

    const { subscription, entitlements, plans } = data;

    // Check if any plan has annual pricing available
    const anyAnnualAvailable = plans.some((p) => p.hasAnnualPrice);

    // Show toasts for success/cancel query params and clear them
    useEffect(() => {
        if (success) {
            toast.success("Plano ativado com sucesso.");
            router.replace(pathname);
        }
        if (canceled) {
            toast({ title: "Checkout cancelado", description: "Pode retomar quando quiser." });
            router.replace(pathname);
        }
    }, [success, canceled, router, pathname]);

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
    const isHiddenPlan = subscription?.isHiddenPlan ?? false; // pro_plus, enterprise (early access)

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "-";
        return new Date(dateStr).toLocaleDateString("pt-PT", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    const formatPrice = (cents: number, planId?: string) => {
        if (cents === 0) return "Grátis";
        if (isAnnual && planId !== "free") {
            // Annual: 10 months for price of 12 → monthly equivalent
            const annualMonthly = Math.floor((cents * 10) / 12);
            return `€${(annualMonthly / 100).toFixed(0)}/mês`;
        }
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
                toast({ title: "Escolha um plano", description: "Selecione um plano para começar." });
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
        // Check feature flag before calling API
        if (!PAYMENTS_ENABLED) {
            toast({
                title: "Pagamentos em breve",
                description: "O sistema de pagamentos ainda não está disponível. Continuamos a trabalhar para o ativar em breve.",
            });
            return;
        }

        setLoading(planId);
        try {
            const response = await fetch("/api/billing/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    planKey: planId,
                    billingInterval: isAnnual ? "annual" : "monthly",
                    extraSeats: planId === "starter" ? starterExtraSeats : 0,
                }),
            });
            const result = await response.json();

            if (response.ok && result.url) {
                window.location.href = result.url;
            } else if (result.error === "PAYMENTS_DISABLED") {
                toast({
                    title: "Pagamentos em breve",
                    description: result.message || "O sistema de pagamentos ainda não está disponível.",
                });
            } else if (result.error === "ANNUAL_NOT_AVAILABLE") {
                toast({
                    title: "Plano anual em breve",
                    description: result.message || "Estamos a preparar esta opção.",
                });
            } else {
                toast.error("Erro", result.error || "Erro ao criar checkout");
            }
        } catch {
            toast.error("Erro", "Erro ao criar checkout");
        } finally {
            setLoading(null);
        }
    };

    // Get helper text for plan card (Inclui section)
    const getPlanHelper = () => {
        if (entitlements.tier === "trial") {
            return `Trial ativo — inclui ${entitlements.effectivePlanLimit} envios. Termina em ${entitlements.trialDaysRemaining} dias.`;
        }
        if (entitlements.tier === "free") {
            return `Modo manual — inclui ${entitlements.effectivePlanLimit} envios por mês.`;
        }
        if (isPastDue) {
            return "Pagamento em atraso. Atualize o método de pagamento para continuar a enviar.";
        }
        if (isCancelled) {
            return "A subscrição foi cancelada. Para voltar a enviar, reative o plano.";
        }
        if (isCancelAtPeriodEnd) {
            return "O plano termina no fim do período atual.";
        }
        if (isHiddenPlan) {
            return "Este plano está em early access. Para alterações, contacte-nos.";
        }
        return "Tudo ativo — emails automáticos e captura por BCC incluídos no seu plano.";
    };

    // Get status badge
    const getStatusBadge = () => {
        if (isPastDue) return { text: "Em atraso", variant: "destructive" as const };
        if (isCancelled) return { text: "Cancelado", variant: "secondary" as const };
        if (isCancelAtPeriodEnd) return { text: "Termina no fim do período", variant: "warning" as const };
        if (entitlements.tier === "trial") return { text: "Trial", variant: "default" as const };
        if (isHiddenPlan) return { text: "Early Access", variant: "default" as const };
        return { text: "Ativo", variant: "success" as const };
    };

    // Get usage helper text
    const getUsageHelper = () => {
        if (entitlements.tier === "trial" && entitlements.trialDaysRemaining) {
            return `Faltam ${entitlements.trialDaysRemaining} dias de trial.`;
        }
        if (entitlements.tier === "free") {
            return "Está em modo manual (sem emails automáticos).";
        }
        return null;
    };

    // Get usage threshold text
    const getUsageThresholdText = () => {
        if (usagePercentage >= 100) {
            return { text: "Limite atingido.", color: "text-destructive" };
        }
        if (usagePercentage >= 90) {
            return { text: "Quase no limite — considere upgrade para não parar.", color: "text-destructive" };
        }
        if (usagePercentage >= 70) {
            return { text: "A aproximar-se do limite.", color: "text-warning" };
        }
        return null;
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
                    {loading === "portal" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                    {loading === "portal" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Reativar plano
                </Button>
            );
        }
        if (entitlements.tier === "trial" || entitlements.tier === "free") {
            return (
                <Button
                    onClick={() => {
                        document.getElementById("plans-section")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="w-full"
                >
                    Atualizar plano
                </Button>
            );
        }
        return null;
    };

    const statusBadge = getStatusBadge();
    const usageThreshold = getUsageThresholdText();
    const usageHelper = getUsageHelper();

    // Determine button text for plan cards (short version for mobile)
    const getPlanButtonText = (plan: Plan, isCurrent: boolean): { full: string; short: string } => {
        if (isCurrent) return { full: "Plano atual", short: "Atual" };
        if (subscription?.hasStripeCustomer) return { full: "Gerir subscrição", short: "Gerir" };
        if (!plan.hasStripePrice) {
            return plan.priceMonthly === 0
                ? { full: "Plano gratuito", short: "Grátis" }
                : { full: "Contactar vendas", short: "Contactar" };
        }

        // Determine if it's upgrade or downgrade based on price
        const currentPlanPrice = plans.find(
            (p) => p.id === subscription?.planId || (entitlements.tier === "free" && p.id === "free")
        )?.priceMonthly ?? 0;

        if (plan.priceMonthly > currentPlanPrice) return { full: "Fazer upgrade", short: "Upgrade" };
        if (plan.priceMonthly < currentPlanPrice) return { full: "Fazer downgrade", short: "Downgrade" };
        return { full: "Escolher plano", short: "Escolher" };
    };

    return (
        <div className="space-y-6">
            {/* Success/Cancel banners (visual feedback) */}
            {success && (
                <Card className="border-success bg-success">
                    <CardContent className="flex items-center gap-3 py-4">
                        <CheckCircle className="h-5 w-5 text-success" />
                        <p className="text-sm text-success">
                            Plano ativado com sucesso.
                        </p>
                    </CardContent>
                </Card>
            )}

            {canceled && (
                <Card className="border-warning bg-warning">
                    <CardContent className="flex items-center gap-3 py-4">
                        <AlertTriangle className="h-5 w-5 text-warning" />
                        <p className="text-sm text-warning">
                            Checkout cancelado. Pode retomar quando quiser.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Past due banner */}
            {isPastDue && (
                <Card className="border-destructive bg-destructive-subtle">
                    <CardContent className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            <div>
                                <p className="font-medium text-destructive">
                                    Pagamento em atraso
                                </p>
                                <p className="text-sm text-destructive">
                                    Atualize o método de pagamento para continuar a enviar orçamentos e follow-ups.
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={handlePortal}
                            disabled={loading === "portal"}
                            variant="destructive"
                        >
                            {loading === "portal" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Atualizar pagamento
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Cancelled banner - neutral color (not alarming) */}
            {isCancelled && (
                <Card className="border-[var(--color-border)] bg-[var(--color-muted)]">
                    <CardContent className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="font-medium text-foreground">
                                    Subscrição cancelada
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Para continuar a enviar e manter a cadência ativa, reative um plano.
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={handlePortal}
                            disabled={loading === "portal"}
                            variant="outline"
                        >
                            {loading === "portal" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Reativar plano
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Cancel at period end banner */}
            {isCancelAtPeriodEnd && !isCancelled && (
                <Card className="border-warning bg-warning">
                    <CardContent className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-3">
                            <Clock className="h-5 w-5 text-warning" />
                            <div>
                                <p className="font-medium text-warning">
                                    Plano a terminar
                                </p>
                                <p className="text-sm text-warning">
                                    O seu plano termina em {formatDate(subscription?.currentPeriodEnd ?? null)}. Pode reativar a qualquer momento.
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={handlePortal}
                            disabled={loading === "portal"}
                            variant="outline"
                        >
                            {loading === "portal" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Gerir subscrição
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
                                {isHiddenPlan && " (Early Access)"}
                            </span>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Estado</span>
                            <Badge variant={statusBadge.variant}>{statusBadge.text}</Badge>
                        </div>

                        {subscription?.currentPeriodEnd && entitlements.tier === "paid" && !isCancelAtPeriodEnd && (
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Renovação</span>
                                <span>{formatDate(subscription.currentPeriodEnd)}</span>
                            </div>
                        )}

                        <div className="flex items-start gap-2 rounded bg-muted/50 p-3 text-sm">
                            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                            <span>{getPlanHelper()}</span>
                        </div>

                        {/* Portal button for paid users, or contact support for hidden plans without portal */}
                        {subscription?.hasStripeCustomer ? (
                            <Button
                                onClick={handlePortal}
                                disabled={loading === "portal"}
                                variant="outline"
                                className="w-full"
                            >
                                {loading === "portal" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Gerir subscrição
                            </Button>
                        ) : isHiddenPlan ? (
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => window.location.href = "mailto:ritmo@useritmo.pt?subject=Plano%20Early%20Access"}
                            >
                                Contactar suporte
                            </Button>
                        ) : null}
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
                            {entitlements.quotesUsed} / {entitlements.effectivePlanLimit} envios
                        </div>

                        {/* Progress bar */}
                        <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                            <div
                                className={`h-full transition-all ${
                                    usagePercentage >= 90
                                        ? "bg-[var(--color-destructive)]"
                                        : usagePercentage >= 70
                                          ? "bg-[var(--color-warning)]"
                                          : "bg-primary"
                                }`}
                                style={{ width: `${usagePercentage}%` }}
                            />
                        </div>

                        {/* Threshold text */}
                        {usageThreshold && (
                            <p className={`text-sm font-medium ${usageThreshold.color}`}>
                                {usageThreshold.text}
                            </p>
                        )}

                        {/* Helper text for trial/free */}
                        {usageHelper && (
                            <p className="text-xs text-muted-foreground">{usageHelper}</p>
                        )}

                        {/* CTA */}
                        {getUsageCTA()}
                    </CardContent>
                </Card>
            </div>

            {/* C. Planos */}
            <div id="plans-section">
                <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-semibold">Planos</h2>
                        <p className="text-sm text-muted-foreground">
                            Escolha o nível certo para o seu volume de envios.
                        </p>
                    </div>

                    {/* Billing interval toggle */}
                    {anyAnnualAvailable && (
                        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-muted)] p-1">
                            <button
                                onClick={() => handleBillingIntervalChange(false)}
                                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${!isAnnual ? "bg-[var(--color-background)] shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                            >
                                Mensal
                            </button>
                            <button
                                onClick={() => handleBillingIntervalChange(true)}
                                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all flex items-center gap-1.5 ${isAnnual ? "bg-[var(--color-background)] shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                            >
                                Anual
                                <Badge variant="success" className="text-[10px] px-1.5 py-0">2 meses grátis</Badge>
                            </button>
                        </div>
                    )}
                </div>

                {/* Payments disabled banner */}
                {!PAYMENTS_ENABLED && (
                    <Card className="mb-4 border-[var(--color-info)]/30 bg-[var(--color-info)]/10">
                        <CardContent className="flex items-center gap-3 py-4">
                            <Clock className="h-5 w-5 text-[var(--color-info)]" />
                            <div>
                                <p className="font-medium text-[var(--color-info-foreground)]">
                                    Pagamentos em breve
                                </p>
                                <p className="text-sm text-[var(--color-info)]">
                                    Estamos a preparar o sistema de pagamentos. Por agora, pode continuar a usar o trial ou o plano gratuito.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {plans.map((plan) => {
                        const isCurrent =
                            subscription?.planId === plan.id ||
                            (entitlements.tier === "free" && plan.id === "free");

                        const buttonText = getPlanButtonText(plan, isCurrent);

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
                                    <CardDescription>{plan.quotesLimit} envios/mês</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <div className="text-2xl font-bold">
                                            {formatPrice(plan.priceMonthly, plan.id)}
                                            {isAnnual && plan.priceMonthly > 0 && (
                                                <span className="ml-2 text-sm font-normal text-muted-foreground line-through">
                                                    €{(plan.priceMonthly / 100).toFixed(0)}
                                                </span>
                                            )}
                                        </div>
                                        {isAnnual && plan.priceMonthly > 0 && (
                                            <p className="text-xs text-success mt-1">
                                                Faturado €{((plan.priceMonthly * 10) / 100).toFixed(0)}/ano
                                            </p>
                                        )}
                                    </div>

                                    {/* Extra seats stepper (Starter only) */}
                                    {plan.id === "starter" && !isCurrent && (
                                        <div className={`rounded-lg border border-[var(--color-border)] p-3 space-y-2 ${isAnnual ? "opacity-50" : ""}`}>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-muted-foreground">Utilizadores extra</span>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 w-7 p-0"
                                                        disabled={isAnnual || starterExtraSeats <= 0}
                                                        onClick={() => setStarterExtraSeats(Math.max(0, starterExtraSeats - 1))}
                                                    >
                                                        -
                                                    </Button>
                                                    <span className="text-sm font-medium w-4 text-center">{starterExtraSeats}</span>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 w-7 p-0"
                                                        disabled={isAnnual || starterExtraSeats >= 5}
                                                        onClick={() => setStarterExtraSeats(Math.min(5, starterExtraSeats + 1))}
                                                    >
                                                        +
                                                    </Button>
                                                </div>
                                            </div>
                                            {isAnnual ? (
                                                <p className="text-xs text-muted-foreground">
                                                    Utilizadores extra disponíveis apenas no plano mensal.
                                                </p>
                                            ) : (
                                                <>
                                                    {starterExtraSeats > 0 && (
                                                        <p className="text-xs text-muted-foreground">
                                                            +€{starterExtraSeats * 15}/mês ({plan.maxUsers + starterExtraSeats} utilizadores total)
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-muted-foreground">
                                                        Inclui {plan.maxUsers} utilizadores. €15/mês por extra.
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {/* Features */}
                                    {plan.features.length > 0 && (
                                        <ul className="space-y-1.5 text-sm">
                                            {plan.features.map((feature, i) => (
                                                <li
                                                    key={i}
                                                    className={`flex items-center gap-2 ${
                                                        feature.enabled ? "text-foreground" : "text-muted-foreground"
                                                    }`}
                                                >
                                                    {feature.enabled ? (
                                                        <Check className="h-4 w-4 text-success" />
                                                    ) : (
                                                        <X className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                    {feature.text}
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    {/* Button - responsive text */}
                                    {isCurrent ? (
                                        <Button variant="outline" className="w-full" disabled>
                                            <span className="sm:hidden">{buttonText.short}</span>
                                            <span className="hidden sm:inline">{buttonText.full}</span>
                                        </Button>
                                    ) : subscription?.hasStripeCustomer ? (
                                        <Button
                                            onClick={handlePortal}
                                            disabled={loading === "portal"}
                                            variant="outline"
                                            className="w-full"
                                        >
                                            {loading === "portal" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            <span className="sm:hidden">{buttonText.short}</span>
                                            <span className="hidden sm:inline">{buttonText.full}</span>
                                        </Button>
                                    ) : plan.hasStripePrice ? (
                                        <Button
                                            onClick={() => handleCheckout(plan.id)}
                                            disabled={loading === plan.id}
                                            className="w-full"
                                        >
                                            {loading === plan.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            <span className="sm:hidden">{buttonText.short}</span>
                                            <span className="hidden sm:inline">{buttonText.full}</span>
                                        </Button>
                                    ) : (
                                        <Button variant="outline" className="w-full" disabled>
                                            <span className="sm:hidden">{buttonText.short}</span>
                                            <span className="hidden sm:inline">{buttonText.full}</span>
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
