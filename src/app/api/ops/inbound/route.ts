/**
 * GET /api/ops/inbound
 *
 * Returns inbound email processing health status.
 * Protected by OPS_TOKEN header.
 *
 * Uses InboundIngestion model for accurate tracking:
 * - total: all ingestions in 24h
 * - processed: status = 'processed'
 * - rejected: status starts with 'rejected_'
 *
 * P0 Observability requirement (P0-OBS-FIX).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOpsToken } from "@/lib/observability/ops-auth";
import { getRequestId, setRequestIdOnSentry } from "@/lib/observability/request-id";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const log = logger.child({ route: "api/ops/inbound" });

// Rejection statuses from IngestStatus enum
const REJECTED_STATUSES = [
    "rejected_feature_disabled",
    "rejected_size_exceeded",
    "rejected_mime_type",
    "rejected_quota_exceeded",
] as const;

export async function GET(request: NextRequest) {
    // Validate OPS_TOKEN
    const authError = validateOpsToken(request);
    if (authError) return authError;

    const requestId = await getRequestId();
    setRequestIdOnSentry(requestId);

    try {
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Check coverage - can we query InboundIngestion?
        let coverage = false;
        try {
            await prisma.inboundIngestion.count();
            coverage = true;
        } catch {
            coverage = false;
        }

        if (!coverage) {
            return NextResponse.json({
                status: "ok",
                requestId,
                timestamp: now.toISOString(),
                coverage: false,
                inbound: {
                    received24h: null,
                    processed24h: null,
                    rejected24h: null,
                    successRate: null,
                    rejectionRate: null,
                    reasons: null,
                    alert: false,
                },
            });
        }

        // Total ingestions in last 24h
        const total = await prisma.inboundIngestion.count({
            where: {
                createdAt: { gte: last24h },
            },
        });

        // Processed (successful)
        const processed = await prisma.inboundIngestion.count({
            where: {
                createdAt: { gte: last24h },
                status: "processed",
            },
        });

        // Rejected (any rejected_* status)
        const rejected = await prisma.inboundIngestion.count({
            where: {
                createdAt: { gte: last24h },
                status: { in: [...REJECTED_STATUSES] },
            },
        });

        // Calculate rates
        const successRate = total > 0 ? Math.round((processed / total) * 100) : 100;
        const rejectionRate = total > 0 ? Math.round((rejected / total) * 100) : 0;

        // Get rejection reason breakdown
        const rejectionReasons = await prisma.inboundIngestion.groupBy({
            by: ["status"],
            where: {
                createdAt: { gte: last24h },
                status: { in: [...REJECTED_STATUSES] },
            },
            _count: {
                id: true,
            },
        });

        const reasons: Record<string, number> = {};
        for (const reason of rejectionReasons) {
            reasons[reason.status] = reason._count.id;
        }

        // Alert threshold: rejectionRate > 25% with at least 20 events
        const shouldAlert = total >= 20 && rejectionRate > 25;

        const response = {
            status: "ok",
            requestId,
            timestamp: now.toISOString(),
            coverage: true,
            inbound: {
                received24h: total,
                processed24h: processed,
                rejected24h: rejected,
                successRate,
                rejectionRate,
                reasons,
                alert: shouldAlert,
            },
        };

        log.info(
            { requestId, total, processed, rejected, rejectionRate, coverage },
            "Inbound health check"
        );

        return NextResponse.json(response);
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        log.error({ requestId, error: errorMsg }, "Inbound health check failed");

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
