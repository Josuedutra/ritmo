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

// Trial "aha moment" limits
export const TRIAL_BCC_INBOUND_LIMIT = 1; // 1 BCC capture for "aha moment"

// Plan limits (single source of truth for UI consistency)
// Storage quotas and retention aligned with P0-STO-FIX-01 decisions
export const PLAN_LIMITS = {
    free: { monthlyQuotes: 5, maxUsers: 1, price: 0, storageQuotaBytes: 100 * 1024 * 1024, retentionDays: 30 }, // 100 MB, 30 days
    starter: { monthlyQuotes: 80, maxUsers: 2, price: 3900, storageQuotaBytes: 5 * 1024 * 1024 * 1024, retentionDays: 180 }, // 5 GB, 180 days
    pro: { monthlyQuotes: 250, maxUsers: 5, price: 9900, storageQuotaBytes: 20 * 1024 * 1024 * 1024, retentionDays: 365 }, // 20 GB, 365 days
    enterprise: { monthlyQuotes: 1000, maxUsers: 999, price: 0, storageQuotaBytes: 50 * 1024 * 1024 * 1024, retentionDays: 730 }, // 50 GB, 2 years
} as const;

// Storage constants
export const MAX_ATTACHMENT_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
export const ALLOWED_MIME_TYPES = ["application/pdf"] as const;

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

    // Storage limits (P0)
    storageQuotaBytes: number;
    storageUsedBytes: number;
    storageRemainingBytes: number;
    retentionDays: number;

    // Trial-specific
    trialActive: boolean;
    trialEndsAt: Date | null;
    trialDaysRemaining: number | null;

    // Feature flags
    autoEmailEnabled: boolean;
    bccInboundEnabled: boolean;
    scoreboardEnabled: boolean;

    // Trial BCC inbound limits
    trialBccCapturesUsed: number;
    trialBccCapturesRemaining: number;
    trialBccCaptureLimit: number;

    // Aha moment flags
    ahaFirstBccCapture: boolean;

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
    trialBccCaptures: number;
    autoEmailEnabled: boolean;
    bccInboundEnabled: boolean;
    ahaFirstBccCapture: boolean;
    storageUsedBytes: bigint;
    storageQuotaBytes: bigint;
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
            trialBccCaptures: true,
            autoEmailEnabled: true,
            bccInboundEnabled: true,
            ahaFirstBccCapture: true,
            storageUsedBytes: true,
            storageQuotaBytes: true,
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
    let scoreboardEnabled: boolean;
    let storageQuotaBytes: number;
    let retentionDays: number;
    let trialBccCaptureLimit: number;

    if (hasActiveSubscription) {
        // Paid tier - use subscription limits
        tier = "paid";
        effectivePlanLimit = subscription.plan?.monthlyQuoteLimit ?? subscription.quotesLimit;
        quotesUsed = periodQuotesSent;
        planName = subscription.plan?.name ?? "Pago";
        planId = subscription.plan?.id ?? subscription.planId;
        maxUsers = subscription.plan?.maxUsers ?? 1;
        // Paid plans get all features
        autoEmailEnabled = true;
        bccInboundEnabled = true;
        scoreboardEnabled = true;
        // Storage limits based on plan
        const planKey = (planId as keyof typeof PLAN_LIMITS) ?? "starter";
        storageQuotaBytes = PLAN_LIMITS[planKey]?.storageQuotaBytes ?? PLAN_LIMITS.starter.storageQuotaBytes;
        retentionDays = PLAN_LIMITS[planKey]?.retentionDays ?? PLAN_LIMITS.starter.retentionDays;
        trialBccCaptureLimit = 0; // Unlimited for paid
    } else if (trialActive) {
        // Trial tier - use trial limits (same as starter for storage)
        tier = "trial";
        effectivePlanLimit = org.trialSentLimit;
        quotesUsed = org.trialSentUsed;
        planName = "Trial";
        planId = null;
        maxUsers = TRIAL_MAX_USERS;
        // Trial gets automation features + scoreboard
        autoEmailEnabled = true;
        bccInboundEnabled = true;
        scoreboardEnabled = true; // Scoreboard ON for trial
        // Trial gets starter-level storage
        storageQuotaBytes = PLAN_LIMITS.starter.storageQuotaBytes;
        retentionDays = PLAN_LIMITS.starter.retentionDays;
        trialBccCaptureLimit = TRIAL_BCC_INBOUND_LIMIT; // 1 capture for aha moment
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
        scoreboardEnabled = false; // Scoreboard OFF for free (teaser only)
        // Free tier storage limits
        storageQuotaBytes = PLAN_LIMITS.free.storageQuotaBytes;
        retentionDays = PLAN_LIMITS.free.retentionDays;
        trialBccCaptureLimit = 0; // No BCC for free
    }

    // Trial BCC captures calculations
    const trialBccCapturesUsed = org.trialBccCaptures;
    const trialBccCapturesRemaining = tier === "trial"
        ? Math.max(0, trialBccCaptureLimit - trialBccCapturesUsed)
        : (tier === "paid" ? Infinity : 0);

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

    // Storage calculations
    const storageUsedBytes = Number(org.storageUsedBytes);
    const storageRemainingBytes = Math.max(0, storageQuotaBytes - storageUsedBytes);

    return {
        tier,
        planName,
        planId,
        effectivePlanLimit,
        quotesUsed,
        quotesRemaining,
        maxUsers,
        storageQuotaBytes,
        storageUsedBytes,
        storageRemainingBytes,
        retentionDays,
        trialActive,
        trialEndsAt: org.trialEndsAt,
        trialDaysRemaining,
        autoEmailEnabled,
        bccInboundEnabled,
        scoreboardEnabled,
        trialBccCapturesUsed,
        trialBccCapturesRemaining: tier === "paid" ? 999 : trialBccCapturesRemaining,
        trialBccCaptureLimit,
        ahaFirstBccCapture: org.ahaFirstBccCapture,
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
        storageQuotaBytes: PLAN_LIMITS.free.storageQuotaBytes,
        storageUsedBytes: 0,
        storageRemainingBytes: PLAN_LIMITS.free.storageQuotaBytes,
        retentionDays: PLAN_LIMITS.free.retentionDays,
        trialActive: false,
        trialEndsAt: null,
        trialDaysRemaining: null,
        autoEmailEnabled: false,
        bccInboundEnabled: false,
        scoreboardEnabled: false,
        trialBccCapturesUsed: 0,
        trialBccCapturesRemaining: 0,
        trialBccCaptureLimit: 0,
        ahaFirstBccCapture: false,
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
 * Check if trial can use BCC inbound capture.
 * Trial gets 1 capture for "aha moment".
 * Returns: { allowed, isFirstCapture, reason }
 */
export async function checkTrialBccCapture(organizationId: string): Promise<{
    allowed: boolean;
    isFirstCapture: boolean;
    reason?: "TRIAL_LIMIT_REACHED" | "FREE_TIER" | "OK";
    message?: string;
}> {
    const entitlements = await getEntitlements(organizationId);

    // Paid tier - always allowed (unlimited)
    if (entitlements.tier === "paid") {
        return { allowed: true, isFirstCapture: false, reason: "OK" };
    }

    // Free tier - never allowed
    if (entitlements.tier === "free") {
        return {
            allowed: false,
            isFirstCapture: false,
            reason: "FREE_TIER",
            message: "A captura automática de propostas está disponível apenas em planos pagos.",
        };
    }

    // Trial tier - check limit
    if (entitlements.trialBccCapturesUsed >= TRIAL_BCC_INBOUND_LIMIT) {
        return {
            allowed: false,
            isFirstCapture: false,
            reason: "TRIAL_LIMIT_REACHED",
            message: "Já utilizou a captura automática incluída no trial. Atualize para continuar a usar.",
        };
    }

    // First capture allowed
    return {
        allowed: true,
        isFirstCapture: entitlements.trialBccCapturesUsed === 0,
        reason: "OK",
    };
}

/**
 * Increment trial BCC capture counter and mark aha moment.
 * Called after successful BCC inbound processing during trial.
 */
export async function incrementTrialBccCapture(organizationId: string): Promise<{
    isFirstCapture: boolean;
}> {
    const org = await prisma.organization.update({
        where: { id: organizationId },
        data: {
            trialBccCaptures: { increment: 1 },
            ahaFirstBccCapture: true,
        },
        select: { trialBccCaptures: true },
    });

    return {
        isFirstCapture: org.trialBccCaptures === 1,
    };
}

/**
 * Check if organization can access the scoreboard feature.
 * Available for: Trial, Starter, Pro, Enterprise
 * Free tier: Shows teaser with upgrade CTA
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
        // Trial users have full scoreboard access (aha moment enabler)
        return { allowed: true, tier: "trial", showTeaser: false };
    }

    // Free tier - no access, show teaser
    return { allowed: false, tier: "free", showTeaser: true };
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

// ============================================================================
// STORAGE GUARDRAILS (P0)
// ============================================================================

export type StorageCheckResult = {
    allowed: true;
} | {
    allowed: false;
    reason: "SIZE_EXCEEDED" | "MIME_TYPE_REJECTED" | "QUOTA_EXCEEDED";
    message: string;
};

/**
 * Check if an attachment can be uploaded based on size, MIME type, and quota.
 * Used by Mailgun inbound webhook to gate uploads.
 *
 * Note: This performs a read-only check. For atomic quota reservation,
 * use checkAndReserveStorageQuota() instead.
 */
export async function checkStorageGates(
    organizationId: string,
    sizeBytes: number,
    mimeType: string
): Promise<StorageCheckResult> {
    // Gate 1: Size check (15 MB max)
    if (sizeBytes > MAX_ATTACHMENT_SIZE_BYTES) {
        return {
            allowed: false,
            reason: "SIZE_EXCEEDED",
            message: `Ficheiro excede o limite de ${MAX_ATTACHMENT_SIZE_BYTES / (1024 * 1024)} MB.`,
        };
    }

    // Gate 2: MIME type check (only PDF allowed)
    if (!ALLOWED_MIME_TYPES.includes(mimeType as typeof ALLOWED_MIME_TYPES[number])) {
        return {
            allowed: false,
            reason: "MIME_TYPE_REJECTED",
            message: `Tipo de ficheiro não suportado: ${mimeType}. Apenas PDF é permitido.`,
        };
    }

    // Gate 3: Quota check
    const entitlements = await getEntitlements(organizationId);
    if (entitlements.storageUsedBytes + sizeBytes > entitlements.storageQuotaBytes) {
        return {
            allowed: false,
            reason: "QUOTA_EXCEEDED",
            message: `Quota de armazenamento excedida. Limite: ${formatBytes(entitlements.storageQuotaBytes)}, Usado: ${formatBytes(entitlements.storageUsedBytes)}.`,
        };
    }

    return { allowed: true };
}

/**
 * V7: Atomically reserve storage quota using conditional UPDATE.
 *
 * Uses a conditional UPDATE that only succeeds if the quota won't be exceeded.
 * This is race-condition-safe: concurrent uploads will be properly serialized
 * by the database, and only requests that fit within quota will succeed.
 *
 * Returns { reserved: true, rollback } if reservation succeeded.
 * Call rollback() if the upload fails to release the reserved space.
 *
 * P0-V7: Race condition fix - uses conditional update pattern
 */
export async function reserveStorageQuota(
    organizationId: string,
    sizeBytes: number
): Promise<
    | { reserved: true; rollback: () => Promise<void> }
    | { reserved: false; reason: "QUOTA_EXCEEDED" | "ORG_NOT_FOUND"; currentUsed: number; quota: number }
> {
    try {
        // Use raw query for conditional update that's race-condition safe
        // This atomically checks AND updates in a single operation
        const result = await prisma.$executeRaw`
            UPDATE "Organization"
            SET "storageUsedBytes" = "storageUsedBytes" + ${BigInt(sizeBytes)}
            WHERE id = ${organizationId}
            AND "storageUsedBytes" + ${BigInt(sizeBytes)} <= "storageQuotaBytes"
        `;

        if (result === 0) {
            // No rows updated - either org doesn't exist or quota would be exceeded
            const org = await prisma.organization.findUnique({
                where: { id: organizationId },
                select: { storageUsedBytes: true, storageQuotaBytes: true },
            });

            if (!org) {
                return {
                    reserved: false,
                    reason: "ORG_NOT_FOUND",
                    currentUsed: 0,
                    quota: 0,
                };
            }

            return {
                reserved: false,
                reason: "QUOTA_EXCEEDED",
                currentUsed: Number(org.storageUsedBytes),
                quota: Number(org.storageQuotaBytes),
            };
        }

        // Reservation successful - return with rollback function
        return {
            reserved: true,
            rollback: async () => {
                await prisma.$executeRaw`
                    UPDATE "Organization"
                    SET "storageUsedBytes" = GREATEST(0, "storageUsedBytes" - ${BigInt(sizeBytes)})
                    WHERE id = ${organizationId}
                `;
            },
        };
    } catch (error) {
        // If query failed, check org status
        const org = await prisma.organization.findUnique({
            where: { id: organizationId },
            select: { storageUsedBytes: true, storageQuotaBytes: true },
        });

        return {
            reserved: false,
            reason: org ? "QUOTA_EXCEEDED" : "ORG_NOT_FOUND",
            currentUsed: org ? Number(org.storageUsedBytes) : 0,
            quota: org ? Number(org.storageQuotaBytes) : 0,
        };
    }
}

/**
 * V7: Full storage gates check with atomic quota reservation.
 *
 * Checks size, MIME type, and atomically reserves quota if all gates pass.
 * This replaces the old checkStorageGates + incrementStorageUsage pattern.
 *
 * P0-V7: Race condition fix
 */
export async function checkAndReserveStorageQuota(
    organizationId: string,
    sizeBytes: number,
    mimeType: string
): Promise<
    | { allowed: true; rollback: () => Promise<void> }
    | { allowed: false; reason: "SIZE_EXCEEDED" | "MIME_TYPE_REJECTED" | "QUOTA_EXCEEDED"; message: string }
> {
    // Gate 1: Size check (15 MB max) - no DB needed
    if (sizeBytes > MAX_ATTACHMENT_SIZE_BYTES) {
        return {
            allowed: false,
            reason: "SIZE_EXCEEDED",
            message: `Ficheiro excede o limite de ${MAX_ATTACHMENT_SIZE_BYTES / (1024 * 1024)} MB.`,
        };
    }

    // Gate 2: MIME type check - no DB needed
    if (!ALLOWED_MIME_TYPES.includes(mimeType as typeof ALLOWED_MIME_TYPES[number])) {
        return {
            allowed: false,
            reason: "MIME_TYPE_REJECTED",
            message: `Tipo de ficheiro não suportado: ${mimeType}. Apenas PDF é permitido.`,
        };
    }

    // Gate 3: Atomic quota reservation (V7 - race-condition safe)
    const reservation = await reserveStorageQuota(organizationId, sizeBytes);

    if (!reservation.reserved) {
        return {
            allowed: false,
            reason: "QUOTA_EXCEEDED",
            message: `Quota de armazenamento excedida. Limite: ${formatBytes(reservation.quota)}, Usado: ${formatBytes(reservation.currentUsed)}.`,
        };
    }

    return {
        allowed: true,
        rollback: reservation.rollback,
    };
}

/**
 * Get retention policy for an organization based on their plan.
 */
export async function getRetentionPolicy(organizationId: string): Promise<{
    retentionDays: number;
    expiresAt: Date;
}> {
    const entitlements = await getEntitlements(organizationId);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + entitlements.retentionDays);

    return {
        retentionDays: entitlements.retentionDays,
        expiresAt,
    };
}

