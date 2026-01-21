/**
 * Email Service - SMTP/Resend Outbound
 *
 * Handles sending emails via:
 * 1. Per-org SMTP (if configured)
 * 2. Resend (default/fallback)
 *
 * Features:
 * - Suppression list checking
 * - Send window validation (9-18h in org timezone)
 * - Email logging
 * - Opt-out link injection
 */

import { Resend } from "resend";
import nodemailer from "nodemailer";
import { prisma } from "./prisma";
import { logger } from "./logger";
import { createUnsubscribeToken, decryptCredentialWithFallback } from "./tokens";
import { PUBLIC_APP_URL, DEFAULT_EMAIL_FROM } from "./config";

// Types
export interface SendEmailParams {
    organizationId: string;
    quoteId?: string;
    cadenceEventId?: string;
    templateId?: string;
    to: string;
    subject: string;
    body: string;
    html?: string;
    replyTo?: string;
}

export interface SendEmailResult {
    success: boolean;
    provider?: "smtp" | "resend" | "stub";
    messageId?: string;
    error?: string;
    suppressed?: boolean;
    deferred?: boolean; // Outside send window
}

interface OrgSmtpConfig {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
}

// Environment config for Resend (default provider)
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = DEFAULT_EMAIL_FROM;

const log = logger.child({ service: "email" });

/**
 * Mask email for logging (privacy)
 * user@example.com -> u***@example.com
 */
function maskEmail(email: string): string {
    const [local, domain] = email.split("@");
    if (!domain) return "***";
    const masked = local.length > 1 ? local[0] + "***" : "***";
    return `${masked}@${domain}`;
}

/**
 * Check if email is suppressed (opt-out, bounce, etc.)
 */
export async function isEmailSuppressed(organizationId: string, email: string): Promise<boolean> {
    const suppression = await prisma.suppressionGlobal.findUnique({
        where: {
            organizationId_email: { organizationId, email: email.toLowerCase() },
        },
    });
    return !!suppression;
}

/**
 * Check if current time is within send window (9-18h in org timezone)
 */
export function isWithinSendWindow(
    timezone: string,
    windowStart: string = "09:00",
    windowEnd: string = "18:00"
): boolean {
    const now = new Date();

    // Get current hour in org timezone
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "numeric",
        minute: "numeric",
        hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find(p => p.type === "hour")?.value || "0");
    const minute = parseInt(parts.find(p => p.type === "minute")?.value || "0");
    const currentMinutes = hour * 60 + minute;

    const [startHour, startMin] = windowStart.split(":").map(Number);
    const [endHour, endMin] = windowEnd.split(":").map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Get SMTP config for organization (if configured)
 */
async function getOrgSmtpConfig(organizationId: string): Promise<OrgSmtpConfig | null> {
    const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
            smtpHost: true,
            smtpPort: true,
            smtpUser: true,
            smtpPassEncrypted: true,
            smtpFrom: true,
        },
    });

    if (!org?.smtpHost || !org?.smtpUser || !org?.smtpPassEncrypted) {
        return null;
    }

    // Decrypt password (supports AES-256-GCM with base64 fallback for migration)
    const pass = decryptCredentialWithFallback(org.smtpPassEncrypted);

    return {
        host: org.smtpHost,
        port: org.smtpPort || 587,
        user: org.smtpUser,
        pass,
        from: org.smtpFrom || `Ritmo <${org.smtpUser}>`,
    };
}

/**
 * Build opt-out link for email footer (with signed token)
 */
function buildOptOutLink(organizationId: string, email: string): string {
    const token = createUnsubscribeToken(organizationId, email);
    return `${PUBLIC_APP_URL}/unsubscribe?t=${token}`;
}

/**
 * Inject opt-out link into email body
 */
function injectOptOutLink(body: string, optOutLink: string): string {
    const footer = `\n\n---\nPara deixar de receber estes emails: ${optOutLink}`;
    return body + footer;
}

/**
 * Send email via SMTP
 */
async function sendViaSmtp(config: OrgSmtpConfig, params: {
    to: string;
    subject: string;
    body: string;
    html?: string;
    replyTo?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
        const transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.port === 465,
            auth: {
                user: config.user,
                pass: config.pass,
            },
        });

        const result = await transporter.sendMail({
            from: config.from,
            to: params.to,
            subject: params.subject,
            text: params.body,
            html: params.html,
            replyTo: params.replyTo,
        });

        log.info({ messageId: result.messageId, to: maskEmail(params.to) }, "Email sent via SMTP");

        return {
            success: true,
            messageId: result.messageId,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "SMTP send failed";
        log.error({ error: message, to: maskEmail(params.to) }, "SMTP send failed");
        return {
            success: false,
            error: message,
        };
    }
}

/**
 * Send email via Resend
 */
