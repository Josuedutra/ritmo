/**
 * Inbound Email Processing - Cloudflare Email Workers
 *
 * Handles incoming emails via BCC capture for proposal attachment.
 *
 * BCC Format: all+{orgShortId}+{quotePublicId}@inbound.useritmo.pt
 *
 * Features:
 * - Cloudflare signature verification (HMAC-SHA256)
 * - PDF attachment extraction and storage
 * - Link extraction from email body
 * - Idempotency via providerMessageId
 */

import { createHmac, createHash, timingSafeEqual } from "crypto";
import { logger } from "./logger";
import { INBOUND_DOMAIN as CONFIG_INBOUND_DOMAIN } from "./config";

const log = logger.child({ service: "inbound" });

// Environment config
const MAILGUN_SIGNING_KEY = process.env.MAILGUN_SIGNING_KEY;
const INBOUND_DOMAIN = CONFIG_INBOUND_DOMAIN;

// Constants
const MAX_ATTACHMENT_SIZE = 15 * 1024 * 1024; // 15MB
const SIGNATURE_TIMESTAMP_TOLERANCE = 5 * 60; // 5 minutes in seconds

// =============================================================================
// BCC ADDRESS UTILITIES
// =============================================================================

/**
 * Generate BCC address for a quote
 *
 * Uses "all+" prefix for Cloudflare Email Routing compatibility
 * (Cloudflare routes all+xxx@domain to the "all" address rule)
 */
export function generateBccAddress(orgShortId: string, quotePublicId: string): string {
    return `all+${orgShortId}+${quotePublicId}@${INBOUND_DOMAIN}`;
}

/**
 * Parse BCC address to extract orgShortId and quotePublicId
 *
 * Supports formats:
 * - all+orgShortId+quotePublicId@inbound.useritmo.pt (Cloudflare)
 * - bcc+orgShortId+quotePublicId@inbound.useritmo.pt (legacy/Mailgun)
 * - Case insensitive local part
 */
export function parseBccAddress(address: string): { orgShortId: string; quotePublicId: string } | null {
    if (!address) return null;

    // Normalize: lowercase and trim
    const normalized = address.toLowerCase().trim();

    // Extract local part (before @)
    const atIndex = normalized.indexOf("@");
    if (atIndex === -1) return null;

    const localPart = normalized.substring(0, atIndex);

    // Must start with "all+" (Cloudflare) or "bcc+" (legacy)
    if (!localPart.startsWith("all+") && !localPart.startsWith("bcc+")) return null;

    // Split by "+" to get parts: ["all"/"bcc", "orgShortId", "quotePublicId"]
    const parts = localPart.split("+");
    if (parts.length !== 3) return null;

    const [, orgShortId, quotePublicId] = parts;

    if (!orgShortId || !quotePublicId) return null;

    return { orgShortId, quotePublicId };
}

/**
 * Find BCC address in recipient list
 *
 * Mailgun sends recipients as comma-separated string or in various headers
 */
export function findBccInRecipients(recipients: string): { orgShortId: string; quotePublicId: string } | null {
    if (!recipients) return null;

    // Split by comma and check each
    const addresses = recipients.split(",").map(r => r.trim());

    for (const addr of addresses) {
        // Handle format: "Name <email>" or just "email"
        const emailMatch = addr.match(/<([^>]+)>/) || [null, addr];
        const email = emailMatch[1];

        if (email) {
            const parsed = parseBccAddress(email);
            if (parsed) return parsed;
        }
    }

    return null;
}

// =============================================================================
// MAILGUN SIGNATURE VERIFICATION
// =============================================================================

export interface MailgunSignature {
    timestamp: string;
    token: string;
    signature: string;
}

/**
 * Verify Mailgun webhook signature
 *
 * Mailgun signs webhooks with: HMAC-SHA256(timestamp + token, signing_key)
 */
