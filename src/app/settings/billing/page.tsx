import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppHeader, PageHeader } from "@/components/layout";
import { BillingContent } from "./billing-content";
import { getEntitlements } from "@/lib/entitlements";

export default async function BillingPage() {
    const session = await auth();

    if (!session?.user?.organizationId) {
        redirect("/login");
    }

    // Only admins can access billing
    if (session.user.role !== "admin") {
        redirect("/dashboard");
    }

    // Get subscription data
    const subscription = await prisma.subscription.findUnique({
        where: { organizationId: session.user.organizationId },
        include: {
            plan: true,
        },
    });

    // Get current period usage
    const now = new Date();
    const periodStart =
        subscription?.currentPeriodStart ||
        new Date(now.getFullYear(), now.getMonth(), 1);

    const usageCounter = await prisma.usageCounter.findFirst({
        where: {
            organizationId: session.user.organizationId,
            periodStart: {
                gte: periodStart,
            },
        },
        orderBy: { periodStart: "desc" },
    });

    // Get all active plans and entitlements
    const [plans, entitlements] = await Promise.all([
        prisma.plan.findMany({
            where: { isActive: true },
            orderBy: { priceMonthly: "asc" },
        }),
        getEntitlements(session.user.organizationId),
    ]);

    const billingData = {
        subscription: subscription
            ? {
                  planId: subscription.planId,
                  planName: subscription.plan?.name || subscription.planId,
                  status: subscription.status,
                  quotesLimit: subscription.quotesLimit,
                  currentPeriodStart: subscription.currentPeriodStart?.toISOString() || null,
                  currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() || null,
                  cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
                  hasStripeCustomer: !!subscription.stripeCustomerId,
                  hasStripeSubscription: !!subscription.stripeSubscriptionId,
              }
            : null,
        usage: {
            quotesSent: usageCounter?.quotesSent || 0,
            quotesLimit: subscription?.quotesLimit || 10,
        },
        // P0-05: Pass entitlements for correct tier-based display
        entitlements: {
            tier: entitlements.tier,
            quotesUsed: entitlements.quotesUsed,
            effectivePlanLimit: entitlements.effectivePlanLimit,
            trialDaysRemaining: entitlements.trialDaysRemaining,
            planName: entitlements.planName,
        },
        plans: plans.map((p) => ({
            id: p.id,
            name: p.name,
            quotesLimit: p.monthlyQuoteLimit,
            priceMonthly: p.priceMonthly,
            hasStripePrice: !!p.stripePriceId,
        })),
    };

    return (
        <div className="min-h-screen bg-[var(--color-background)]">
            <AppHeader user={session.user} />

            <main className="container-app py-6">
                <PageHeader
                    title="Faturação"
                    description="Gerir o seu plano e pagamentos"
                />

                <BillingContent data={billingData} />
            </main>
        </div>
    );
}
