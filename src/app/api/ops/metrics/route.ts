/**
 * GET /api/ops/metrics
 *
 * Aggregated metrics endpoint with threshold-based alerts and coverage tracking.
 * Protected by OPS_TOKEN header.
 *
 * Used by uptime monitoring (GitHub Actions) to detect issues.
 *
 * Alert Conditions (only evaluated when coverage is true):
 * - inboundRejectionRate > 25% (with minimum 20 events)
 * - stripeFailures > 0
 * - cronPendingPurge > 1000 (backlog)
 * - cronLastRun > 48h (stale)
 *
 * Coverage:
 * - Each domain (inbound/stripe/cron) has a coverage boolean
 * - coverage=true means we have reliable data source for that domain
 * - coverage=false means metrics are unavailable (values will be null)
 * - Alerts ONLY fire when coverage is true for that domain
 *
 * P0 Observability requirement (P0-OBS-FIX).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOpsToken } from "@/lib/observability/ops-auth";
import { getRequestId, setRequestIdOnSentry } from "@/lib/observability/request-id";
import { setSentryRequestContext } from "@/lib/observability/sentry-context";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const log = logger.child({ route: "api/ops/metrics" });

// Alert thresholds
const THRESHOLDS = {
    inboundRejectionRate: 25, // percentage (0.25)
    inboundMinEvents: 20, // minimum events to trigger rejection alert
    stripeFailures: 0, // any failure is concerning
    cronPendingPurge: 1000, // backlog threshold
    cronStaleHours: 48, // hours since last purge
};

interface Alert {
    code: string;
    message: string;
    value: number;
    threshold: number;
}

interface Coverage {
    inbound: boolean;
    stripe: boolean;
    cron: boolean;
}

export async function GET(request: NextRequest) {
    // Validate OPS_TOKEN
    const authError = validateOpsToken(request);
    if (authError) return authError;

    const requestId = await getRequestId();
    setRequestIdOnSentry(requestId);
    setSentryRequestContext(request);

    const alerts: Alert[] = [];
    const coverage: Coverage = {
        inbound: false,
        stripe: false,
        cron: false,
    };

    try {
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const last48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

        // =========================================================================
        // 1. Inbound Metrics (using InboundIngestion model)
        // =========================================================================
        // Check if InboundIngestion table has data (coverage test)
        let inboundTotal: number | null = null;
        let inboundProcessed: number | null = null;
        let inboundRejected: number | null = null;
        let inboundRejectionRate: number | null = null;

        try {
            // Count all ingestions in last 24h
            const totalCount = await prisma.inboundIngestion.count({
                where: {
                    createdAt: { gte: last24h },
                },
            });

            // If we have any records (even 0 in 24h), we have coverage
            // Check if table exists by counting all records
            const tableExists = await prisma.inboundIngestion.count().catch(() => -1);

            if (tableExists >= 0) {
                coverage.inbound = true;
                inboundTotal = totalCount;

                // Count processed (status = 'processed')
                inboundProcessed = await prisma.inboundIngestion.count({
                    where: {
                        createdAt: { gte: last24h },
                        status: "processed",
                    },
                });

                // Count rejected (status starts with 'rejected_')
                inboundRejected = await prisma.inboundIngestion.count({
                    where: {
                        createdAt: { gte: last24h },
                        status: {
                            in: [
                                "rejected_feature_disabled",
                                "rejected_size_exceeded",
                                "rejected_mime_type",
                                "rejected_quota_exceeded",
                            ],
                        },
                    },
                });

                // Calculate rejection rate
                inboundRejectionRate =
                    inboundTotal > 0
                        ? Math.round((inboundRejected / inboundTotal) * 100)
                        : 0;

                // Check inbound rejection rate alert (only if coverage is true)
                if (
                    inboundTotal >= THRESHOLDS.inboundMinEvents &&
                    inboundRejectionRate > THRESHOLDS.inboundRejectionRate
                ) {
                    alerts.push({
                        code: "INBOUND_REJECTION_HIGH",
                        message: `Inbound rejection rate ${inboundRejectionRate}% exceeds threshold ${THRESHOLDS.inboundRejectionRate}%`,
                        value: inboundRejectionRate,
                        threshold: THRESHOLDS.inboundRejectionRate,
                    });
                }
            }
        } catch {
            // Table doesn't exist or query failed - coverage remains false
            log.warn({ requestId }, "InboundIngestion table not available");
        }

        // =========================================================================
        // 2. Stripe Metrics (P1-STRIPE-OBS-01: via ProductEvent)
        // =========================================================================
        // coverage.stripe = true when we can measure both processed and failed
        // Using ProductEvent "stripe_webhook_processed" and "stripe_webhook_failed"
        let stripeTotal: number | null = null;
        let stripeProcessed: number | null = null;
        let stripeFailed: number | null = null;
        let stripeFailureRate: number | null = null;

        try {
            // Check if ProductEvent table exists
            const tableExists = await prisma.productEvent.count().catch(() => -1);

            if (tableExists >= 0) {
                // Count processed webhooks
                stripeProcessed = await prisma.productEvent.count({
                    where: {
                        name: "stripe_webhook_processed",
                        createdAt: { gte: last24h },
                    },
                });

                // Count failed webhooks
                stripeFailed = await prisma.productEvent.count({
                    where: {
                        name: "stripe_webhook_failed",
                        createdAt: { gte: last24h },
                    },
                });

                // Calculate total and failure rate
                stripeTotal = stripeProcessed + stripeFailed;
                stripeFailureRate =
                    stripeTotal > 0
                        ? Math.round((stripeFailed / stripeTotal) * 100)
                        : 0;

                // coverage.stripe = true because we now track both success and failure
                coverage.stripe = true;

                // Check Stripe failures alert (only if coverage is true)
                if (stripeFailed > THRESHOLDS.stripeFailures) {
                    alerts.push({
                        code: "STRIPE_WEBHOOK_FAILED",
                        message: `${stripeFailed} Stripe webhook failures in last 24h`,
                        value: stripeFailed,
                        threshold: THRESHOLDS.stripeFailures,
                    });
                }
            }
        } catch {
            // Table doesn't exist or query failed
            log.warn({ requestId }, "ProductEvent table not available for Stripe metrics");
        }

        // =========================================================================
        // 3. Cron Metrics (using Attachment model - always available)
        // =========================================================================
        let pendingPurge: number | null = null;
        let lastPurgeTime: Date | null = null;
        let cronStale = false;

        try {
            // Attachment table should always exist
            pendingPurge = await prisma.attachment.count({
                where: {
                    expiresAt: { lte: now },
                    deletedAt: null,
                },
            });

            // Find last successful purge
            const lastPurged = await prisma.attachment.findFirst({
                where: {
                    deletedAt: { not: null },
                },
                orderBy: {
                    deletedAt: "desc",
                },
                select: {
                    deletedAt: true,
                },
            });

            lastPurgeTime = lastPurged?.deletedAt || null;
            cronStale = lastPurgeTime ? lastPurgeTime < last48h : false;

            // We have coverage if we can query the table
            coverage.cron = true;

            // Check cron backlog alert (only if coverage is true)
            if (pendingPurge > THRESHOLDS.cronPendingPurge) {
                alerts.push({
                    code: "CRON_BACKLOG",
                    message: `${pendingPurge} attachments pending purge exceeds threshold ${THRESHOLDS.cronPendingPurge}`,
                    value: pendingPurge,
                    threshold: THRESHOLDS.cronPendingPurge,
                });
            }

            // Check stale cron alert
            if (cronStale && pendingPurge > 0) {
                alerts.push({
                    code: "CRON_STALE",
                    message: `No successful purge in last ${THRESHOLDS.cronStaleHours}h with ${pendingPurge} pending`,
                    value: THRESHOLDS.cronStaleHours,
                    threshold: THRESHOLDS.cronStaleHours,
                });
            }
        } catch {
            // This shouldn't happen as Attachment is core model
            log.error({ requestId }, "Attachment table not available - critical issue");
        }

        // =========================================================================
        // Build Response
        // =========================================================================
        const healthy = alerts.length === 0;

        const response = {
            healthy,
            requestId,
            timestamp: now.toISOString(),
            coverage,
            alerts,
            metrics: {
                inbound: {
                    total24h: inboundTotal,
                    processed24h: inboundProcessed,
                    rejected24h: inboundRejected,
                    rejectionRate: inboundRejectionRate,
                },
                stripe: {
                    total24h: stripeTotal,
                    processed24h: stripeProcessed,
                    failed24h: stripeFailed,
                    failureRate: stripeFailureRate,
                },
                cron: {
                    pendingPurge,
                    lastPurge: lastPurgeTime?.toISOString() || null,
                    isStale: cronStale,
                },
            },
            thresholds: THRESHOLDS,
        };

        log.info(
            {
                requestId,
                healthy,
                alertCount: alerts.length,
                coverage,
                inboundTotal,
                inboundRejectionRate,
                stripeTotal,
                stripeFailed,
                pendingPurge,
            },
            "Metrics health check"
        );

        // Return 200 even if unhealthy (alerts indicate issue, not API failure)
        // Uptime monitors can check the "healthy" field
        return NextResponse.json(response);
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        log.error({ requestId, error: errorMsg }, "Metrics health check failed");

        return NextResponse.json(
            {
                healthy: false,
                requestId,
                error: errorMsg,
                coverage,
                alerts: [
                    {
                        code: "METRICS_ERROR",
                        message: `Failed to fetch metrics: ${errorMsg}`,
                        value: 1,
                        threshold: 0,
                    },
                ],
            },
            { status: 500 }
        );
    }
}
