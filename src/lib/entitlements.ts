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

// Constants
export const FREE_TIER_LIMIT = 5;
export const TRIAL_LIMIT = 20;
export const TRIAL_DURATION_DAYS = 14;
export const MAX_RESENDS_PER_MONTH = 2;

export interface Entitlements {
    // Tier info
    tier: "trial" | "free" | "paid";
    planName: string;

    // Limits
    effectivePlanLimit: number;
    quotesUsed: number;
    quotesRemaining: number;

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
        plan: {
            name: string;
            monthlyQuoteLimit: number;
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
                            name: true,
                            monthlyQuoteLimit: true,
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
    let autoEmailEnabled: boolean;
    let bccInboundEnabled: boolean;

    if (hasActiveSubscription) {
        // Paid tier - use subscription limits
        tier = "paid";
        effectivePlanLimit = subscription.plan?.monthlyQuoteLimit ?? subscription.quotesLimit;
        quotesUsed = periodQuotesSent;
        planName = subscription.plan?.name ?? "Pago";
        // Paid plans get automation features
        autoEmailEnabled = true;
        bccInboundEnabled = true;
    } else if (trialActive) {
        // Trial tier - use trial limits
        tier = "trial";
        effectivePlanLimit = org.trialSentLimit;
        quotesUsed = org.trialSentUsed;
        planName = "Trial";
        // Trial gets automation features
        autoEmailEnabled = true;
        bccInboundEnabled = true;
    } else {
        // Free tier - limited, no automation
        tier = "free";
        effectivePlanLimit = FREE_TIER_LIMIT;
        quotesUsed = periodQuotesSent;
        planName = "Gratuito";
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
        effectivePlanLimit,
        quotesUsed,
        quotesRemaining,
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
            message: "A sua subscrição foi cancelada. Reative para continuar a enviar orçamentos.",
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
                message: `Atingiu o limite de ${effectivePlanLimit} orçamentos do trial. Escolha um plano para continuar.`,
                ctaAction: "start_subscription",
                ctaUrl: "/settings/billing",
            };
        }

        if (tier === "free") {
            return {
                allowed: false,
                reason: "LIMIT_EXCEEDED",
                message: `Atingiu o limite de ${effectivePlanLimit} orçamentos do plano gratuito. Atualize para enviar mais.`,
                ctaAction: "upgrade_plan",
                ctaUrl: "/settings/billing",
            };
        }

        // Paid tier
        return {
            allowed: false,
            reason: "LIMIT_EXCEEDED",
            message: `Atingiu o limite de ${effectivePlanLimit} orçamentos do plano ${planName}. Atualize o seu plano para continuar.`,
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
        effectivePlanLimit: FREE_TIER_LIMIT,
        quotesUsed: 0,
        quotesRemaining: FREE_TIER_LIMIT,
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
