import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { calculateAllOrgMetricsForDate } from "@/lib/org-metrics";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/cron/calculate-metrics
 *
 * Cron endpoint for calculating daily organization metrics.
 * Protected by CRON_SECRET bearer token.
 *
 * Should run once daily (e.g., at midnight or early morning).
 * Calculates metrics for yesterday by default.
 *
 * Query params:
 * - date: YYYY-MM-DD (optional, defaults to yesterday)
 */
export async function POST(request: NextRequest) {
    const log = logger.child({ endpoint: "cron/calculate-metrics" });

    // Validate CRON_SECRET
    const authHeader = request.headers.get("authorization");
    const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

    if (!process.env.CRON_SECRET) {
        log.error("CRON_SECRET not configured");
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    if (authHeader !== expectedToken) {
        log.warn("Unauthorized cron attempt");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse date from query params (default: yesterday)
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    let targetDate: Date;
    if (dateParam) {
        targetDate = new Date(dateParam);
        if (isNaN(targetDate.getTime())) {
            return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD" }, { status: 400 });
        }
    } else {
        // Default to yesterday
        targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - 1);
    }

    log.info({ date: targetDate.toISOString() }, "Calculating metrics");

    try {
        const result = await calculateAllOrgMetricsForDate(targetDate);

        log.info({
            date: targetDate.toISOString(),
            ...result,
        }, "Metrics calculation completed");

        return NextResponse.json({
            success: true,
            date: targetDate.toISOString().split("T")[0],
            ...result,
        });
    } catch (error) {
        log.error({ error }, "Metrics calculation failed");
        return NextResponse.json(
            { error: "Metrics calculation failed", details: error instanceof Error ? error.message : "Unknown" },
            { status: 500 }
        );
    }
}
