/**
 * GET /api/ops/cron
 *
 * Returns cron job health status.
 * Protected by OPS_TOKEN header.
 *
 * Response:
 * - lastRun24h: purge-proposals cron runs in last 24h
 * - lastSuccess: timestamp of last successful run
 * - pendingPurge: count of attachments pending purge
 *
 * P0 Observability requirement.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOpsToken } from "@/lib/observability/ops-auth";
import { getRequestId, setRequestIdOnSentry } from "@/lib/observability/request-id";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const log = logger.child({ route: "api/ops/cron" });

export async function GET(request: NextRequest) {
    // Validate OPS_TOKEN
    const authError = validateOpsToken(request);
    if (authError) return authError;

    const requestId = await getRequestId();
    setRequestIdOnSentry(requestId);

    try {
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Count attachments pending purge (expired but not yet deleted)
        const pendingPurge = await prisma.attachment.count({
            where: {
                expiresAt: { lte: now },
                deletedAt: null,
            },
        });

        // Count attachments purged in last 24h
        const purgedLast24h = await prisma.attachment.count({
            where: {
                deletedAt: { gte: last24h },
            },
        });

        // Find most recent purge (any attachment with deletedAt)
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

        const response = {
            status: "ok",
            requestId,
            timestamp: now.toISOString(),
            cron: {
                purgeProposals: {
                    lastRun24h: purgedLast24h > 0,
                    lastSuccess: lastPurged?.deletedAt?.toISOString() || null,
                    pendingPurge,
                    purgedLast24h,
                },
            },
        };

        log.info({ requestId, pendingPurge, purgedLast24h }, "Cron health check");

        return NextResponse.json(response);
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        log.error({ requestId, error: errorMsg }, "Cron health check failed");

        return NextResponse.json(
            {
                status: "error",
                requestId,
                error: errorMsg,
            },
            { status: 500 }
        );
    }
}
