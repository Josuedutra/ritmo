/**
 * POST /api/inbound/mailgun
 *
 * Mailgun inbound email webhook endpoint.
 *
 * Receives emails sent to BCC addresses and:
 * 1. Validates Mailgun signature
 * 2. Parses BCC address to find org + quote
 * 3. Extracts PDF attachment or link from body
 * 4. Updates quote with proposal
 *
 * BCC Format: bcc+{orgShortId}+{quotePublicId}@inbound.ritmo.app
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
    verifyMailgunSignature,
    findBccInRecipients,
    extractLinkFromText,
    extractLinkFromHtml,
    validateAttachment,
    generateIdempotencyKey,
    generateBodyChecksum,
    sanitizeForLog,
    maskEmail,
} from "@/lib/inbound";
import { createClient } from "@supabase/supabase-js";
import {
    checkStorageGates,
    checkAndReserveStorageQuota,
    getRetentionPolicy,
    checkTrialBccCapture,
    incrementTrialBccCapture,
    getEntitlements,
} from "@/lib/entitlements";
import {
    rateLimit,
    getClientIp,
    RateLimitConfigs,
    rateLimitedResponse,
} from "@/lib/security/rate-limit";
import { setSentryRequestContext } from "@/lib/observability/sentry-context";
import { trackEvent, ProductEventNames } from "@/lib/product-events";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const log = logger.child({ route: "api/inbound/mailgun" });

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
 * POST /api/inbound/mailgun
 *
 * Mailgun sends inbound emails as multipart/form-data
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
        // Parse multipart form data
        const formData = await request.formData();

        // Extract Mailgun signature fields
        const timestamp = formData.get("timestamp") as string;
        const token = formData.get("token") as string;
        const signature = formData.get("signature") as string;

        // Verify signature
        if (!verifyMailgunSignature({ timestamp, token, signature })) {
            log.warn({ timestamp }, "Invalid Mailgun signature");
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        // Extract email data
        const messageId = formData.get("Message-Id") as string | null;
        const from = formData.get("from") as string | null;
        const to = formData.get("To") as string | null;
        const recipient = formData.get("recipient") as string | null;
        const subject = formData.get("subject") as string | null;
        const bodyPlain = formData.get("body-plain") as string | null;
        const bodyHtml = formData.get("body-html") as string | null;

        // Log sanitized data
        log.info(sanitizeForLog({ from: from || undefined, to: to || undefined, subject: subject || undefined }), "Inbound email received");

        // Generate idempotency key
        const idempotencyKey = generateIdempotencyKey(messageId, timestamp, token);

        // Check for duplicate (idempotency)
        const existing = await prisma.inboundIngestion.findUnique({
            where: { providerMessageId: idempotencyKey },
        });

        if (existing) {
            log.info({ idempotencyKey }, "Duplicate inbound email - skipping");
            return NextResponse.json({ status: "duplicate", id: existing.id });
        }

        // Find BCC address in recipients
        // Mailgun provides: recipient (the address that matched the route), To header, Cc header
        const allRecipients = [recipient, to, formData.get("Cc") as string | null]
            .filter(Boolean)
            .join(",");

        const bccParsed = findBccInRecipients(allRecipients);

        if (!bccParsed) {
            // No valid BCC address found - log as unmatched
            const ingestion = await prisma.inboundIngestion.create({
                data: {
                    provider: "mailgun",
                    providerMessageId: idempotencyKey,
                    bodyChecksum: generateBodyChecksum(bodyPlain, bodyHtml),
                    rawFrom: from,
                    rawTo: to || recipient,
                    rawSubject: subject,
                    rawBodyText: bodyPlain?.substring(0, 10000), // Limit stored body
                    status: "unmatched",
                    errorMessage: "No valid BCC address found in recipients",
                },
            });

            log.warn({ id: ingestion.id, recipients: allRecipients?.substring(0, 100) }, "Unmatched inbound - no BCC address");
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
                    provider: "mailgun",
                    providerMessageId: idempotencyKey,
                    bodyChecksum: generateBodyChecksum(bodyPlain, bodyHtml),
                    rawFrom: from,
                    rawTo: to || recipient,
                    rawSubject: subject,
                    rawBodyText: bodyPlain?.substring(0, 10000),
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

        // Check if org can use BCC inbound (Trial: 1 capture, Paid: unlimited, Free: none)
        const entitlements = await getEntitlements(org.id);
        const bccCheck = await checkTrialBccCapture(org.id);

        if (!bccCheck.allowed) {
            // Accept webhook but reject processing
            const ingestion = await prisma.inboundIngestion.create({
                data: {
                    organizationId: org.id,
                    provider: "mailgun",
                    providerMessageId: idempotencyKey,
                    bodyChecksum: generateBodyChecksum(bodyPlain, bodyHtml),
                    rawFrom: from,
                    rawTo: to || recipient,
                    rawSubject: subject,
                    rawBodyText: bodyPlain?.substring(0, 10000),
                    status: bccCheck.reason === "FREE_TIER" ? "rejected_feature_disabled" : "rejected_trial_limit",
                    errorMessage: bccCheck.message,
                },
            });

            // Track paywall event
            await trackEvent(ProductEventNames.PAYWALL_SHOWN, {
                organizationId: org.id,
                props: {
                    feature: "bcc_inbound",
                    reason: bccCheck.reason,
                    tier: entitlements.tier,
                },
            });

            log.info({
                id: ingestion.id,
                orgShortId,
                reason: bccCheck.reason,
                tier: entitlements.tier,
            }, "Inbound rejected - BCC capture not allowed");

            // Return 200 to avoid exposing internal state (non-revelatory response)
            return NextResponse.json({
                status: "received",
                id: ingestion.id,
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
                    provider: "mailgun",
                    providerMessageId: idempotencyKey,
                    bodyChecksum: generateBodyChecksum(bodyPlain, bodyHtml),
                    rawFrom: from,
                    rawTo: to || recipient,
                    rawSubject: subject,
                    rawBodyText: bodyPlain?.substring(0, 10000),
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
                provider: "mailgun",
                providerMessageId: idempotencyKey,
                bodyChecksum: generateBodyChecksum(bodyPlain, bodyHtml),
                rawFrom: from,
                rawTo: to || recipient,
                rawSubject: subject,
                rawBodyText: bodyPlain?.substring(0, 10000),
                rawBodyHtml: bodyHtml?.substring(0, 50000),
                status: "pending",
            },
        });

        log.info({
            id: ingestion.id,
            quoteId: quote.id,
            from: from ? maskEmail(from) : null,
        }, "Inbound matched to quote");

        // Process attachments first (PDF priority)
        let attachmentProcessed = false;
        const attachmentCount = parseInt(formData.get("attachment-count") as string) || 0;

        if (attachmentCount > 0) {
            for (let i = 1; i <= attachmentCount; i++) {
                const attachment = formData.get(`attachment-${i}`) as File | null;

                if (!attachment) continue;

                const attachmentInfo = {
                    filename: attachment.name,
                    contentType: attachment.type,
                    size: attachment.size,
                };

                const validation = validateAttachment(attachmentInfo);

                if (!validation.valid) {
                    log.info({
                        id: ingestion.id,
                        filename: attachment.name,
                        error: validation.error,
                    }, "Attachment skipped");
                    continue;
                }

                // P0-V7: Check size and MIME type first (no DB needed)
                // Use checkStorageGates for MIME check only, then atomic reservation
                const storageCheck = await checkStorageGates(
                    org.id,
                    attachment.size,
                    attachment.type
                );

                if (!storageCheck.allowed) {
                    // P0-STO-FIX-03: For MIME rejection, skip this attachment but continue
                    // to process other attachments or extract links from body
                    if (storageCheck.reason === "MIME_TYPE_REJECTED") {
                        log.info({
                            id: ingestion.id,
                            filename: attachment.name,
                            reason: storageCheck.reason,
                        }, "Attachment skipped - non-PDF, will try to extract link");
                        continue;
                    }

                    // For SIZE_EXCEEDED, reject and create task (no quota reservation needed)
                    if (storageCheck.reason === "SIZE_EXCEEDED") {
                        await prisma.inboundIngestion.update({
                            where: { id: ingestion.id },
                            data: {
                                status: "rejected_size_exceeded",
                                errorMessage: storageCheck.message,
                                processedAt: new Date(),
                            },
                        });

                        // P0-STO-FIX-04: Check for existing pending task before creating
                        const existingTask = await prisma.task.findFirst({
                            where: {
                                organizationId: org.id,
                                quoteId: quote.id,
                                type: "upload_rejected",
                                status: "pending",
                                createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24h
                            },
                        });

                        if (!existingTask) {
                            await prisma.task.create({
                                data: {
                                    organizationId: org.id,
                                    quoteId: quote.id,
                                    type: "upload_rejected",
                                    title: "Upload rejeitado: Ficheiro demasiado grande",
                                    description: storageCheck.message,
                                    priority: "LOW",
                                    status: "pending",
                                },
                            });
                        }

                        log.info({
                            id: ingestion.id,
                            quoteId: quote.id,
                            filename: attachment.name,
                            reason: storageCheck.reason,
                            taskCreated: !existingTask,
                        }, "Attachment rejected - size exceeded");

                        return NextResponse.json({
                            status: "rejected",
                            id: ingestion.id,
                            reason: storageCheck.reason.toLowerCase(),
                            message: storageCheck.message,
                        });
                    }
                }

                // P0-V7: Atomic quota reservation (race-condition safe)
                // This reserves space BEFORE upload - pessimistic reservation
                const quotaReservation = await checkAndReserveStorageQuota(
                    org.id,
                    attachment.size,
                    attachment.type
                );

                if (!quotaReservation.allowed) {
                    // QUOTA_EXCEEDED - reject and create task
                    await prisma.inboundIngestion.update({
                        where: { id: ingestion.id },
                        data: {
                            status: "rejected_quota_exceeded",
                            errorMessage: quotaReservation.message,
                            processedAt: new Date(),
                        },
                    });

                    const existingTask = await prisma.task.findFirst({
                        where: {
                            organizationId: org.id,
                            quoteId: quote.id,
                            type: "upload_rejected",
                            status: "pending",
                            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                        },
                    });

                    if (!existingTask) {
                        await prisma.task.create({
                            data: {
                                organizationId: org.id,
                                quoteId: quote.id,
                                type: "upload_rejected",
                                title: "Upload rejeitado: Quota excedida",
                                description: quotaReservation.message,
                                priority: "LOW",
                                status: "pending",
                            },
                        });
                    }

                    log.info({
                        id: ingestion.id,
                        quoteId: quote.id,
                        filename: attachment.name,
                        reason: quotaReservation.reason,
                        taskCreated: !existingTask,
                    }, "Attachment rejected - quota exceeded");

                    return NextResponse.json({
                        status: "rejected",
                        id: ingestion.id,
                        reason: quotaReservation.reason.toLowerCase(),
                        message: quotaReservation.message,
                    });
                }

                // P0-V7: Quota is now reserved. If upload fails, we MUST call rollback.
                // Process PDF attachment
                try {
                    const buffer = Buffer.from(await attachment.arrayBuffer());

                    // Upload to Supabase Storage
                    const storage = getStorageClient();

                    if (!storage) {
                        log.warn({ id: ingestion.id }, "Storage not configured - rolling back quota");
                        await quotaReservation.rollback();
                        continue;
                    }

                    const storagePath = `proposals/${org.id}/${quote.id}/${Date.now()}-${attachment.name}`;

                    const { error: uploadError } = await storage.storage
                        .from("attachments")
                        .upload(storagePath, buffer, {
                            contentType: "application/pdf",
                            upsert: false,
                        });

                    if (uploadError) {
                        // P0-V7: Upload failed - rollback quota reservation
                        log.error({ id: ingestion.id, error: uploadError.message }, "Attachment upload failed - rolling back quota");
                        await quotaReservation.rollback();
                        continue;
                    }

                    // Get retention policy for expiration date
                    const retentionPolicy = await getRetentionPolicy(org.id);

                    // Create Attachment record with expiration
                    const attachmentRecord = await prisma.attachment.create({
                        data: {
                            organizationId: org.id,
                            filename: attachment.name,
                            contentType: "application/pdf",
                            sizeBytes: BigInt(attachment.size),
                            storagePath,
                            expiresAt: retentionPolicy.expiresAt,
                        },
                    });

                    // P0-V7: Storage usage was already incremented by atomic reservation
                    // No need to call incrementStorageUsage() separately

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
                        filename: attachment.name,
                        expiresAt: retentionPolicy.expiresAt,
                    }, "PDF attachment processed");

                    break; // Only process first valid PDF
                } catch (err) {
                    // P0-V7: Any error during processing - rollback quota
                    log.error({ id: ingestion.id, error: err }, "Attachment processing error - rolling back quota");
                    await quotaReservation.rollback();
                }
            }
        }

        // If no attachment processed, try to extract link from body
        let linkProcessed = false;
        if (!attachmentProcessed) {
            // Only set link if quote doesn't already have a proposal
            if (!quote.proposalLink && !quote.proposalFileId) {
                const link = extractLinkFromHtml(bodyHtml || "") || extractLinkFromText(bodyPlain || "");

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

                    linkProcessed = true;
                    log.info({ id: ingestion.id, quoteId: quote.id, link }, "Link extracted from email body");
                } else {
                    // No attachment and no link found
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
                // Quote already has proposal - just mark as processed
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

        // Track BCC inbound success and increment trial counter if applicable
        const captureSuccessful = attachmentProcessed || linkProcessed;
        if (captureSuccessful) {
            // Increment trial BCC capture counter if in trial
            if (entitlements.tier === "trial") {
                const captureResult = await incrementTrialBccCapture(org.id);

                // Track "aha moment" if this was the first capture
                if (captureResult.isFirstCapture) {
                    await trackEvent(ProductEventNames.AHA_BCC_INBOUND_FIRST_SUCCESS, {
                        organizationId: org.id,
                        props: {
                            quoteId: quote.id,
                            ingestionId: ingestion.id,
                            hasAttachment: attachmentProcessed,
                        },
                    });

                    log.info({
                        id: ingestion.id,
                        orgId: org.id,
                        quoteId: quote.id,
                    }, "Aha moment: First BCC capture in trial");
                }
            }

            // Track generic BCC processed event
            await trackEvent(ProductEventNames.BCC_INBOUND_PROCESSED, {
                organizationId: org.id,
                props: {
                    quoteId: quote.id,
                    ingestionId: ingestion.id,
                    hasAttachment: attachmentProcessed,
                    tier: entitlements.tier,
                },
            });
        }

        const durationMs = Date.now() - startTime;
        log.info({ id: ingestion.id, durationMs }, "Inbound processing complete");

        return NextResponse.json({
            status: "processed",
            id: ingestion.id,
            quoteId: quote.id,
            attachmentProcessed,
        });
    } catch (error) {
        log.error({ error }, "Inbound webhook error");
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
