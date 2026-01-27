import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/inbound-email
 * 
 * Inbound email webhook for BCC capture (legacy stub — Sprint 0).
 * Primary provider is Cloudflare Email Workers (see /api/inbound/cloudflare).
 * Mailgun fallback available at /api/inbound/mailgun.
 * 
 * Expected payload format (Resend-like):
 * {
 *   from: "sender@example.com",
 *   to: ["bcc+org123+quote456@inbound.ritmo.app"],
 *   subject: "RE: Quote",
 *   text: "Body text...",
 *   html: "<p>Body HTML...</p>",
 *   attachments: [{ filename, content (base64), contentType }]
 * }
 */
export async function POST(request: NextRequest) {
    const log = logger.child({ endpoint: "webhooks/inbound-email" });

    // TODO: Validate webhook signature (provider-specific)
    // For now, log the raw payload for debugging

    let payload;
    try {
        payload = await request.json();
    } catch {
        log.error("Invalid JSON payload");
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    log.info({
        from: payload.from,
        to: payload.to,
        subject: payload.subject,
        hasAttachments: Array.isArray(payload.attachments) && payload.attachments.length > 0,
    }, "Inbound email received");

    // =========================================================================
    // STUB: Sprint 3 will implement:
    // 1. Parse To address to extract org_id and quote_id
    // 2. Validate quote exists and belongs to org
    // 3. If has PDF attachment → upload to storage, link to quote
    // 4. If has link in body → extract and set proposal_link
    // 5. Create inbound_ingestions record
    // =========================================================================

    // For Sprint 0: Just log and store raw payload
    try {
        await prisma.inboundIngestion.create({
            data: {
                rawFrom: payload.from || null,
                rawTo: Array.isArray(payload.to) ? payload.to.join(", ") : payload.to,
                rawSubject: payload.subject || null,
                rawBodyText: payload.text?.slice(0, 10000) || null, // Limit size
                provider: "cloudflare", // Legacy stub — default to primary provider
                status: "pending",
            },
        });
    } catch (error) {
        log.error({ error }, "Failed to store inbound ingestion");
        // Don't fail the webhook - provider might retry
    }

    return NextResponse.json({
        success: true,
        message: "STUB: Inbound email logged (Sprint 0)",
    });
}
