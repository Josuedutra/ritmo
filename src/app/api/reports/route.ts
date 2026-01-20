import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
    getApiSession,
    unauthorized,
    forbidden,
    serverError,
    success,
} from "@/lib/api-utils";
import { canAccessReports } from "@/lib/entitlements";

/**
 * GET /api/reports
 *
 * Get reports data for the organization.
 * Pro/Enterprise only.
 *
 * Returns 30-day KPIs:
 * - sentCount: Quotes marked as sent
 * - completedActions: CadenceEvents completed + Tasks completed
 * - followUpRate: completedActions / totalActions * 100
 * - noResponseCount: Quotes "sent" status > 24h (aging)
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const orgId = session.user.organizationId;

        // Check access
        const access = await canAccessReports(orgId);
        if (!access.allowed) {
            return forbidden(
                `Relatórios disponíveis apenas no plano ${access.planRequired}. Atualize para ver métricas detalhadas.`
            );
        }

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        // Get all metrics in parallel
        const [
            sentCount,
            completedCadenceEvents,
            totalCadenceEvents,
            completedTasks,
            totalTasks,
            noResponseCount,
            dailySent,
            dailyCompleted,
        ] = await Promise.all([
            // 1. Quotes sent in last 30 days
            prisma.quote.count({
                where: {
                    organizationId: orgId,
                    sentAt: { gte: thirtyDaysAgo },
                },
            }),

            // 2. Completed cadence events in last 30 days
            prisma.cadenceEvent.count({
                where: {
                    organizationId: orgId,
                    status: { in: ["completed", "sent"] },
                    processedAt: { gte: thirtyDaysAgo },
                },
            }),

            // 3. Total cadence events scheduled in last 30 days
            prisma.cadenceEvent.count({
                where: {
                    organizationId: orgId,
                    scheduledFor: { gte: thirtyDaysAgo },
                },
            }),

            // 4. Completed tasks in last 30 days
            prisma.task.count({
                where: {
                    organizationId: orgId,
                    status: "completed",
                    completedAt: { gte: thirtyDaysAgo },
                },
            }),

            // 5. Total tasks in last 30 days
            prisma.task.count({
                where: {
                    organizationId: orgId,
                    createdAt: { gte: thirtyDaysAgo },
                },
            }),

            // 6. Quotes "sent" > 24h (aging/no response)
            prisma.quote.count({
                where: {
                    organizationId: orgId,
                    businessStatus: "sent",
                    sentAt: { lt: twentyFourHoursAgo },
                },
            }),

            // 7. Daily sent breakdown (for chart)
            prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
                SELECT DATE(sent_at) as date, COUNT(*) as count
                FROM quotes
                WHERE organization_id = ${orgId}
                  AND sent_at >= ${thirtyDaysAgo}
                GROUP BY DATE(sent_at)
                ORDER BY date ASC
            `,

            // 8. Daily completed actions breakdown
            prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
                SELECT DATE(processed_at) as date, COUNT(*) as count
                FROM cadence_events
                WHERE organization_id = ${orgId}
                  AND status IN ('completed', 'sent')
                  AND processed_at >= ${thirtyDaysAgo}
                GROUP BY DATE(processed_at)
                ORDER BY date ASC
            `,
        ]);

        // Calculate follow-up rate
        const totalActions = totalCadenceEvents + totalTasks;
        const completedActions = completedCadenceEvents + completedTasks;
        const followUpRate = totalActions > 0
            ? Math.round((completedActions / totalActions) * 1000) / 10
            : 0;

        // Format daily data
        const formatDailySeries = (data: Array<{ date: Date; count: bigint }>) => {
            return data.map((d) => ({
                date: d.date.toISOString().split("T")[0],
                count: Number(d.count),
            }));
        };

        return success({
            period: {
                start: thirtyDaysAgo.toISOString(),
                end: new Date().toISOString(),
                days: 30,
            },
            kpis: {
                sentCount,
                completedActions,
                followUpRate,
                noResponseCount,
            },
            breakdown: {
                cadenceEventsCompleted: completedCadenceEvents,
                cadenceEventsTotal: totalCadenceEvents,
                tasksCompleted: completedTasks,
                tasksTotal: totalTasks,
            },
            series: {
                dailySent: formatDailySeries(dailySent),
                dailyCompleted: formatDailySeries(dailyCompleted),
            },
        });
    } catch (error) {
        return serverError(error, "GET /api/reports");
    }
}
