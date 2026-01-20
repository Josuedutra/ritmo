import { NextResponse } from "next/server";
import { getApiSession, unauthorized, serverError } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getEntitlements } from "@/lib/entitlements";

/**
 * GET /api/billing
 *
 * Returns subscription and usage data for the organization.
 * Requires admin role.
 */
export async function GET() {
    const log = logger.child({ endpoint: "billing" });

    try {
        const session = await getApiSession();
        if (!session) {
            return unauthorized();
        }

        // Check admin role
        if (session.user.role !== "admin") {
            log.warn(
                { userId: session.user.id },
                "Non-admin attempted to access billing data"
            );
            return NextResponse.json(
                { error: "Apenas administradores podem ver dados de faturação" },
                { status: 403 }
            );
        }

        const organizationId = session.user.organizationId;

        // Get subscription with plan details
        const subscription = await prisma.subscription.findUnique({
            where: { organizationId },
            include: {
                plan: true,
            },
        });

        // Get current period usage
        const now = new Date();
        const periodStart = subscription?.currentPeriodStart || new Date(now.getFullYear(), now.getMonth(), 1);

        const usageCounter = await prisma.usageCounter.findFirst({
            where: {
                organizationId,
                periodStart: {
                    gte: periodStart,
                },
            },
            orderBy: { periodStart: "desc" },
        });

        // Get only PUBLIC active plans for upgrade options (hides pro_plus, enterprise)
        const plans = await prisma.plan.findMany({
            where: {
                isActive: true,
                isPublic: true,
            },
            orderBy: { priceMonthly: "asc" },
        });

        // Check if current plan is hidden (pro_plus, enterprise)
        const currentPlanIsHidden = subscription?.plan && !subscription.plan.isPublic;

        // Get entitlements (single source of truth) - P0-BILL-09
        const entitlements = await getEntitlements(organizationId);

        // Build response with normalized contract
        const response = {
            subscription: subscription
                ? {
                      planId: subscription.planId,
                      planName: subscription.plan?.name || subscription.planId,
                      status: subscription.status,
                      quotesLimit: subscription.quotesLimit,
                      currentPeriodStart: subscription.currentPeriodStart,
                      currentPeriodEnd: subscription.currentPeriodEnd,
                      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
                      hasStripeCustomer: !!subscription.stripeCustomerId,
                      hasStripeSubscription: !!subscription.stripeSubscriptionId,
                      isHiddenPlan: currentPlanIsHidden, // Flag for hidden plans (pro_plus, etc)
                  }
                : null,
            usage: {
                quotesSent: usageCounter?.quotesSent || 0,
                quotesLimit: subscription?.quotesLimit || 5,
                periodStart: periodStart,
            },
            // P0-BILL-09: entitlements included in response
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
            // Only public plans are returned (pro_plus, enterprise hidden)
            plans: plans.map((p) => ({
                id: p.id,
                name: p.name,
                quotesLimit: p.monthlyQuoteLimit,
                priceMonthly: p.priceMonthly,
                hasStripePrice: !!p.stripePriceId,
            })),
        };

        return NextResponse.json(response);
    } catch (error) {
        return serverError(error, "GET /api/billing");
    }
}
