import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEntitlements } from "@/lib/entitlements";
import { BillingPageClient } from "./billing-page-client";

export default async function BillingPage() {
    const session = await auth();
    if (!session?.user?.organizationId) redirect("/login");

    const organizationId = session.user.organizationId;

    // Get organization with subscription
    const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
            subscription: {
                include: {
                    plan: true,
                },
            },
        },
    });

    if (!organization) redirect("/login");

    // Get entitlements (single source of truth)
    const entitlements = await getEntitlements(organizationId);

    // Get all plans
    const plans = await prisma.plan.findMany({
        where: { isActive: true },
        orderBy: { priceMonthly: "asc" },
    });

    // Transform data for client
    const subscription = organization.subscription;

    const data = {
        organization: {
            id: organization.id,
            trialEndsAt: organization.trialEndsAt?.toISOString() ?? null,
        },
        subscription: subscription
            ? {
                  planId: subscription.planId,
                  planName: subscription.plan?.name ?? "Gratuito",
                  status: subscription.status,
                  quotesLimit: subscription.quotesLimit,
                  currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
                  cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
                  hasStripeCustomer: !!subscription.stripeCustomerId,
                  hasStripeSubscription: !!subscription.stripeSubscriptionId,
              }
            : null,
        entitlements: {
            tier: entitlements.tier,
            planName: entitlements.planName,
            quotesUsed: entitlements.quotesUsed,
            effectivePlanLimit: entitlements.effectivePlanLimit,
            trialDaysRemaining: entitlements.trialDaysRemaining,
            autoEmailEnabled: entitlements.autoEmailEnabled,
            bccInboundEnabled: entitlements.bccInboundEnabled,
            subscriptionStatus: entitlements.subscriptionStatus,
        },
        plans: plans.map((p) => ({
            id: p.id,
            name: p.name,
            quotesLimit: p.monthlyQuoteLimit,
            priceMonthly: p.priceMonthly,
            hasStripePrice: !!p.stripePriceId,
            // Features based on plan
            features:
                p.id === "free"
                    ? []
                    : ["Emails automáticos", "Captura de proposta por BCC"],
        })),
    };

    return <BillingPageClient data={data} />;
}
