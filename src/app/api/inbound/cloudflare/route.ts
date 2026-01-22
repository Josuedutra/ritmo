/**
 * POST /api/inbound/cloudflare
 *
 * Cloudflare Email Worker webhook endpoint.
 *
 * Receives emails forwarded from Cloudflare Email Routing via Worker.
 * The Worker parses the email and sends a JSON payload to this endpoint.
 *
 * BCC Format: all+{orgShortId}+{quotePublicId}@inbound.useritmo.pt
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
    findBccInRecipients,
    extractLinkFromText,
    extractLinkFromHtml,
    validateAttachment,
    generateBodyChecksum,
    sanitizeForLog,
    maskEmail,
} from "@/lib/inbound";
import { createClient } from "@supabase/supabase-js";
import {
    canUseBccInbound,
    checkStorageGates,
    checkAndReserveStorageQuota,
    getRetentionPolicy,
} from "@/lib/entitlements";
import {
    rateLimit,
    getClientIp,
    RateLimitConfigs,
    rateLimitedResponse,
} from "@/lib/security/rate-limit";
import { setSentryRequestContext } from "@/lib/observability/sentry-context";
import { createHmac, createHash, timingSafeEqual } from "crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const log = logger.child({ route: "api/inbound/cloudflare" });

// Cloudflare Worker shared secret for webhook verification
const CLOUDFLARE_INBOUND_SECRET = process.env.CLOUDFLARE_INBOUND_SECRET;

// Supabase client for file storage
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getStorageClient() {
    if (!supabaseUrl || !supabaseServiceKey) {
        return null;
    }
    return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Verify Cloudflare Worker webhook signature
 *
 * The Worker signs the payload with: HMAC-SHA256(body, shared_secret)
 */
function verifyCloudflareSignature(body: string, signature: string | null, timestamp: string | null): boolean {
    if (!CLOUDFLARE_INBOUND_SECRET) {
        log.warn("CLOUDFLARE_INBOUND_SECRET not configured - skipping signature verification (dev mode)");
        return true; // Allow in dev mode
    }

    if (!signature || !timestamp) {
        log.warn("Missing signature or timestamp header");
        return false;
    }

    // Check timestamp is within 5 minutes (prevent replay attacks)
    const timestampNum = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);

    if (Math.abs(now - timestampNum) > 300) {
        log.warn({ timestamp, now }, "Signature timestamp out of range");
        return false;
    }

    // Compute expected signature: HMAC-SHA256(timestamp + body, secret)
    const expectedSignature = createHmac("sha256", CLOUDFLARE_INBOUND_SECRET)
        .update(timestamp + body)
        .digest("hex");

    // Timing-safe comparison
    try {
        const sigBuffer = Buffer.from(signature, "hex");
        const expectedBuffer = Buffer.from(expectedSignature, "hex");

        if (sigBuffer.length !== expectedBuffer.length) {
            return false;
        }

        return timingSafeEqual(sigBuffer, expectedBuffer);
    } catch {
        return false;
    }
}

/**
 * Generate idempotency key from email data
 */
function generateIdempotencyKey(messageId: string | null, from: string, timestamp: string): string {
    if (messageId) {
        return `cf:${messageId}`;
    }

    // Fallback: hash of from + timestamp
    return `cf:${createHash("sha256")
        .update(`${from}:${timestamp}`)
        .digest("hex")
        .substring(0, 32)}`;
}

/**
 * Expected payload from Cloudflare Email Worker
 */
interface CloudflareEmailPayload {
    messageId?: string;
    from: string;
    to: string;
    subject?: string;
    bodyText?: string;
    bodyHtml?: string;
    timestamp: string;
    attachments?: Array<{
        filename: string;
        contentType: string;
        size: number;
        content: string; // Base64 encoded
    }>;
}

/**
 * POST /api/inbound/cloudflare
 *
 * Cloudflare Email Worker sends parsed email as JSON
 */
