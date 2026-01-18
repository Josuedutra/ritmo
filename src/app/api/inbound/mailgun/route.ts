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
import { canUseBccInbound } from "@/lib/entitlements";

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

        // P0-04: Check if org has BCC inbound feature enabled (paid/trial only)
        const bccEnabled = await canUseBccInbound(org.id);
        if (!bccEnabled) {
            // Accept webhook but reject processing - feature disabled for free tier
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

                // Process PDF attachment
                try {
                    const buffer = Buffer.from(await attachment.arrayBuffer());

                    // Upload to Supabase Storage
                    const storage = getStorageClient();

                    if (!storage) {
                        log.warn({ id: ingestion.id }, "Storage not configured - skipping attachment");
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
                        log.error({ id: ingestion.id, error: uploadError.message }, "Attachment upload failed");
                        continue;
                    }

                    // Create Attachment record
                    const attachmentRecord = await prisma.attachment.create({
                        data: {
                            organizationId: org.id,
                            filename: attachment.name,
                            contentType: "application/pdf",
                            sizeBytes: BigInt(attachment.size),
                            storagePath,
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
                        filename: attachment.name,
                    }, "PDF attachment processed");

                    break; // Only process first valid PDF
                } catch (err) {
                    log.error({ id: ingestion.id, error: err }, "Attachment processing error");
                }
            }
        }

        // If no attachment processed, try to extract link from body
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
