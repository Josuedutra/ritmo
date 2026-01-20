/**
 * GET /api/admin/metrics
 *
 * Internal metrics dashboard for product analytics.
 * Protected by ADMIN_EMAILS environment variable.
 *
 * Query params:
 * - range: "7d" | "14d" | "30d" (default: "7d")
 *
 * Returns:
 * - signupsCount: Total signups in range
 * - ahaCount: First-time Aha events (first quote sent)
 * - activationRate5m: % of signups reaching Aha within 5 minutes
 * - activationRate24h: % of signups reaching Aha within 24 hours
 * - medianTimeToAhaSeconds: Median time from signup to Aha
 * - retention7dSecondSendRate: % of activated users who sent 2nd quote within 7 days
 * - dailySignups: Signups per day
 * - dailyAha: Aha events per day
 */

import { NextRequest } from "next/server";
import {
    getApiSession,
    unauthorized,
    serverError,
    success,
} from "@/lib/api-utils";
import { calculateMetrics } from "@/lib/product-events";

// SUPERADMIN emails from environment
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase());

export async function GET(request: NextRequest) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        // Check if user is SUPERADMIN
        const userEmail = session.user.email?.toLowerCase();
        if (!userEmail || !ADMIN_EMAILS.includes(userEmail)) {
            return unauthorized();
        }

        const { searchParams } = new URL(request.url);
        const range = searchParams.get("range") || "7d";

        // Calculate date range
        const endDate = new Date();
        let startDate: Date;

        switch (range) {
            case "14d":
                startDate = new Date(endDate.getTime() - 14 * 24 * 60 * 60 * 1000);
                break;
            case "30d":
                startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            default: // 7d
                startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        }

        const metrics = await calculateMetrics(startDate, endDate);

        return success({
            range,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            metrics: {
                signupsCount: metrics.signupsCount,
                ahaCount: metrics.ahaCount,
                activationRate5m: Math.round(metrics.activationRate5m * 10) / 10,
                activationRate24h: Math.round(metrics.activationRate24h * 10) / 10,
                medianTimeToAhaSeconds: metrics.medianTimeToAhaSeconds
                    ? Math.round(metrics.medianTimeToAhaSeconds)
                    : null,
                retention7dSecondSendRate: Math.round(metrics.retention7dSecondSendRate * 10) / 10,
            },
            targets: {
                medianTimeToAhaSeconds: 120,
                clicksToAha: 4,
                activationRate5m: 32.5, // 30-35%
                activationRate24h: 50, // 45-55%
                retention7dSecondSendRate: 60,
            },
            series: {
                dailySignups: metrics.dailySignups,
                dailyAha: metrics.dailyAha,
            },
        });
    } catch (error) {
        return serverError(error, "GET /api/admin/metrics");
    }
}
