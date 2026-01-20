/**
 * Entitlements System (P0)
 *
 * Central source of truth for organization capabilities.
 * Determines what an org can do based on:
 * - Active subscription (paid plan)
 * - Active trial (14 days, 20 quotes)
 * - Free tier (5 quotes, no automation)
 *
 * Usage:
 *   const entitlements = await getEntitlements(orgId);
 *   if (!entitlements.canMarkSent.allowed) {
 *     return error(entitlements.canMarkSent.message);
 *   }
 */

import { prisma } from "@/lib/prisma";

// Constants - Frozen pricing
export const FREE_TIER_LIMIT = 5;
export const FREE_MAX_USERS = 1;
export const TRIAL_LIMIT = 20;
export const TRIAL_MAX_USERS = 2;
export const TRIAL_DURATION_DAYS = 14;
export const MAX_RESENDS_PER_MONTH = 2;

// Plan limits (single source of truth for UI consistency)
export const PLAN_LIMITS = {
    free: { monthlyQuotes: 5, maxUsers: 1, price: 0 },
    starter: { monthlyQuotes: 80, maxUsers: 2, price: 3900 },
    pro: { monthlyQuotes: 250, maxUsers: 5, price: 9900 },
    enterprise: { monthlyQuotes: 1000, maxUsers: 999, price: 0 },
} as const;

export interface Entitlements {
    // Tier info
    tier: "trial" | "free" | "paid";
    planName: string;
    planId: string | null;

    // Limits
    effectivePlanLimit: number;
    quotesUsed: number;
    quotesRemaining: number;
    maxUsers: number;

    // Trial-specific
    trialActive: boolean;
    trialEndsAt: Date | null;
    trialDaysRemaining: number | null;

    // Feature flags
    autoEmailEnabled: boolean;
    bccInboundEnabled: boolean;

    // Computed permissions with CTA
    canMarkSent: {
        allowed: boolean;
        reason?: "LIMIT_EXCEEDED" | "TRIAL_ENDED" | "PAYMENT_REQUIRED" | "SUBSCRIPTION_CANCELLED";
        message?: string;
        ctaAction?: "upgrade_plan" | "start_subscription" | "update_payment" | "reactivate_subscription";
        ctaUrl?: string;
    };

    // Subscription status
    subscriptionStatus: "active" | "past_due" | "cancelled" | "trialing" | null;
}

interface OrgData {
    id: string;
    trialEndsAt: Date | null;
    trialSentLimit: number;
    trialSentUsed: number;
    autoEmailEnabled: boolean;
    bccInboundEnabled: boolean;
    subscription: {
        status: string;
        quotesLimit: number;
        planId: string;
        plan: {
            id: string;
            name: string;
            monthlyQuoteLimit: number;
            maxUsers: number;
        } | null;
    } | null;
}

/**
 * Get entitlements for an organization.
 * This is the single source of truth for what an org can do.
 */
export async function getEntitlements(organizationId: string): Promise<Entitlements> {
    const now = new Date();

    // Fetch org with subscription in single query
    const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
            id: true,
            trialEndsAt: true,
            trialSentLimit: true,
            trialSentUsed: true,
            autoEmailEnabled: true,
            bccInboundEnabled: true,
            subscription: {
                include: {
                    plan: {
                        select: {
                            id: true,
                            name: true,
                            monthlyQuoteLimit: true,
                            maxUsers: true,
                        },
                    },
                },
            },
        },
    });

    if (!org) {
        // Return restrictive defaults for non-existent org
        return getDefaultEntitlements();
    }

    // Get current period usage (for paid/free tiers)
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const usage = await prisma.usageCounter.findFirst({
        where: {
            organizationId,
            periodStart: { gte: periodStart },
        },
        select: { quotesSent: true },
    });

    return calculateEntitlements(org, usage?.quotesSent ?? 0, now);
}