export function verifyMailgunSignature(sig: MailgunSignature): boolean {
    if (!MAILGUN_SIGNING_KEY) {
        log.warn("MAILGUN_SIGNING_KEY not configured - skipping signature verification (dev mode)");
        return true; // Allow in dev mode
    }

    if (!sig.timestamp || !sig.token || !sig.signature) {
        log.warn("Missing signature fields");
        return false;
    }

    // Check timestamp is within tolerance (prevent replay attacks)
    const timestampNum = parseInt(sig.timestamp, 10);
    const now = Math.floor(Date.now() / 1000);

    if (Math.abs(now - timestampNum) > SIGNATURE_TIMESTAMP_TOLERANCE) {
        log.warn({ timestamp: sig.timestamp, now }, "Signature timestamp out of range");
        return false;
    }

    // Compute expected signature
    const expectedSignature = createHmac("sha256", MAILGUN_SIGNING_KEY)
        .update(sig.timestamp + sig.token)
        .digest("hex");

    // Timing-safe comparison
    const sigBuffer = Buffer.from(sig.signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (sigBuffer.length !== expectedBuffer.length) {
        return false;
    }

    return timingSafeEqual(sigBuffer, expectedBuffer);
}

// =============================================================================
// CONTENT EXTRACTION
// =============================================================================

/**
 * Extract first URL from text
 *
 * Prioritizes common document/proposal URLs
 */
export function extractLinkFromText(text: string): string | null {
    if (!text) return null;

    // URL regex - matches http/https URLs
    const urlRegex = /https?:\/\/[^\s<>"')\]]+/gi;
    const matches = text.match(urlRegex);

    if (!matches || matches.length === 0) return null;

    // Prioritize URLs that look like documents/proposals
    const priorityPatterns = [
        /\.pdf$/i,
        /proposal/i,
        /orcamento/i,
        /quote/i,
        /document/i,
        /drive\.google/i,
        /dropbox/i,
        /onedrive/i,
        /sharepoint/i,
    ];

    for (const pattern of priorityPatterns) {
        const match = matches.find(url => pattern.test(url));
        if (match) return cleanUrl(match);
    }

    // Return first URL if no priority match
    return cleanUrl(matches[0]);
}

/**
 * Clean URL by removing trailing punctuation
 */
function cleanUrl(url: string): string {
    // Remove trailing punctuation that might have been captured
    return url.replace(/[.,;:!?)>\]]+$/, "");
}

/**
 * Extract link from HTML (prefers href over plain text)
 */
export function extractLinkFromHtml(html: string): string | null {
    if (!html) return null;

    // Extract href attributes
    const hrefRegex = /href=["']([^"']+)["']/gi;
    const hrefs: string[] = [];

    let match;
    while ((match = hrefRegex.exec(html)) !== null) {
        if (match[1] && match[1].startsWith("http")) {
            hrefs.push(match[1]);
        }
    }

    if (hrefs.length === 0) {
        // Fallback to plain text extraction
        return extractLinkFromText(html.replace(/<[^>]+>/g, " "));
    }

    // Apply same priority logic
    const priorityPatterns = [
        /\.pdf$/i,
        /proposal/i,
        /orcamento/i,
        /quote/i,
        /document/i,
        /drive\.google/i,
        /dropbox/i,
    ];

    for (const pattern of priorityPatterns) {
        const found = hrefs.find(url => pattern.test(url));
        if (found) return found;
    }

    return hrefs[0];
}

// =============================================================================
// ATTACHMENT VALIDATION
// =============================================================================

export interface AttachmentInfo {
    filename: string;
    contentType: string;
    size: number;
    data?: Buffer;
}

/**
 * Validate attachment for processing
 */
export function validateAttachment(attachment: AttachmentInfo): {
    valid: boolean;
    error?: string;
} {
    // Check content type (PDF only for now)
    if (!attachment.contentType.includes("pdf")) {
        return { valid: false, error: "Only PDF attachments are supported" };
    }

    // Check size
    if (attachment.size > MAX_ATTACHMENT_SIZE) {
        return {
            valid: false,
            error: `Attachment too large: ${Math.round(attachment.size / 1024 / 1024)}MB (max ${MAX_ATTACHMENT_SIZE / 1024 / 1024}MB)`,
        };
    }

    return { valid: true };
}

// =============================================================================
// IDEMPOTENCY
// =============================================================================

/**
 * Generate idempotency key from Mailgun webhook data
 *
 * Uses Message-Id if available, otherwise timestamp+token
 */
export function generateIdempotencyKey(messageId: string | null, timestamp: string, token: string): string {
    if (messageId) {
        return messageId;
    }

    // Fallback: hash of timestamp + token
    return createHash("sha256")
        .update(`${timestamp}:${token}`)
        .digest("hex")
        .substring(0, 32);
}

/**
 * Generate body checksum for additional deduplication
 */
export function generateBodyChecksum(bodyText: string | null, bodyHtml: string | null): string {
    const content = (bodyText || "") + (bodyHtml || "");
    return createHash("sha256")
        .update(content)
        .digest("hex")
        .substring(0, 32);
}

// =============================================================================
// LOGGING HELPERS
// =============================================================================

/**
 * Mask email for privacy in logs
 */
export function maskEmail(email: string): string {
    const [local, domain] = email.split("@");
    if (!domain) return "***";
    const masked = local.length > 1 ? local[0] + "***" : "***";
    return `${masked}@${domain}`;
}

/**
 * Sanitize log data (remove PII)
 */
export function sanitizeForLog(data: {
    from?: string;
    to?: string;
    subject?: string;
    bodyText?: string;
    bodyHtml?: string;
}): Record<string, unknown> {
    return {
        from: data.from ? maskEmail(data.from) : undefined,
        to: data.to ? maskEmail(data.to) : undefined,
        subject: data.subject ? `${data.subject.substring(0, 50)}...` : undefined,
        bodyLength: (data.bodyText?.length || 0) + (data.bodyHtml?.length || 0),
    };
}

// Export constants for use in route
export { MAX_ATTACHMENT_SIZE, INBOUND_DOMAIN };
