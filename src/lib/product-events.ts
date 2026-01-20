/**
 * Product Events Tracking
 *
 * Server-side event tracking for internal metrics.
 * Used to measure activation, retention, and Time-to-Aha.
 *
 * Events tracked:
 * - signup_completed: User completes signup
 * - onboarding_started: User starts onboarding flow
 * - onboarding_completed: User completes onboarding
 * - quote_new_opened: User opens new quote form
 * - quote_created: User creates a quote (draft)
 * - mark_sent_clicked: User clicks mark as sent button
 * - mark_sent_success: Quote marked as sent, cadence created (AHA MOMENT)
 * - second_mark_sent_success: Org reaches 2nd sent quote (retention signal)
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { Prisma } from "@prisma/client";

// Event names as constants for type safety
export const ProductEventNames = {
    SIGNUP_COMPLETED: "signup_completed",
    ONBOARDING_STARTED: "onboarding_started",
    ONBOARDING_COMPLETED: "onboarding_completed",
    QUOTE_NEW_OPENED: "quote_new_opened",
    QUOTE_CREATED: "quote_created",
    MARK_SENT_CLICKED: "mark_sent_clicked",
    MARK_SENT_SUCCESS: "mark_sent_success",
    SECOND_MARK_SENT_SUCCESS: "second_mark_sent_success",
    // Patch F: Seed example tracking
    SEED_EXAMPLE_CREATED: "seed_example_created",
    // UI click tracking (optional, for clicks-to-aha)
    UI_CLICK: "ui_click",
    // Referral tracking
    REFERRAL_FIRST_TOUCH: "referral_first_touch",
    REFERRAL_CAPTURED: "referral_captured",
    REFERRAL_ATTRIBUTED: "referral_attributed",
    REFERRAL_CONVERTED: "referral_converted",
    REFERRAL_COOKIE_REUSED: "referral_cookie_reused",
    REFERRAL_DISQUALIFIED: "referral_disqualified",
    REFERRAL_EXPIRED: "referral_expired",
    // OAuth security tracking
    OAUTH_EMAIL_NOT_VERIFIED: "oauth_email_not_verified",
} as const;

export type ProductEventName = (typeof ProductEventNames)[keyof typeof ProductEventNames];

interface TrackEventOptions {
    organizationId?: string | null;
    userId?: string | null;
    sessionId?: string | null;
    props?: Record<string, unknown>;
}

/**
 * Track a product event.
 * Non-blocking - errors are logged but don't break the main flow.
 */
export async function trackEvent(
    name: ProductEventName,
    options: TrackEventOptions = {}
): Promise<void> {
    const { organizationId, userId, sessionId, props } = options;

    try {
        await prisma.productEvent.create({
            data: {
                name,
                organizationId: organizationId ?? null,
                userId: userId ?? null,
                sessionId: sessionId ?? null,
                props: (props ?? {}) as Prisma.InputJsonValue,
            },
        });

        logger.debug({ event: name, organizationId, userId }, "Product event tracked");
    } catch (error) {
        // Log but don't throw - event tracking should never break the main flow
        logger.error({ error, event: name, organizationId }, "Failed to track product event");
    }
}

/**
 * Track the "Aha moment" - first quote marked as sent.
 * Also checks if this is the 2nd sent quote for retention tracking.
 * P0 Fix: Added isSeedExample prop for seed quote tracking.
 */
export async function trackAhaEvent(
    organizationId: string,
    userId: string,
    quoteId: string,
    cadenceEventsCreated: number = 4,
    isSeedExample: boolean = false
): Promise<void> {
    try {
        // Count how many quotes this org has sent (including this one)
        const sentCount = await prisma.quote.count({
            where: {
                organizationId,
                businessStatus: "sent",
            },
        });

        // Track the mark_sent_success event with isSeedExample prop
        await trackEvent(ProductEventNames.MARK_SENT_SUCCESS, {
            organizationId,
            userId,
            props: {
                quoteId,
                cadenceEventsCreated,
                sentCount,
                isSeedExample,
            },
        });

        // If this is exactly the 2nd sent quote, track retention event
        if (sentCount === 2) {
            await trackEvent(ProductEventNames.SECOND_MARK_SENT_SUCCESS, {
                organizationId,
                userId,
                props: {
                    quoteId,
                    isSeedExample,
                },
            });
        }
    } catch (error) {
        logger.error({ error, organizationId, quoteId }, "Failed to track Aha event");
    }
}

/**
 * Calculate metrics for a given time range.
 * Used by /api/admin/metrics endpoint.
 */
