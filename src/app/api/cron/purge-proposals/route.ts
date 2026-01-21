/**
 * POST /api/cron/purge-proposals
 *
 * Cron endpoint for purging expired proposal attachments.
 * Protected by CRON_SECRET bearer token.
 *
 * This job:
 * 1. Finds attachments past their expiresAt date
 * 2. Deletes files from Supabase storage
 * 3. Soft-deletes the Attachment record (sets deletedAt)
 * 4. Decrements organization storage usage
 *
 * NOTE: We do NOT clear the proposalFileId from quotes.
 * This preserves history - UI shows "Expirado" badge instead of hiding the proposal.
 *
 * Run frequency: Daily at 02:00 UTC
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { createClient } from "@supabase/supabase-js";
import { decrementStorageUsage } from "@/lib/entitlements";
import {
    rateLimit,
    getClientIp,
    RateLimitConfigs,
    rateLimitedResponse,
} from "@/lib/security/rate-limit";
import { setSentryRequestContext } from "@/lib/observability/sentry-context";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const log = logger.child({ route: "api/cron/purge-proposals" });

// Supabase client for file storage
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getStorageClient() {
    if (!supabaseUrl || !supabaseServiceKey) {
        return null;
    }
    return createClient(supabaseUrl, supabaseServiceKey);
}

interface PurgeResult {
    success: boolean;
    scanned: number;
    deletedCount: number;
    failedCount: number;
    skippedMissingFiles: number;
    bytesFreed: number;
    orgsProcessed: string[];
    errors: string[];
    durationMs: number;
}

/**
 * POST /api/cron/purge-proposals
 *
 * Security (P0 Security Hardening):
 * - Rate limited: 60 requests per 10 minutes per IP
 */
export async function POST(request: NextRequest) {
    const startTime = Date.now();
    setSentryRequestContext(request);

    // P0 Security: Rate limiting per IP
    const ip = getClientIp(request);
    const rateLimitResult = await rateLimit({
        key: `cron:${ip}`,
        ...RateLimitConfigs.cron,
    });

    if (!rateLimitResult.allowed) {
        log.warn({ ip }, "Cron rate limited");
        return rateLimitedResponse(rateLimitResult.retryAfterSec);
    }

    // Validate CRON_SECRET
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.CRON_SECRET;

    if (!expectedToken) {
        log.error("CRON_SECRET not configured");
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    if (authHeader !== `Bearer ${expectedToken}`) {
        log.warn("Unauthorized cron request");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result: PurgeResult = {
        success: true,
        scanned: 0,
        deletedCount: 0,
        failedCount: 0,
        skippedMissingFiles: 0,
        bytesFreed: 0,
        orgsProcessed: [],
        errors: [],
        durationMs: 0,
    };

    try {
        const storage = getStorageClient();

        if (!storage) {
            log.error("Storage not configured");
            return NextResponse.json({
                error: "Storage not configured",
                success: false,
            }, { status: 500 });
        }

        const now = new Date();

        // Find expired attachments that haven't been deleted yet
        const expiredAttachments = await prisma.attachment.findMany({
            where: {
                expiresAt: { lte: now },
                deletedAt: null,
            },
            select: {
                id: true,
                organizationId: true,
                storagePath: true,
                sizeBytes: true,
                filename: true,
            },
            take: 200, // P0-V9: Process in batches of 200
        });

        result.scanned = expiredAttachments.length;
        log.info({ count: expiredAttachments.length }, "Found expired attachments");

        // P0-V9: Track unique organizations processed
        const orgsSet = new Set<string>();

        for (const attachment of expiredAttachments) {
            orgsSet.add(attachment.organizationId);
            try {
                // Delete from Supabase storage
                // P0-STO-HARDENING: Made resilient to missing files
                const { error: deleteError } = await storage.storage
                    .from("attachments")
                    .remove([attachment.storagePath]);

                let fileWasMissing = false;
                if (deleteError) {
                    // Check if this is a "file not found" type error
                    const isNotFoundError = deleteError.message.toLowerCase().includes("not found") ||
                        deleteError.message.toLowerCase().includes("404") ||
                        deleteError.message.toLowerCase().includes("does not exist");

                    if (isNotFoundError) {
                        // File already deleted or never existed - continue with cleanup
                        result.skippedMissingFiles++;
                        fileWasMissing = true;
                        log.info({
                            id: attachment.id,
                            error: deleteError.message,
                        }, "File already missing from storage - continuing with record cleanup");
                    } else {
                        // Real error - log but still try to continue with record cleanup
                        log.warn({
                            id: attachment.id,
                            error: deleteError.message,
                        }, "Failed to delete file from storage - continuing with record cleanup");
                    }
                }

                // Soft-delete the attachment record
                await prisma.attachment.update({
                    where: { id: attachment.id },
                    data: { deletedAt: now },
                });

                // Decrement storage usage (even if file was missing, the quota was reserved)
                const sizeBytes = Number(attachment.sizeBytes || 0);
                if (sizeBytes > 0) {
                    await decrementStorageUsage(
                        attachment.organizationId,
                        sizeBytes
                    );
                    result.bytesFreed += sizeBytes;
                }

                // P0-STO-FIX-02: Do NOT clear proposalFileId from quotes
                // Keep the reference so UI can show "Expirado" badge
                // The quote detail page checks deletedAt/expiresAt to show status

                result.deletedCount++;

                log.info({
                    id: attachment.id,
                    filename: attachment.filename,
                    organizationId: attachment.organizationId,
                    sizeBytes,
                    fileWasMissing,
                }, "Attachment purged");
            } catch (err) {
                result.failedCount++;
                const errorMsg = err instanceof Error ? err.message : "Unknown error";
                result.errors.push(`${attachment.id}: ${errorMsg}`);

                log.error({
                    id: attachment.id,
                    error: errorMsg,
                }, "Failed to purge attachment");
            }
        }

        // P0-V9: Finalize result
        result.orgsProcessed = Array.from(orgsSet);
        result.durationMs = Date.now() - startTime;
        result.success = result.failedCount === 0;

        log.info({
            scanned: result.scanned,
            deletedCount: result.deletedCount,
            failedCount: result.failedCount,
            skippedMissingFiles: result.skippedMissingFiles,
            bytesFreed: result.bytesFreed,
            bytesFreedMB: (result.bytesFreed / (1024 * 1024)).toFixed(2),
            orgsProcessed: result.orgsProcessed.length,
            durationMs: result.durationMs,
        }, "Purge job completed");

        return NextResponse.json(result);
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        log.error({ error: errorMsg }, "Purge job failed");

        return NextResponse.json({
            success: false,
            error: errorMsg,
            scanned: result.scanned,
            deletedCount: result.deletedCount,
            failedCount: result.failedCount,
            durationMs: Date.now() - startTime,
        }, { status: 500 });
    }
}

/**
 * GET /api/cron/purge-proposals
 *
 * Health check endpoint for the purge job.
 */
export async function GET() {
    const now = new Date();

    // Count pending expired attachments
    const pendingCount = await prisma.attachment.count({
        where: {
            expiresAt: { lte: now },
            deletedAt: null,
        },
    });

    // Count purged in last 24 hours
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const purgedCount = await prisma.attachment.count({
        where: {
            deletedAt: { gte: last24h },
        },
    });

    return NextResponse.json({
        status: "ok",
        pendingPurge: pendingCount,
        purgedLast24h: purgedCount,
        timestamp: now.toISOString(),
    });
}
