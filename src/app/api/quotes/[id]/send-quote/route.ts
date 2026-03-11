import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import nodemailer from "nodemailer";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import {
  getApiSession,
  unauthorized,
  notFound,
  badRequest,
  serverError,
  success,
} from "@/lib/api-utils";
import { getEntitlements, incrementTrialUsage, incrementQuotesSent } from "@/lib/entitlements";
import { generateCadenceEvents } from "@/lib/cadence";
import { trackAhaEvent } from "@/lib/product-events";
import { downloadFile } from "@/lib/storage";
import { decryptCredentialWithFallback } from "@/lib/tokens";
import { DEFAULT_EMAIL_FROM } from "@/lib/config";
import { logger } from "@/lib/logger";

const log = logger.child({ service: "send-quote" });

interface RouteParams {
  params: Promise<{ id: string }>;
}

const SendQuoteSchema = z.object({
  to: z.string().email("Email inválido"),
  subject: z.string().min(1, "Assunto obrigatório"),
  body: z.string().min(1, "Mensagem obrigatória"),
});

/**
 * POST /api/quotes/:id/send-quote
 *
 * Sends the initial quote email directly from Ritmo.
 * - Sends via org SMTP or Resend (same as cadence emails)
 * - Attaches proposal PDF from R2 if available
 * - Calls mark-sent internally to start cadence
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getApiSession();
    if (!session) return unauthorized();

    const { id } = await params;

    // Parse and validate body
    const json = await request.json();
    const parsed = SendQuoteSchema.safeParse(json);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message || "Dados inválidos");
    }
    const { to, subject, body } = parsed.data;

    // Get quote with all needed relations
    const quote = await prisma.quote.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
      include: {
        contact: {
          select: { id: true, email: true, name: true },
        },
        organization: {
          select: {
            timezone: true,
            smtpHost: true,
            smtpPort: true,
            smtpUser: true,
            smtpPassEncrypted: true,
            smtpFrom: true,
          },
        },
        proposalFile: {
          select: {
            filename: true,
            contentType: true,
            storagePath: true,
          },
        },
      },
    });

    if (!quote) {
      return notFound("Quote");
    }

    // Only allow sending if quote is in draft or sent state (not won/lost)
    if (quote.businessStatus === "won" || quote.businessStatus === "lost") {
      return badRequest(`Não é possível enviar um orçamento ${quote.businessStatus}.`);
    }

    // Check entitlements (first send counts against quota)
    const isFirstSend = !quote.firstSentAt;
    if (isFirstSend) {
      const entitlements = await getEntitlements(session.user.organizationId);
      if (!entitlements.canMarkSent.allowed) {
        const statusCode = entitlements.canMarkSent.reason === "SUBSCRIPTION_CANCELLED" ? 403 : 402;
        return NextResponse.json(
          {
            error: entitlements.canMarkSent.reason,
            message: entitlements.canMarkSent.message,
            limit: entitlements.effectivePlanLimit,
            used: entitlements.quotesUsed,
            action: entitlements.canMarkSent.ctaAction,
            redirectUrl: entitlements.canMarkSent.ctaUrl || "/settings/billing",
          },
          { status: statusCode }
        );
      }
    }

    // Fetch PDF attachment if available
    let attachmentBuffer: Buffer | null = null;
    let attachmentFilename: string | null = null;
    let attachmentContentType: string | null = null;

    if (quote.proposalFile?.storagePath) {
      const download = await downloadFile(quote.proposalFile.storagePath);
      if (download.success && download.buffer) {
        attachmentBuffer = download.buffer;
        attachmentFilename = quote.proposalFile.filename;
        attachmentContentType = quote.proposalFile.contentType || "application/pdf";
        log.info({ quoteId: id, filename: attachmentFilename }, "PDF attachment loaded");
      } else {
        log.warn(
          { quoteId: id, error: download.error },
          "Could not load PDF attachment — sending without it"
        );
      }
    }

    // Send via org SMTP or Resend
    const org = quote.organization;
    let sendResult: { success: boolean; messageId?: string; error?: string };
    let provider: "smtp" | "resend" | "stub";

    if (org.smtpHost && org.smtpUser && org.smtpPassEncrypted) {
      // Send via org SMTP
      provider = "smtp";
      const smtpPass = decryptCredentialWithFallback(org.smtpPassEncrypted);
      const transporter = nodemailer.createTransport({
        host: org.smtpHost,
        port: org.smtpPort || 587,
        secure: (org.smtpPort || 587) === 465,
        auth: { user: org.smtpUser, pass: smtpPass },
      });

      const mailOptions: nodemailer.SendMailOptions = {
        from: org.smtpFrom || `Ritmo <${org.smtpUser}>`,
        to,
        subject,
        text: body,
      };

      if (attachmentBuffer && attachmentFilename) {
        mailOptions.attachments = [
          {
            filename: attachmentFilename,
            content: attachmentBuffer,
            contentType: attachmentContentType || "application/pdf",
          },
        ];
      }

      try {
        const result = await transporter.sendMail(mailOptions);
        sendResult = { success: true, messageId: result.messageId };
        log.info({ messageId: result.messageId, quoteId: id }, "Quote email sent via SMTP");
      } catch (err) {
        const message = err instanceof Error ? err.message : "SMTP send failed";
        log.error({ error: message, quoteId: id }, "SMTP send failed");
        sendResult = { success: false, error: message };
      }
    } else {
      // Send via Resend
      const RESEND_API_KEY = process.env.RESEND_API_KEY;

      if (!RESEND_API_KEY || RESEND_API_KEY === "re_test_xxx") {
        // Stub for dev/test
        provider = "stub";
        log.info({ quoteId: id, to }, "STUB: Quote email would be sent (no Resend API key)");
        sendResult = { success: true, messageId: `stub-${Date.now()}` };
      } else {
        provider = "resend";
        try {
          const resend = new Resend(RESEND_API_KEY);
          const resendPayload: Parameters<typeof resend.emails.send>[0] = {
            from: DEFAULT_EMAIL_FROM,
            to,
            subject,
            text: body,
          };

          if (attachmentBuffer && attachmentFilename) {
            resendPayload.attachments = [
              {
                filename: attachmentFilename,
                content: attachmentBuffer,
              },
            ];
          }

          const result = await resend.emails.send(resendPayload);
          if (result.error) {
            log.error({ error: result.error, quoteId: id }, "Resend send failed");
            sendResult = { success: false, error: result.error.message };
          } else {
            log.info({ messageId: result.data?.id, quoteId: id }, "Quote email sent via Resend");
            sendResult = { success: true, messageId: result.data?.id };
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : "Resend send failed";
          log.error({ error: message, quoteId: id }, "Resend exception");
          sendResult = { success: false, error: message };
        }
      }
    }

    if (!sendResult.success) {
      return NextResponse.json(
        { error: "SEND_FAILED", message: sendResult.error || "Falha ao enviar email" },
        { status: 502 }
      );
    }

    // Log the email
    await prisma.emailLog.create({
      data: {
        organizationId: session.user.organizationId,
        quoteId: id,
        toEmail: to.toLowerCase(),
        subject,
        provider,
        providerMessageId: sendResult.messageId,
        status: "sent",
        sentAt: new Date(),
      },
    });

    // Mark as sent and start cadence (same logic as mark-sent route)
    const now = new Date();
    const timezone = quote.organization.timezone;

    await prisma.quote.update({
      where: { id },
      data: {
        businessStatus: "sent",
        sentAt: now,
        ...(isFirstSend && { firstSentAt: now }),
        lastActivityAt: now,
      },
    });

    const cadenceResult = await generateCadenceEvents({
      quoteId: id,
      organizationId: session.user.organizationId,
      sentAt: now,
      quoteValue: quote.value,
      timezone,
    });

    // Increment usage counters on first send
    if (isFirstSend) {
      const entitlements = await getEntitlements(session.user.organizationId);
      if (entitlements.tier === "trial") {
        await incrementTrialUsage(session.user.organizationId);
      }
      await incrementQuotesSent(session.user.organizationId);

      trackAhaEvent(
        session.user.organizationId,
        session.user.id,
        id,
        cadenceResult.eventsCreated,
        false
      );
    }

    return success({
      sent: true,
      sentAt: now.toISOString(),
      to,
      provider,
      cadence: cadenceResult,
      attachmentSent: !!attachmentBuffer,
    });
  } catch (error) {
    return serverError(error, "POST /api/quotes/:id/send-quote");
  }
}