/**
 * Increment organization storage usage after a successful upload.
 */
export async function incrementStorageUsage(organizationId: string, sizeBytes: number): Promise<void> {
    await prisma.organization.update({
        where: { id: organizationId },
        data: {
            storageUsedBytes: { increment: sizeBytes },
        },
    });
}

/**
 * Decrement organization storage usage after file deletion.
 * P0-V9: Uses GREATEST(0, ...) to prevent negative values.
 */
export async function decrementStorageUsage(organizationId: string, sizeBytes: number): Promise<void> {
    // Use raw query to ensure storageUsedBytes never goes negative
    await prisma.$executeRaw`
        UPDATE "Organization"
        SET "storageUsedBytes" = GREATEST(0, "storageUsedBytes" - ${BigInt(sizeBytes)})
        WHERE id = ${organizationId}
    `;
}

/**
 * P0-MC-01: Sync Organization.storageQuotaBytes with plan entitlements.
 *
 * Call this after any subscription/plan change to ensure the atomic
 * quota reservation (V7) uses the correct quota value.
 *
 * @returns The new storage quota in bytes
 */
export async function syncStorageQuota(organizationId: string): Promise<number> {
    const entitlements = await getEntitlements(organizationId);

    await prisma.organization.update({
        where: { id: organizationId },
        data: {
            storageQuotaBytes: BigInt(entitlements.storageQuotaBytes),
        },
    });

    return entitlements.storageQuotaBytes;
}

/**
 * P0-MC-01: Get storage quota for a specific plan.
 * Used by Stripe webhook to sync quota before getEntitlements has updated data.
 */
export function getStorageQuotaForPlan(planId: string | null): number {
    if (!planId) {
        return PLAN_LIMITS.free.storageQuotaBytes;
    }

    const plan = PLAN_LIMITS[planId as keyof typeof PLAN_LIMITS];
    return plan?.storageQuotaBytes ?? PLAN_LIMITS.starter.storageQuotaBytes;
}

/**
 * Format bytes to human-readable string.
 */
function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
