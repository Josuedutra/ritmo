import { NextRequest } from "next/server";
import {
    getApiSession,
    unauthorized,
    forbidden,
    serverError,
    success,
} from "@/lib/api-utils";
import { getScoreboardData } from "@/lib/org-metrics";
import { canAccessScoreboard } from "@/lib/entitlements";

/**
 * GET /api/dashboard/scoreboard
 *
 * Get scoreboard metrics for the current organization.
 * Shows 30-day performance data.
 *
 * Access:
 * - Paid plans (Starter, Pro, Enterprise): Full access
 * - Trial: Teaser view (no data, upgrade CTA)
 * - Free: No access
 *
 * Returns:
 * - sentCount: Total quotes sent in 30 days
 * - completedActions: Total actions completed in 30 days
 * - followUpRate: % of scheduled actions completed
 * - noResponseCount: Quotes > 24h without response (aging)
 * - dailyMetrics: Daily breakdown for charts
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const orgId = session.user.organizationId;

        // Check access
        const access = await canAccessScoreboard(orgId);

        if (!access.allowed) {
            if (access.showTeaser) {
                // Trial users get teaser response
                return success({
                    access: "teaser",
                    tier: access.tier,
                    message: "O Scoreboard completo está disponível nos planos pagos.",
                    upgradeUrl: "/settings/billing",
                    // Sample/placeholder data for teaser
                    preview: {
                        sentCount: "—",
                        completedActions: "—",
                        followUpRate: "—",
                        noResponseCount: "—",
                    },
                });
            }

            // Free tier - no access
            return forbidden("O Scoreboard está disponível apenas nos planos Starter e superiores.");
        }

        // Get actual scoreboard data
        const data = await getScoreboardData(orgId);

        return success({
            access: "full",
            tier: access.tier,
            data: {
                sentCount: data.sentCount,
                completedActions: data.completedActions,
                followUpRate: data.followUpRate,
                noResponseCount: data.noResponseCount,
                dailyMetrics: data.dailyMetrics,
            },
        });
    } catch (error) {
        return serverError(error, "GET /api/dashboard/scoreboard");
    }
}