export async function POST(request: NextRequest) {
    const startTime = Date.now();

    // P0 Observability: Set Sentry context
    setSentryRequestContext(request);

    // P0 Security: Rate limiting per IP
    const ip = getClientIp(request);
    const rateLimitResult = await rateLimit({
        key: `inbound:ip:${ip}`,
        ...RateLimitConfigs.inboundPerIp,
    });

    if (!rateLimitResult.allowed) {
        log.warn({ ip }, "Inbound rate limited by IP");
        return rateLimitedResponse(rateLimitResult.retryAfterSec);
    }

    try {
        // Get raw body for signature verification
        const bodyText = await request.text();

        // Verify signature
        const signature = request.headers.get("x-cloudflare-signature");
        const timestamp = request.headers.get("x-cloudflare-timestamp");

        if (!verifyCloudflareSignature(bodyText, signature, timestamp)) {
            log.warn({ ip }, "Invalid Cloudflare signature");
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        // Parse JSON payload
        const payload: CloudflareEmailPayload = JSON.parse(bodyText);

        const { messageId, from, to, subject, bodyText: emailBodyText, bodyHtml, attachments } = payload;

        // Log sanitized data
        log.info(sanitizeForLog({ from, to, subject }), "Cloudflare inbound email received");

        // Generate idempotency key
        const idempotencyKey = generateIdempotencyKey(messageId || null, from, timestamp || Date.now().toString());

        // Check for duplicate (idempotency)
        const existing = await prisma.inboundIngestion.findUnique({
            where: { providerMessageId: idempotencyKey },
        });

        if (existing) {
            log.info({ idempotencyKey }, "Duplicate inbound email - skipping");
            return NextResponse.json({ status: "duplicate", id: existing.id });
        }

        // Find BCC address in recipients
        const bccParsed = findBccInRecipients(to);

        if (!bccParsed) {
            // No valid BCC address found - log as unmatched
            const ingestion = await prisma.inboundIngestion.create({
                data: {
                    provider: "cloudflare",
                    providerMessageId: idempotencyKey,
                    bodyChecksum: generateBodyChecksum(emailBodyText || null, bodyHtml || null),
                    rawFrom: from,
                    rawTo: to,
                    rawSubject: subject,
                    rawBodyText: emailBodyText?.substring(0, 10000),
                    status: "unmatched",
                    errorMessage: "No valid BCC address found in recipients",
                },
            });

            log.warn({ id: ingestion.id, recipients: to?.substring(0, 100) }, "Unmatched inbound - no BCC address");
            return NextResponse.json({ status: "unmatched", id: ingestion.id });
        }

        const { orgShortId, quotePublicId } = bccParsed;

        // Find organization by shortId
        const org = await prisma.organization.findUnique({
            where: { shortId: orgShortId },
            select: { id: true, name: true },
        });

        if (!org) {
            const ingestion = await prisma.inboundIngestion.create({
                data: {
                    provider: "cloudflare",
                    providerMessageId: idempotencyKey,
                    bodyChecksum: generateBodyChecksum(emailBodyText || null, bodyHtml || null),
                    rawFrom: from,
                    rawTo: to,
                    rawSubject: subject,
                    rawBodyText: emailBodyText?.substring(0, 10000),
                    status: "unmatched",
                    errorMessage: `Organization not found: ${orgShortId}`,
                },
            });

            log.warn({ id: ingestion.id, orgShortId }, "Unmatched inbound - org not found");
            return NextResponse.json({ status: "unmatched", id: ingestion.id });
        }

        // P0 Security: Rate limiting per org (200 per hour)
        const orgRateLimitResult = await rateLimit({
            key: `inbound:org:${org.id}`,
            ...RateLimitConfigs.inboundPerOrg,
        });

        if (!orgRateLimitResult.allowed) {
            log.warn({ orgId: org.id }, "Inbound rate limited by org");
            return rateLimitedResponse(orgRateLimitResult.retryAfterSec);
        }

        // P0-04: Check if org has BCC inbound feature enabled (paid/trial only)
        const bccEnabled = await canUseBccInbound(org.id);
        if (!bccEnabled) {
            const ingestion = await prisma.inboundIngestion.create({
                data: {
                    organizationId: org.id,
                    provider: "cloudflare",
                    providerMessageId: idempotencyKey,
                    bodyChecksum: generateBodyChecksum(emailBodyText || null, bodyHtml || null),
                    rawFrom: from,
                    rawTo: to,
                    rawSubject: subject,
                    rawBodyText: emailBodyText?.substring(0, 10000),
                    status: "rejected_feature_disabled",
                    errorMessage: "BCC inbound feature not enabled for this organization (free tier)",
                },
            });

            log.info({ id: ingestion.id, orgShortId }, "Inbound rejected - BCC feature disabled (free tier)");
            return NextResponse.json({
                status: "rejected",
                id: ingestion.id,
                reason: "feature_disabled",
                message: "BCC auto-attachment is only available on paid plans.",
            });
        }

        // Find quote by publicId within organization
        const quote = await prisma.quote.findFirst({
            where: {
                publicId: quotePublicId,
                organizationId: org.id,
            },
            select: {
                id: true,
                title: true,
                proposalLink: true,
                proposalFileId: true,
            },
        });

        if (!quote) {
            const ingestion = await prisma.inboundIngestion.create({
                data: {
                    organizationId: org.id,
                    provider: "cloudflare",
                    providerMessageId: idempotencyKey,
                    bodyChecksum: generateBodyChecksum(emailBodyText || null, bodyHtml || null),
                    rawFrom: from,
                    rawTo: to,
                    rawSubject: subject,
                    rawBodyText: emailBodyText?.substring(0, 10000),
                    status: "unmatched",
                    errorMessage: `Quote not found: ${quotePublicId}`,
                },
            });

            log.warn({ id: ingestion.id, orgShortId, quotePublicId }, "Unmatched inbound - quote not found");
            return NextResponse.json({ status: "unmatched", id: ingestion.id });
        }

        // Create ingestion record (pending processing)
        const ingestion = await prisma.inboundIngestion.create({
            data: {
                organizationId: org.id,
                quoteId: quote.id,
                provider: "cloudflare",
                providerMessageId: idempotencyKey,
                bodyChecksum: generateBodyChecksum(emailBodyText || null, bodyHtml || null),
                rawFrom: from,
                rawTo: to,
                rawSubject: subject,
                rawBodyText: emailBodyText?.substring(0, 10000),
                rawBodyHtml: bodyHtml?.substring(0, 50000),
                status: "pending",
            },
        });

        log.info({
            id: ingestion.id,
            quoteId: quote.id,
            from: from ? maskEmail(from) : null,
        }, "Inbound matched to quote");

        // Process attachments (PDF priority)
        let attachmentProcessed = false;

        if (attachments && attachments.length > 0) {
            for (const attachment of attachments) {
                const attachmentInfo = {
                    filename: attachment.filename,
                    contentType: attachment.contentType,
                    size: attachment.size,
                };

                const validation = validateAttachment(attachmentInfo);

                if (!validation.valid) {
                    log.info({
                        id: ingestion.id,
                        filename: attachment.filename,
                        error: validation.error,
                    }, "Attachment skipped");
                    continue;
                }

                // Check storage gates
                const storageCheck = await checkStorageGates(
                    org.id,
                    attachment.size,
                    attachment.contentType
                );

                if (!storageCheck.allowed) {
                    if (storageCheck.reason === "MIME_TYPE_REJECTED") {
                        log.info({
                            id: ingestion.id,
                            filename: attachment.filename,
                            reason: storageCheck.reason,
                        }, "Attachment skipped - non-PDF");
                        continue;
                    }

                    if (storageCheck.reason === "SIZE_EXCEEDED") {
                        await prisma.inboundIngestion.update({
                            where: { id: ingestion.id },
                            data: {
                                status: "rejected_size_exceeded",
                                errorMessage: storageCheck.message,
                                processedAt: new Date(),
                            },
                        });

                        log.info({
                            id: ingestion.id,
                            quoteId: quote.id,
                            filename: attachment.filename,
                            reason: storageCheck.reason,
                        }, "Attachment rejected - size exceeded");

                        return NextResponse.json({
                            status: "rejected",
                            id: ingestion.id,
                            reason: storageCheck.reason.toLowerCase(),
                            message: storageCheck.message,
                        });
                    }
                }

                // Atomic quota reservation
                const quotaReservation = await checkAndReserveStorageQuota(
                    org.id,
                    attachment.size,
                    attachment.contentType
                );

                if (!quotaReservation.allowed) {
                    await prisma.inboundIngestion.update({
                        where: { id: ingestion.id },
                        data: {
                            status: "rejected_quota_exceeded",
                            errorMessage: quotaReservation.message,
                            processedAt: new Date(),
                        },
                    });

                    log.info({
                        id: ingestion.id,
                        quoteId: quote.id,
                        filename: attachment.filename,
                        reason: quotaReservation.reason,
                    }, "Attachment rejected - quota exceeded");

                    return NextResponse.json({
                        status: "rejected",
                        id: ingestion.id,
                        reason: quotaReservation.reason.toLowerCase(),
                        message: quotaReservation.message,
                    });
                }

                // Process PDF attachment
                try {
                    // Decode base64 content
                    const buffer = Buffer.from(attachment.content, "base64");

                    // Upload to Supabase Storage
                    const storage = getStorageClient();

                    if (!storage) {
                        log.warn({ id: ingestion.id }, "Storage not configured - rolling back quota");
                        await quotaReservation.rollback();
                        continue;
                    }

                    const storagePath = `proposals/${org.id}/${quote.id}/${Date.now()}-${attachment.filename}`;

                    const { error: uploadError } = await storage.storage
                        .from("attachments")
                        .upload(storagePath, buffer, {
                            contentType: "application/pdf",
                            upsert: false,
                        });

                    if (uploadError) {
                        log.error({ id: ingestion.id, error: uploadError.message }, "Attachment upload failed - rolling back quota");
                        await quotaReservation.rollback();
                        continue;
                    }

                    // Get retention policy
                    const retentionPolicy = await getRetentionPolicy(org.id);

                    // Create Attachment record
                    const attachmentRecord = await prisma.attachment.create({
                        data: {
                            organizationId: org.id,
                            filename: attachment.filename,
                            contentType: "application/pdf",
                            sizeBytes: BigInt(attachment.size),
                            storagePath,
                            expiresAt: retentionPolicy.expiresAt,
                        },
                    });

                    // Update quote with proposal file
                    await prisma.quote.update({
                        where: { id: quote.id },
                        data: {
                            proposalFileId: attachmentRecord.id,
                            lastActivityAt: new Date(),
                        },
                    });

                    // Update ingestion
                    await prisma.inboundIngestion.update({
                        where: { id: ingestion.id },
                        data: {
                            attachmentId: attachmentRecord.id,
                            status: "processed",
                            processedAt: new Date(),
                        },
                    });

                    attachmentProcessed = true;

                    log.info({
                        id: ingestion.id,
                        quoteId: quote.id,
                        attachmentId: attachmentRecord.id,
                        filename: attachment.filename,
                        expiresAt: retentionPolicy.expiresAt,
                    }, "PDF attachment processed");

                    break; // Only process first valid PDF
                } catch (err) {
                    log.error({ id: ingestion.id, error: err }, "Attachment processing error - rolling back quota");
                    await quotaReservation.rollback();
                }
            }
        }

        // If no attachment processed, try to extract link from body
        if (!attachmentProcessed) {
            if (!quote.proposalLink && !quote.proposalFileId) {
                const link = extractLinkFromHtml(bodyHtml || "") || extractLinkFromText(emailBodyText || "");

                if (link) {
                    await prisma.quote.update({
                        where: { id: quote.id },
                        data: {
                            proposalLink: link,
                            lastActivityAt: new Date(),
                        },
                    });

                    await prisma.inboundIngestion.update({
                        where: { id: ingestion.id },
                        data: {
                            parsedLink: link,
                            status: "processed",
                            processedAt: new Date(),
                        },
                    });

                    log.info({ id: ingestion.id, quoteId: quote.id, link }, "Link extracted from email body");
                } else {
                    await prisma.inboundIngestion.update({
                        where: { id: ingestion.id },
                        data: {
                            status: "processed",
                            processedAt: new Date(),
                            errorMessage: "No PDF attachment or link found",
                        },
                    });

                    log.info({ id: ingestion.id }, "No PDF or link found in email");
                }
            } else {
                await prisma.inboundIngestion.update({
                    where: { id: ingestion.id },
                    data: {
                        status: "processed",
                        processedAt: new Date(),
                        errorMessage: "Quote already has proposal attached",
                    },
                });

                log.info({ id: ingestion.id, quoteId: quote.id }, "Quote already has proposal - skipping");
            }
        }

        const durationMs = Date.now() - startTime;
        log.info({ id: ingestion.id, durationMs }, "Cloudflare inbound processing complete");

        return NextResponse.json({
            status: "processed",
            id: ingestion.id,
            quoteId: quote.id,
            attachmentProcessed,
        });
    } catch (error) {
        log.error({ error }, "Cloudflare inbound webhook error");
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
