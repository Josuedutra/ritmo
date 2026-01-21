/**
 * GET /api/ops/stripe
 *
 * Returns Stripe webhook processing health status.
 * Protected by OPS_TOKEN header.
 *
 * Coverage: TRUE (via ProductEvent tracking - P1-STRIPE-OBS-01)
 * - Uses ProductEvent "stripe_webhook_processed" and "stripe_webhook_failed"
 * - StripeEvent still used for event type breakdown and recent events (debug)
 *
 * P0 Observability requirement (P0-OBS-FIX).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOpsToken } from "@/lib/observability/ops-auth";
import { getRequestId, setRequestIdOnSentry } from "@/lib/observability/request-id";
import { logger } from "@/lib/logger";
import { ProductEventNames } from "@/lib/product-events";

export const dynamic = "force-dynamic";

const log = logger.child({ route: "api/ops/stripe" });

export async function GET(request: NextRequest) {
    // Validate OPS_TOKEN
    const authError = validateOpsToken(request);
    if (authError) return authError;

    const requestId = await getRequestId();
    setRequestIdOnSentry(requestId);

    try {
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // =================================================================
        // Failure Tracking via ProductEvent (P1-STRIPE-OBS-01)
        // =================================================================
        let coverage = false;
        let processed24h: number | null = null;
        let failed24h: number | null = null;
        let total24h: number | null = null;
        let failureRate: number | null = null;
        let shouldAlert = false;

        try {
            // Check if ProductEvent table exists
            const tableExists = await prisma.productEvent.count().catch(() => -1);

            if (tableExists >= 0) {
                // Count processed webhooks
                processed24h = await prisma.productEvent.count({
                    where: {
                        name: ProductEventNames.STRIPE_WEBHOOK_PROCESSED,
                        createdAt: { gte: last24h },
                    },
                });

                // Count failed webhooks
                failed24h = await prisma.productEvent.count({
                    where: {
                        name: ProductEventNames.STRIPE_WEBHOOK_FAILED,
                        createdAt: { gte: last24h },
                    },
                });

                // Calculate total and failure rate
                total24h = processed24h + failed24h;
                failureRate =
                    total24h > 0 ? Math.round((failed24h / total24h) * 100) : 0;

                // We have coverage because we can now track both success and failure
                coverage = true;

                // Alert if any failures
                shouldAlert = failed24h > 0;
            }
        } catch {
            // ProductEvent table not available
            log.warn({ requestId }, "ProductEvent table not available for failure tracking");
        }

        // =================================================================
        // Event Type Breakdown via StripeEvent (for debugging)
        // =================================================================
        const eventTypes = await prisma.stripeEvent.groupBy({
            by: ["eventType"],
            where: {
                processedAt: { gte: last24h },
            },
            _count: {
                id: true,
            },
        });

        const types: Record<string, number> = {};
        for (const et of eventTypes) {
            types[et.eventType] = et._count.id;
        }

        // Get recent events for debugging
        const recentEvents = await prisma.stripeEvent.findMany({
            where: {
                processedAt: { gte: last24h },
            },
            orderBy: {
                processedAt: "desc",
            },
            take: 5,
            select: {
                id: true,
                stripeEventId: true,
                eventType: true,
                processedAt: true,
            },
        });

        const response = {
            status: "ok",
            requestId,
            timestamp: now.toISOString(),
            coverage,
            stripe: {
                events24h: total24h,
                processed24h,
                failed24h,
                failureRate,
                eventTypes: types,
                recentEvents: recentEvents.map((e) => ({
                    id: e.id,
                    stripeEventId: e.stripeEventId,
                    eventType: e.eventType,
                    at: e.processedAt.toISOString(),
                })),
                alert: shouldAlert,
            },
        };

        log.info(
            { requestId, total24h, processed24h, failed24h, coverage },
            "Stripe health check"
        );

        return NextResponse.json(response);
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        log.error({ requestId, error: errorMsg }, "Stripe health check failed");

        return NextResponse.json(
            {
                status: "error",
                requestId,
                error: errorMsg,
                coverage: false,
            },
            { status: 500 }
        );
    }
}
