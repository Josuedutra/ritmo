/**
 * Organization Metrics Calculator
 *
 * Calculates daily metrics per organization for scoreboard and benchmarking.
 * Metrics are stored in OrgMetricsDaily table.
 *
 * Metrics calculated:
 * - sentCount: Quotes marked as sent on this day
 * - completedActions: CadenceEvents completed + Tasks completed
 * - totalActions: Total CadenceEvents + Tasks scheduled
 * - followUpRate: completedActions / totalActions * 100
 * - noResponseCount: Quotes "Sem resposta" (sent, no activity) > 24h
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { Prisma } from "@prisma/client";

/**
 * Calculate and store metrics for a specific organization and date.
 */
export async function calculateOrgMetricsForDate(
    organizationId: string,
    date: Date
): Promise<void> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    try {
        // 1. Sent count: quotes where sentAt is within this day
        const sentCount = await prisma.quote.count({
            where: {
                organizationId,
                sentAt: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
        });

        // 2. Completed cadence events on this day
        const completedCadenceEvents = await prisma.cadenceEvent.count({
            where: {
                organizationId,
                status: { in: ["completed", "sent"] },
                processedAt: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
        });

        // 3. Completed tasks on this day
        const completedTasks = await prisma.task.count({
            where: {
                organizationId,
                status: "completed",
                completedAt: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
        });

        // 4. Total cadence events scheduled for this day
        const totalCadenceEvents = await prisma.cadenceEvent.count({
            where: {
                organizationId,
                scheduledFor: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
        });

        // 5. Total tasks due on this day
        const totalTasks = await prisma.task.count({
            where: {
                organizationId,
                dueAt: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
        });

        // Calculate totals
        const completedActions = completedCadenceEvents + completedTasks;
        const totalActions = totalCadenceEvents + totalTasks;
        const followUpRate = totalActions > 0
            ? (completedActions / totalActions) * 100
            : 0;

        // 6. No response count: quotes sent > 24h ago still in "sent" status
        // These are quotes waiting for response with no status change
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        const noResponseCount = await prisma.quote.count({
            where: {
                organizationId,
                businessStatus: "sent",
                sentAt: {
                    lt: twentyFourHoursAgo,
                },
            },
        });

        // Upsert metrics for this org/date
        await prisma.orgMetricsDaily.upsert({
            where: {
                organizationId_date: {
                    organizationId,
                    date: startOfDay,
                },
            },
            update: {
                sentCount,
                completedActions,
                totalActions,
                followUpRate: new Prisma.Decimal(followUpRate.toFixed(2)),
                noResponseCount,
            },
            create: {
                organizationId,
                date: startOfDay,
                sentCount,
                completedActions,
                totalActions,
                followUpRate: new Prisma.Decimal(followUpRate.toFixed(2)),
                noResponseCount,
            },
        });

        logger.debug(
            { organizationId, date: startOfDay.toISOString(), sentCount, completedActions, totalActions },
            "Org metrics calculated"
        );
    } catch (error) {
        logger.error({ error, organizationId, date }, "Failed to calculate org metrics");
        throw error;
    }
}

/**
 * Calculate metrics for all organizations for a specific date.
 * Called by cron job.
 */
export async function calculateAllOrgMetricsForDate(date: Date): Promise<{
    processed: number;
    errors: number;
}> {
    const organizations = await prisma.organization.findMany({
        select: { id: true },
    });

    let processed = 0;
    let errors = 0;

    for (const org of organizations) {
        try {
            await calculateOrgMetricsForDate(org.id, date);
            processed++;
        } catch {
            errors++;
        }
    }

    logger.info(
        { date: date.toISOString(), processed, errors },
        "All org metrics calculated"
    );

    return { processed, errors };
}

/**
 * Get scoreboard data for an organization (last 30 days).
 */
export async function getScoreboardData(organizationId: string): Promise<{
    sentCount: number;
    completedActions: number;
    followUpRate: number;
    noResponseCount: number;
    dailyMetrics: Array<{
        date: string;
        sentCount: number;
        completedActions: number;
        followUpRate: number;
    }>;
}> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // Get daily metrics
    const dailyMetrics = await prisma.orgMetricsDaily.findMany({
        where: {
            organizationId,
            date: { gte: thirtyDaysAgo },
        },
        orderBy: { date: "asc" },
    });

    // Calculate totals
    const totals = dailyMetrics.reduce(
        (acc, m) => ({
            sentCount: acc.sentCount + m.sentCount,
            completedActions: acc.completedActions + m.completedActions,
            totalActions: acc.totalActions + m.totalActions,
        }),
        { sentCount: 0, completedActions: 0, totalActions: 0 }
    );

    const overallFollowUpRate = totals.totalActions > 0
        ? (totals.completedActions / totals.totalActions) * 100
        : 0;

    // Get current no response count (real-time)
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const noResponseCount = await prisma.quote.count({
        where: {
            organizationId,
            businessStatus: "sent",
            sentAt: { lt: twentyFourHoursAgo },
        },
    });

    return {
        sentCount: totals.sentCount,
        completedActions: totals.completedActions,
        followUpRate: Math.round(overallFollowUpRate * 10) / 10,
        noResponseCount,
        dailyMetrics: dailyMetrics.map((m) => ({
            date: m.date.toISOString().split("T")[0],
            sentCount: m.sentCount,
            completedActions: m.completedActions,
            followUpRate: Number(m.followUpRate),
        })),
    };
}

/**
 * Get benchmark data comparing an organization with peers in same sector.
 * Returns percentiles P50, P75, P90 for each metric.
 */
export async function getBenchmarkData(
    organizationId: string
): Promise<{
    sector: string | null;
    sampleSize: number;
    hasEnoughData: boolean;
    metrics: {
        sentCount: { value: number; p50: number; p75: number; p90: number };
        completedActions: { value: number; p50: number; p75: number; p90: number };
        followUpRate: { value: number; p50: number; p75: number; p90: number };
    } | null;
} | null> {
    // Get org's sector
    const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { sector: true },
    });

    if (!org?.sector) {
        return {
            sector: null,
            sampleSize: 0,
            hasEnoughData: false,
            metrics: null,
        };
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // Get all orgs in same sector with metrics
    const peerOrgs = await prisma.organization.findMany({
        where: { sector: org.sector },
        select: { id: true },
    });

    const peerOrgIds = peerOrgs.map((o) => o.id);

    // Get aggregated metrics per org
    const peerMetrics = await prisma.orgMetricsDaily.groupBy({
        by: ["organizationId"],
        where: {
            organizationId: { in: peerOrgIds },
            date: { gte: thirtyDaysAgo },
        },
        _sum: {
            sentCount: true,
            completedActions: true,
            totalActions: true,
        },
    });

    // Calculate follow-up rate for each peer
    const peerData = peerMetrics.map((p) => ({
        organizationId: p.organizationId,
        sentCount: p._sum.sentCount || 0,
        completedActions: p._sum.completedActions || 0,
        totalActions: p._sum.totalActions || 0,
        followUpRate: (p._sum.totalActions || 0) > 0
            ? ((p._sum.completedActions || 0) / (p._sum.totalActions || 0)) * 100
            : 0,
    }));

    // Minimum sample size for valid benchmark
    const MIN_SAMPLE_SIZE = 10;
    const hasEnoughData = peerData.length >= MIN_SAMPLE_SIZE;

    if (!hasEnoughData) {
        return {
            sector: org.sector,
            sampleSize: peerData.length,
            hasEnoughData: false,
            metrics: null,
        };
    }

    // Find this org's data
    const myData = peerData.find((p) => p.organizationId === organizationId);
    if (!myData) {
        // Org has no metrics yet
        return {
            sector: org.sector,
            sampleSize: peerData.length,
            hasEnoughData: true,
            metrics: null,
        };
    }

    // Calculate percentiles
    const calculatePercentile = (values: number[], p: number): number => {
        const sorted = [...values].sort((a, b) => a - b);
        const idx = Math.ceil((p / 100) * sorted.length) - 1;
        return sorted[Math.max(0, idx)];
    };

    const sentCounts = peerData.map((p) => p.sentCount);
    const completedActions = peerData.map((p) => p.completedActions);
    const followUpRates = peerData.map((p) => p.followUpRate);

    return {
        sector: org.sector,
        sampleSize: peerData.length,
        hasEnoughData: true,
        metrics: {
            sentCount: {
                value: myData.sentCount,
                p50: calculatePercentile(sentCounts, 50),
                p75: calculatePercentile(sentCounts, 75),
                p90: calculatePercentile(sentCounts, 90),
            },
            completedActions: {
                value: myData.completedActions,
                p50: calculatePercentile(completedActions, 50),
                p75: calculatePercentile(completedActions, 75),
                p90: calculatePercentile(completedActions, 90),
            },
            followUpRate: {
                value: Math.round(myData.followUpRate * 10) / 10,
                p50: Math.round(calculatePercentile(followUpRates, 50) * 10) / 10,
                p75: Math.round(calculatePercentile(followUpRates, 75) * 10) / 10,
                p90: Math.round(calculatePercentile(followUpRates, 90) * 10) / 10,
            },
        },
    };
}
