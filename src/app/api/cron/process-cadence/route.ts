import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel Pro: 60s max

/**
 * POST /api/cron/process-cadence
 * 
 * Cron endpoint for processing scheduled cadence events.
 * Protected by CRON_SECRET bearer token.
 * 
 * This is a STUB for Sprint 0 - actual logic in Sprint 1.
 */
export async function POST(request: NextRequest) {
    const log = logger.child({ endpoint: "cron/process-cadence" });
    const startTime = Date.now();

    // Validate CRON_SECRET
    const authHeader = request.headers.get("authorization");
    const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

    if (!process.env.CRON_SECRET) {
        log.error("CRON_SECRET not configured");
        return NextResponse.json(
            { error: "Server configuration error" },
            { status: 500 }
        );
    }

    if (authHeader !== expectedToken) {
        log.warn("Unauthorized cron attempt");
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    // Parse optional worker ID from body
    let workerId = `cron-${Date.now()}`;
    try {
        const body = await request.json().catch(() => ({}));
        if (body.worker_id) {
            workerId = body.worker_id;
        }
    } catch {
        // Empty body is fine
    }

    log.info({ workerId }, "Cron job started");

    // =========================================================================
    // STUB: Sprint 1 will implement:
    // 1. Release orphan claims (>5 min old)
    // 2. Claim batch of events with UPDATE...RETURNING
    // 3. Process each event (check window, 48h, suppressions)
    // 4. Send emails / create tasks
    // 5. Update status
    // =========================================================================

    const result = {
        success: true,
        workerId,
        processed: 0,
        sent: 0,
        skipped: 0,
        deferred: 0,
        failed: 0,
        durationMs: Date.now() - startTime,
        message: "STUB: No events processed (Sprint 0)",
    };

    log.info(result, "Cron job completed");

    return NextResponse.json(result);
}
