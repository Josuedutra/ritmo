import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";
import {
    getApiSession,
    unauthorized,
    serverError,
    success,
} from "@/lib/api-utils";

/**
 * GET /api/dashboard/stats
 *
 * Get dashboard statistics for the current organization
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const orgId = session.user.organizationId;

        // Get organization timezone
        const org = await prisma.organization.findUnique({
            where: { id: orgId },
            select: { timezone: true },
        });

        const timezone = org?.timezone || "Europe/Lisbon";

        // Calculate date boundaries
        const nowInTz = toZonedTime(new Date(), timezone);
        const todayStart = fromZonedTime(startOfDay(nowInTz), timezone);
        const todayEnd = fromZonedTime(endOfDay(nowInTz), timezone);
        const monthStart = fromZonedTime(startOfMonth(nowInTz), timezone);
        const monthEnd = fromZonedTime(endOfMonth(nowInTz), timezone);

        // Run all queries in parallel
        const [
            actionsToday,
            quotesSentThisMonth,
            pendingQuotes,
            pipelineValue,
            noResponseCount,
            usageCounter,
            subscription,
        ] = await Promise.all([
            // Actions scheduled for today (pending cadence events + tasks)
            Promise.all([
                prisma.cadenceEvent.count({
                    where: {
                        organizationId: orgId,
                        scheduledFor: { gte: todayStart, lte: todayEnd },
                        status: { in: ["scheduled", "claimed"] },
                    },
                }),
                prisma.task.count({
                    where: {
                        organizationId: orgId,
                        dueAt: { gte: todayStart, lte: todayEnd },
                        status: "pending",
                    },
                }),
            ]).then(([events, tasks]) => events + tasks),

            // Quotes sent this month (first-time sends only)
            prisma.quote.count({
                where: {
                    organizationId: orgId,
                    firstSentAt: { gte: monthStart, lte: monthEnd },
                },
            }),

            // Pending responses (sent quotes without response)
            prisma.quote.count({
                where: {
                    organizationId: orgId,
                    businessStatus: "sent",
                },
            }),

            // Pipeline value (sum of sent + negotiation quotes)
            prisma.quote.aggregate({
                where: {
                    organizationId: orgId,
                    businessStatus: { in: ["sent", "negotiation"] },
                },
                _sum: { value: true },
            }),

            // No response count (completed cadence, still sent)
            prisma.quote.count({
                where: {
                    organizationId: orgId,
                    businessStatus: "sent",
                    OR: [
                        { ritmoStage: "completed" },
                        {
                            cadenceEvents: {
                                none: { status: "scheduled" },
                            },
                        },
                    ],
                },
            }),

            // Current usage
            prisma.usageCounter.findFirst({
                where: {
                    organizationId: orgId,
                    periodStart: { lte: new Date() },
                    periodEnd: { gte: new Date() },
                },
            }),

            // Subscription info
            prisma.subscription.findUnique({
                where: { organizationId: orgId },
            }),
        ]);

        const quotesLimit = subscription?.quotesLimit ?? 5;
        const quotesSent = usageCounter?.quotesSent ?? 0;

        return success({
            actionsToday,
            quotesSent: quotesSentThisMonth,
            pendingResponses: pendingQuotes,
            pipelineValue: pipelineValue._sum.value?.toNumber() ?? 0,
            noResponseCount,
            usage: {
                quotesSent,
                quotesLimit,
                percentage: Math.min(100, Math.round((quotesSent / quotesLimit) * 100)),
            },
            plan: subscription?.planId ?? "free",
        });
    } catch (error) {
        return serverError(error, "GET /api/dashboard/stats");
    }
}