/**
 * Calculate entitlements from org data.
 * Separated for testability.
 */
export function calculateEntitlements(
    org: OrgData,
    periodQuotesSent: number,
    now: Date = new Date()
): Entitlements {
    const subscription = org.subscription;
    const hasActiveSubscription = subscription &&
        (subscription.status === "active" || subscription.status === "trialing");
    const hasPastDueSubscription = subscription?.status === "past_due";
    const hasCancelledSubscription = subscription?.status === "cancelled";

    // Check trial status
    const trialActive = org.trialEndsAt ? org.trialEndsAt > now : false;
    const trialDaysRemaining = trialActive && org.trialEndsAt
        ? Math.ceil((org.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;

    // Determine tier and limits
    let tier: "trial" | "free" | "paid";
    let effectivePlanLimit: number;
    let quotesUsed: number;
    let planName: string;
    let planId: string | null;
    let maxUsers: number;
    let autoEmailEnabled: boolean;
    let bccInboundEnabled: boolean;

    if (hasActiveSubscription) {
        // Paid tier - use subscription limits
        tier = "paid";
        effectivePlanLimit = subscription.plan?.monthlyQuoteLimit ?? subscription.quotesLimit;
        quotesUsed = periodQuotesSent;
        planName = subscription.plan?.name ?? "Pago";
        planId = subscription.plan?.id ?? subscription.planId;
        maxUsers = subscription.plan?.maxUsers ?? 1;
        // Paid plans get automation features
        autoEmailEnabled = true;
        bccInboundEnabled = true;
    } else if (trialActive) {
        // Trial tier - use trial limits
        tier = "trial";
        effectivePlanLimit = org.trialSentLimit;
        quotesUsed = org.trialSentUsed;
        planName = "Trial";
        planId = null;
        maxUsers = TRIAL_MAX_USERS;
        // Trial gets automation features
        autoEmailEnabled = true;
        bccInboundEnabled = true;
    } else {
        // Free tier - limited, no automation
        tier = "free";
        effectivePlanLimit = FREE_TIER_LIMIT;
        quotesUsed = periodQuotesSent;
        planName = "Gratuito";
        planId = "free";
        maxUsers = FREE_MAX_USERS;
        // Free tier has NO automation
        autoEmailEnabled = false;
        bccInboundEnabled = false;
    }

    const quotesRemaining = Math.max(0, effectivePlanLimit - quotesUsed);

    // Calculate canMarkSent permission
    const canMarkSent = calculateCanMarkSent({
        tier,
        quotesUsed,
        effectivePlanLimit,
        hasCancelledSubscription,
        hasPastDueSubscription,
        trialActive,
        planName,
    });

    return {
        tier,
        planName,
        planId,
        effectivePlanLimit,
        quotesUsed,
        quotesRemaining,
        maxUsers,
        trialActive,
        trialEndsAt: org.trialEndsAt,
        trialDaysRemaining,
        autoEmailEnabled,
        bccInboundEnabled,
        canMarkSent,
        subscriptionStatus: subscription?.status as Entitlements["subscriptionStatus"] ?? null,
    };
}

interface CanMarkSentParams {
    tier: "trial" | "free" | "paid";
    quotesUsed: number;
    effectivePlanLimit: number;
    hasCancelledSubscription: boolean;
    hasPastDueSubscription: boolean;
    trialActive: boolean;
    planName: string;
}

function calculateCanMarkSent(params: CanMarkSentParams): Entitlements["canMarkSent"] {
    const {
        tier,
        quotesUsed,
        effectivePlanLimit,
        hasCancelledSubscription,
        hasPastDueSubscription,
        trialActive,
        planName,
    } = params;

    // Check subscription blockers first
    if (hasCancelledSubscription) {
        return {
            allowed: false,
            reason: "SUBSCRIPTION_CANCELLED",
            message: "A sua subscrição foi cancelada. Reative para continuar a enviar.",
            ctaAction: "reactivate_subscription",
            ctaUrl: "/settings/billing",
        };
    }

    if (hasPastDueSubscription) {
        return {
            allowed: false,
            reason: "PAYMENT_REQUIRED",
            message: "O seu pagamento está em atraso. Atualize o método de pagamento para continuar.",
            ctaAction: "update_payment",
            ctaUrl: "/settings/billing",
        };
    }

    // Check quota limit
    if (quotesUsed >= effectivePlanLimit) {
        if (tier === "trial") {
            return {
                allowed: false,
                reason: "LIMIT_EXCEEDED",
                message: `Atingiu o limite de ${effectivePlanLimit} envios do trial. Escolha um plano para continuar.`,
                ctaAction: "start_subscription",
                ctaUrl: "/settings/billing",
            };
        }

        if (tier === "free") {
            return {
                allowed: false,
                reason: "LIMIT_EXCEEDED",
                message: `Atingiu o limite de ${effectivePlanLimit} envios do plano gratuito. Atualize para enviar mais.`,
                ctaAction: "upgrade_plan",
                ctaUrl: "/settings/billing",
            };
        }

        // Paid tier
        return {
            allowed: false,
            reason: "LIMIT_EXCEEDED",
            message: `Atingiu o limite de ${effectivePlanLimit} envios do plano ${planName}. Atualize o seu plano para continuar.`,
            ctaAction: "upgrade_plan",
            ctaUrl: "/settings/billing",
        };
    }

    // Check if trial ended (but not in another tier)
    if (!trialActive && tier === "free") {
        // This is covered by free tier limit check above
        // But we allow sending up to free limit
    }

    return { allowed: true };
}

function getDefaultEntitlements(): Entitlements {
    return {
        tier: "free",
        planName: "Gratuito",
        planId: "free",
        effectivePlanLimit: FREE_TIER_LIMIT,
        quotesUsed: 0,
        quotesRemaining: FREE_TIER_LIMIT,
        maxUsers: FREE_MAX_USERS,
        trialActive: false,
        trialEndsAt: null,
        trialDaysRemaining: null,
        autoEmailEnabled: false,
        bccInboundEnabled: false,
        canMarkSent: {
            allowed: false,
            reason: "SUBSCRIPTION_CANCELLED",
            message: "Organização não encontrada.",
        },
        subscriptionStatus: null,
    };
}

/**
 * Helper to check if organization can use auto-email feature.
 * Used by cron job to gate AUTO_EMAIL_MODE per org.
 */
export async function canUseAutoEmail(organizationId: string): Promise<boolean> {
    const entitlements = await getEntitlements(organizationId);
    return entitlements.autoEmailEnabled;
}

/**
 * Helper to check if organization can use BCC inbound feature.
 * Used by Mailgun webhook to gate proposal auto-attachment.
 */
export async function canUseBccInbound(organizationId: string): Promise<boolean> {
    const entitlements = await getEntitlements(organizationId);
    return entitlements.bccInboundEnabled;
}

/**
 * Helper to start a 14-day trial for a new organization.
 */
export async function startTrial(organizationId: string): Promise<void> {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DURATION_DAYS);

    await prisma.organization.update({
        where: { id: organizationId },
        data: {
            trialEndsAt,
            trialSentLimit: TRIAL_LIMIT,
            trialSentUsed: 0,
            // Enable automation during trial
            autoEmailEnabled: true,
            bccInboundEnabled: true,
        },
    });
}

/**
 * Increment trial usage counter.
 * Called when marking a quote as sent during trial.
 */
export async function incrementTrialUsage(organizationId: string): Promise<void> {
    await prisma.organization.update({
        where: { id: organizationId },
        data: {
            trialSentUsed: { increment: 1 },
        },
    });
}

/**
 * Check if organization can access the scoreboard feature.
 * Available for: Starter, Pro, Enterprise (paid plans)
 * NOT available for: Free tier
 * Trial: Shows teaser with upgrade CTA
 */
export async function canAccessScoreboard(organizationId: string): Promise<{
    allowed: boolean;
    tier: "paid" | "trial" | "free";
    showTeaser: boolean;
}> {
    const entitlements = await getEntitlements(organizationId);

    if (entitlements.tier === "paid") {
        return { allowed: true, tier: "paid", showTeaser: false };
    }

    if (entitlements.tier === "trial") {
        // Trial users see a teaser but not full data
        return { allowed: false, tier: "trial", showTeaser: true };
    }

    // Free tier - no access
    return { allowed: false, tier: "free", showTeaser: false };
}

/**
 * Check if organization can access the benchmark feature.
 * Only available for Pro and Enterprise plans.
 */
export async function canAccessBenchmark(organizationId: string): Promise<{
    allowed: boolean;
    planRequired: string;
}> {
    const entitlements = await getEntitlements(organizationId);

    // Only Pro and Enterprise have benchmark access
    const benchmarkPlans = ["pro", "enterprise"];
    const allowed = entitlements.tier === "paid" &&
        entitlements.planId !== null &&
        benchmarkPlans.includes(entitlements.planId);

    return {
        allowed,
        planRequired: allowed ? "" : "Pro",
    };
}

/**
 * Check if organization can add more users (seats).
 * Returns current count, limit, and whether adding is allowed.
 */
export async function checkSeatLimit(organizationId: string): Promise<{
    currentUsers: number;
    maxUsers: number;
    canAddUser: boolean;
    remaining: number;
}> {
    const entitlements = await getEntitlements(organizationId);

    const currentUsers = await prisma.user.count({
        where: { organizationId },
    });

    const canAddUser = currentUsers < entitlements.maxUsers;

    return {
        currentUsers,
        maxUsers: entitlements.maxUsers,
        canAddUser,
        remaining: Math.max(0, entitlements.maxUsers - currentUsers),
    };
}

/**
 * Check if organization can access reports feature.
 * Only available for Pro and Enterprise plans.
 */
export async function canAccessReports(organizationId: string): Promise<{
    allowed: boolean;
    planRequired: string;
}> {
    const entitlements = await getEntitlements(organizationId);

    // Only Pro and Enterprise have reports access
    const reportsPlans = ["pro", "enterprise"];
    const allowed = entitlements.tier === "paid" &&
        entitlements.planId !== null &&
        reportsPlans.includes(entitlements.planId);

    return {
        allowed,
        planRequired: allowed ? "" : "Pro",
    };
}

/**
 * Check if organization can configure priority rules.
 * Only Pro and Enterprise can customize rules.
 * Starter uses fixed threshold of 1000.
 */
export async function canConfigurePriorityRules(organizationId: string): Promise<{
    allowed: boolean;
    planRequired: string;
}> {
    const entitlements = await getEntitlements(organizationId);

    // Only Pro and Enterprise can configure priority rules
    const configPlans = ["pro", "enterprise"];
    const allowed = entitlements.tier === "paid" &&
        entitlements.planId !== null &&
        configPlans.includes(entitlements.planId);

    return {
        allowed,
        planRequired: allowed ? "" : "Pro",
    };
}

/**
 * Check if organization can reassign quote owners.
 * Only Pro and Enterprise can reassign (team features).
 */
export async function canReassignOwner(organizationId: string): Promise<{
    allowed: boolean;
    planRequired: string;
}> {
    const entitlements = await getEntitlements(organizationId);

    // Only Pro and Enterprise can reassign owners
    const teamPlans = ["pro", "enterprise"];
    const allowed = entitlements.tier === "paid" &&
        entitlements.planId !== null &&
        teamPlans.includes(entitlements.planId);

    return {
        allowed,
        planRequired: allowed ? "" : "Pro",
    };
}