async function sendViaResend(params: {
    to: string;
    subject: string;
    body: string;
    html?: string;
    replyTo?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!RESEND_API_KEY || RESEND_API_KEY === "re_test_xxx") {
        log.info({ to: maskEmail(params.to) }, "STUB: Email would be sent (no Resend API key)");
        return {
            success: true,
            messageId: `stub-${Date.now()}`,
        };
    }

    try {
        const resend = new Resend(RESEND_API_KEY);
        const result = await resend.emails.send({
            from: RESEND_FROM,
            to: params.to,
            subject: params.subject,
            text: params.body,
            html: params.html,
            replyTo: params.replyTo,
        });

        if (result.error) {
            log.error({ error: result.error, to: maskEmail(params.to) }, "Resend send failed");
            return {
                success: false,
                error: result.error.message,
            };
        }

        log.info({ messageId: result.data?.id, to: maskEmail(params.to) }, "Email sent via Resend");

        return {
            success: true,
            messageId: result.data?.id,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Resend send failed";
        log.error({ error: message, to: maskEmail(params.to) }, "Resend exception");
        return {
            success: false,
            error: message,
        };
    }
}

// Minimum hours between emails for same quote (anti-spam)
const MIN_HOURS_BETWEEN_EMAILS = 48;

/**
 * Check if enough time has passed since last email for this quote
 */
async function checkEmailCooldown(quoteId: string | undefined): Promise<{ allowed: boolean; hoursRemaining?: number }> {
    if (!quoteId) return { allowed: true };

    const cooldownThreshold = new Date(Date.now() - MIN_HOURS_BETWEEN_EMAILS * 60 * 60 * 1000);

    const recentEmail = await prisma.emailLog.findFirst({
        where: {
            quoteId,
            status: "sent",
            sentAt: { gt: cooldownThreshold },
        },
        orderBy: { sentAt: "desc" },
    });

    if (recentEmail && recentEmail.sentAt) {
        const hoursSinceLastEmail = (Date.now() - recentEmail.sentAt.getTime()) / (60 * 60 * 1000);
        return {
            allowed: false,
            hoursRemaining: Math.ceil(MIN_HOURS_BETWEEN_EMAILS - hoursSinceLastEmail),
        };
    }

    return { allowed: true };
}

/**
 * Main send email function with full logging and checks
 */
export async function sendCadenceEmail(params: SendEmailParams): Promise<SendEmailResult> {
    const { organizationId, quoteId, cadenceEventId, templateId, to, subject, body, html, replyTo } = params;

    // Check 48h cooldown per quote
    const cooldown = await checkEmailCooldown(quoteId);
    if (!cooldown.allowed) {
        log.info({ quoteId, hoursRemaining: cooldown.hoursRemaining }, "Email deferred - 48h cooldown");
        return {
            success: false,
            deferred: true,
            error: `Email cooldown: wait ${cooldown.hoursRemaining}h`,
        };
    }

    // Check suppression
    if (await isEmailSuppressed(organizationId, to)) {
        log.info({ to: maskEmail(to), organizationId }, "Email suppressed");

        // Log as suppressed
        await prisma.emailLog.create({
            data: {
                organizationId,
                quoteId,
                cadenceEventId,
                templateId,
                toEmail: to.toLowerCase(),
                subject,
                status: "failed",
                errorMessage: "suppressed",
            },
        });

        return {
            success: false,
            suppressed: true,
            error: "Email is suppressed (opt-out/bounce)",
        };
    }

    // Get org settings for send window check
    const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
            timezone: true,
            sendWindowStart: true,
            sendWindowEnd: true,
        },
    });

    // Check send window
    if (org && !isWithinSendWindow(org.timezone, org.sendWindowStart, org.sendWindowEnd)) {
        log.info({ to: maskEmail(to), organizationId, timezone: org.timezone }, "Outside send window - deferred");
        return {
            success: false,
            deferred: true,
            error: "Outside send window",
        };
    }

    // Build opt-out link and inject into body
    const optOutLink = buildOptOutLink(organizationId, to);
    const bodyWithOptOut = injectOptOutLink(body, optOutLink);
    const htmlWithOptOut = html ? html + `<br><br><hr><p style="font-size:12px;color:#666;">Para deixar de receber estes emails: <a href="${optOutLink}">Cancelar subscrição</a></p>` : undefined;

    // Try org SMTP first, fallback to Resend
    const smtpConfig = await getOrgSmtpConfig(organizationId);

    let result: { success: boolean; messageId?: string; error?: string };
    let provider: "smtp" | "resend" | "stub";

    if (smtpConfig) {
        provider = "smtp";
        result = await sendViaSmtp(smtpConfig, {
            to,
            subject,
            body: bodyWithOptOut,
            html: htmlWithOptOut,
            replyTo,
        });
    } else {
        provider = RESEND_API_KEY && RESEND_API_KEY !== "re_test_xxx" ? "resend" : "stub";
        result = await sendViaResend({
            to,
            subject,
            body: bodyWithOptOut,
            html: htmlWithOptOut,
            replyTo,
        });
    }

    // Log the email
    await prisma.emailLog.create({
        data: {
            organizationId,
            quoteId,
            cadenceEventId,
            templateId,
            toEmail: to.toLowerCase(),
            subject,
            provider,
            providerMessageId: result.messageId,
            status: result.success ? "sent" : "failed",
            sentAt: result.success ? new Date() : null,
            errorMessage: result.error,
        },
    });

    return {
        success: result.success,
        provider,
        messageId: result.messageId,
        error: result.error,
    };
}

/**
 * Check if organization has email capability (SMTP or Resend)
 */
export async function hasEmailCapability(organizationId: string): Promise<boolean> {
    // Resend stub always works for dev
    if (RESEND_API_KEY) {
        return true;
    }

    const smtpConfig = await getOrgSmtpConfig(organizationId);
    return !!smtpConfig;
}

/**
 * Legacy sendEmail function for backwards compatibility
 */
export async function sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    from?: string;
    replyTo?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return sendViaResend({
        to: options.to,
        subject: options.subject,
        body: options.text || "",
        html: options.html,
        replyTo: options.replyTo,
    });
}
