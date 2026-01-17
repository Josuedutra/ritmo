import { Resend } from "resend";
import { logger } from "@/lib/logger";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
    from?: string;
    replyTo?: string;
}

interface SendEmailResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

/**
 * Send email via Resend
 * 
 * STUB for Sprint 0 - actual implementation in Sprint 2
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    const log = logger.child({ service: "email" });

    const from = options.from || process.env.EMAIL_FROM || "Ritmo <noreply@ritmo.app>";

    // In development/sandbox, just log
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === "re_test_xxx") {
        log.info({
            to: options.to,
            subject: options.subject,
            from,
        }, "STUB: Email would be sent (no API key)");

        return {
            success: true,
            messageId: `stub-${Date.now()}`,
        };
    }

    try {
        const result = await resend.emails.send({
            from,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text,
            replyTo: options.replyTo,
        });

        if (result.error) {
            log.error({ error: result.error }, "Failed to send email");
            return {
                success: false,
                error: result.error.message,
            };
        }

        log.info({
            messageId: result.data?.id,
            to: options.to,
        }, "Email sent successfully");

        return {
            success: true,
            messageId: result.data?.id,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        log.error({ error: message }, "Email send exception");
        return {
            success: false,
            error: message,
        };
    }
}