export async function calculateMetrics(
    startDate: Date,
    endDate: Date
): Promise<{
    signupsCount: number;
    ahaCount: number;
    activationRate5m: number;
    activationRate24h: number;
    medianTimeToAhaSeconds: number | null;
    retention7dSecondSendRate: number;
    dailySignups: Array<{ date: string; count: number }>;
    dailyAha: Array<{ date: string; count: number }>;
}> {
    // Get signups in range
    const signups = await prisma.productEvent.findMany({
        where: {
            name: ProductEventNames.SIGNUP_COMPLETED,
            createdAt: { gte: startDate, lte: endDate },
        },
        select: {
            organizationId: true,
            createdAt: true,
        },
    });

    const signupsCount = signups.length;

    // Get all Aha events (mark_sent_success) in range
    const ahaEvents = await prisma.productEvent.findMany({
        where: {
            name: ProductEventNames.MARK_SENT_SUCCESS,
            createdAt: { gte: startDate, lte: endDate },
        },
        select: {
            organizationId: true,
            createdAt: true,
            props: true,
        },
    });

    // Filter to first Aha per org (sentCount === 1 in props)
    const firstAhaEvents = ahaEvents.filter((e) => {
        const props = e.props as { sentCount?: number } | null;
        return props?.sentCount === 1;
    });

    const ahaCount = firstAhaEvents.length;

    // Calculate time-to-aha for each org
    const timeToAhaSeconds: number[] = [];
    const activatedWithin5m: string[] = [];
    const activatedWithin24h: string[] = [];

    for (const aha of firstAhaEvents) {
        if (!aha.organizationId) continue;

        // Find signup event for this org
        const signup = await prisma.productEvent.findFirst({
            where: {
                name: ProductEventNames.SIGNUP_COMPLETED,
                organizationId: aha.organizationId,
            },
            orderBy: { createdAt: "asc" },
        });

        if (signup) {
            const diffMs = aha.createdAt.getTime() - signup.createdAt.getTime();
            const diffSeconds = diffMs / 1000;
            timeToAhaSeconds.push(diffSeconds);

            if (diffSeconds <= 300) {
                // 5 minutes
                activatedWithin5m.push(aha.organizationId);
            }
            if (diffSeconds <= 86400) {
                // 24 hours
                activatedWithin24h.push(aha.organizationId);
            }
        }
    }

    // Calculate median time-to-aha
    let medianTimeToAhaSeconds: number | null = null;
    if (timeToAhaSeconds.length > 0) {
        const sorted = [...timeToAhaSeconds].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        medianTimeToAhaSeconds =
            sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    // Activation rates
    const activationRate5m = signupsCount > 0 ? (activatedWithin5m.length / signupsCount) * 100 : 0;
    const activationRate24h = signupsCount > 0 ? (activatedWithin24h.length / signupsCount) * 100 : 0;

    // Retention: % of orgs with Aha that sent 2nd quote within 7 days
    const secondSendEvents = await prisma.productEvent.findMany({
        where: {
            name: ProductEventNames.SECOND_MARK_SENT_SUCCESS,
            createdAt: { gte: startDate, lte: endDate },
        },
        select: {
            organizationId: true,
            createdAt: true,
        },
    });

    // Count orgs where 2nd send happened within 7 days of first Aha
    let retainedCount = 0;
    for (const secondSend of secondSendEvents) {
        if (!secondSend.organizationId) continue;

        const firstAha = firstAhaEvents.find((a) => a.organizationId === secondSend.organizationId);
        if (firstAha) {
            const diffDays =
                (secondSend.createdAt.getTime() - firstAha.createdAt.getTime()) / (1000 * 60 * 60 * 24);
            if (diffDays <= 7) {
                retainedCount++;
            }
        }
    }

    const retention7dSecondSendRate = ahaCount > 0 ? (retainedCount / ahaCount) * 100 : 0;

    // Daily aggregations
    const dailySignups = aggregateByDay(
        signups.map((s) => s.createdAt),
        startDate,
        endDate
    );
    const dailyAha = aggregateByDay(
        firstAhaEvents.map((a) => a.createdAt),
        startDate,
        endDate
    );

    return {
        signupsCount,
        ahaCount,
        activationRate5m,
        activationRate24h,
        medianTimeToAhaSeconds,
        retention7dSecondSendRate,
        dailySignups,
        dailyAha,
    };
}

/**
 * Aggregate events by day
 */
function aggregateByDay(
    dates: Date[],
    startDate: Date,
    endDate: Date
): Array<{ date: string; count: number }> {
    const counts: Record<string, number> = {};

    // Initialize all days in range with 0
    const current = new Date(startDate);
    while (current <= endDate) {
        const dateStr = current.toISOString().split("T")[0];
        counts[dateStr] = 0;
        current.setDate(current.getDate() + 1);
    }

    // Count events per day
    for (const date of dates) {
        const dateStr = date.toISOString().split("T")[0];
        if (counts[dateStr] !== undefined) {
            counts[dateStr]++;
        }
    }

    return Object.entries(counts)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
}
