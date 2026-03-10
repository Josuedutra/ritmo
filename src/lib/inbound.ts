/**
 * Inbound Email Processing - Cloudflare Email Workers & Mailgun
 *
 * Handles incoming emails via BCC capture for proposal attachment and auto-quote creation.
 *
 * BCC Formats:
 * - all+{orgShortId}+{quotePublicId}@inbound.useritmo.pt (attach to existing quote)
 * - all+{orgShortId}@inbound.useritmo.pt (auto-create quote)
 *
 * Features:
 * - Cloudflare signature verification (HMAC-SHA256)
 * - PDF attachment extraction and storage
 * - Link extraction from email body
 * - Auto-create quote from generic BCC (zero-click UX)
 * - Idempotency via providerMessageId
 */

import { createHmac, createHash, timingSafeEqual } from "crypto";
import { logger } from "./logger";
import { INBOUND_DOMAIN as CONFIG_INBOUND_DOMAIN } from "./config";
import { prisma } from "./prisma";
import { generateCadenceEvents } from "./cadence";
import { trackEvent, ProductEventNames } from "./product-events";
import { nanoid } from "nanoid";

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
 * Parse BCC address to extract orgShortId and optionally quotePublicId
 *
 * Supports formats:
 * - all+orgShortId+quotePublicId@inbound.useritmo.pt (existing: attach to quote)
 * - bcc+orgShortId+quotePublicId@inbound.useritmo.pt (legacy/Mailgun)
 * - all+orgShortId@inbound.useritmo.pt (generic: auto-create quote)
 * - bcc+orgShortId@inbound.useritmo.pt (generic legacy)
 * - Case insensitive local part
 */
export function parseBccAddress(
  address: string
): { orgShortId: string; quotePublicId: string | null } | null {
  if (!address) return null;

  // Normalize: lowercase and trim
  const normalized = address.toLowerCase().trim();

  // Extract local part (before @)
  const atIndex = normalized.indexOf("@");
  if (atIndex === -1) return null;

  const localPart = normalized.substring(0, atIndex);

  // Must start with "all+" (Cloudflare) or "bcc+" (legacy)
  if (!localPart.startsWith("all+") && !localPart.startsWith("bcc+")) return null;

  // Split by "+" to get parts
  const parts = localPart.split("+");

  // 3 parts: ["all"/"bcc", "orgShortId", "quotePublicId"] — attach to existing quote
  if (parts.length === 3) {
    const [, orgShortId, quotePublicId] = parts;
    if (!orgShortId || !quotePublicId) return null;
    return { orgShortId, quotePublicId };
  }

  // 2 parts: ["all"/"bcc", "orgShortId"] — generic BCC, auto-create quote
  if (parts.length === 2) {
    const [, orgShortId] = parts;
    if (!orgShortId) return null;
    return { orgShortId, quotePublicId: null };
  }

  return null;
}

/**
 * Find BCC address in recipient list
 *
 * Mailgun sends recipients as comma-separated string or in various headers
 */
export function findBccInRecipients(
  recipients: string
): { orgShortId: string; quotePublicId: string | null } | null {
  if (!recipients) return null;

  // Split by comma and check each
  const addresses = recipients.split(",").map((r) => r.trim());

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

/**
 * Generate generic BCC address for an organization (no quotePublicId)
 *
 * Used for auto-create flow: user sends BCC without pre-creating a quote
 */
export function generateGenericBccAddress(orgShortId: string): string {
  return `all+${orgShortId}@${INBOUND_DOMAIN}`;
}

/**
 * Parse email address from "Name <email>" format or plain email
 *
 * Returns { name, email } or null if unparseable
 */
export function parseEmailAddress(raw: string): { name: string | null; email: string } | null {
  if (!raw) return null;

  const trimmed = raw.trim();

  // Format: "Name <email@example.com>"
  const bracketMatch = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
  if (bracketMatch) {
    const name = bracketMatch[1].replace(/^["']|["']$/g, "").trim() || null;
    const email = bracketMatch[2].trim().toLowerCase();
    return { name, email };
  }

  // Plain email
  if (trimmed.includes("@")) {
    return { name: null, email: trimmed.toLowerCase() };
  }

  return null;
}

// =============================================================================
// MIME HEADER DECODING (RFC 2047)
// =============================================================================

/**
 * Decode RFC 2047 MIME encoded-word headers
 * e.g. =?UTF-8?B?T3LDp2FtZW50bw==?= → "Orçamento"
 */
export function decodeMimeHeader(header: string): string {
  if (!header || !header.includes("=?")) return header;

  try {
    return header.replace(
      /=\?([^?]+)\?([BbQq])\?([^?]+)\?=/g,
      (_match, charset, encoding, text) => {
        try {
          const enc = encoding.toUpperCase();
          if (enc === "B") {
            // Base64 decode
            const buffer = Buffer.from(text, "base64");
            return buffer.toString(charset.toLowerCase() === "utf-8" ? "utf-8" : charset);
          } else if (enc === "Q") {
            // Quoted-Printable decode
            const decoded = text
              .replace(/_/g, " ")
              .replace(/=([0-9A-Fa-f]{2})/g, (_: string, hex: string) =>
                String.fromCharCode(parseInt(hex, 16))
              );
            return Buffer.from(decoded, "binary").toString(
              charset.toLowerCase() === "utf-8" ? "utf-8" : charset
            );
          }
          return text;
        } catch {
          return text;
        }
      }
    );
  } catch {
    return header;
  }
}

// =============================================================================
// AUTO-CREATE QUOTE FROM BCC
// =============================================================================

export interface AutoCreateQuoteOptions {
  organizationId: string;
  orgTimezone?: string;
  /** Original To: header — the client who received the quote */
  originalTo: string | null;
  /** Email subject — becomes quote title */
  subject: string | null;
  /** Timestamp of when the email was sent */
  emailSentAt: Date;
}

export interface AutoCreateQuoteResult {
  quote: { id: string; publicId: string; title: string };
  contact: { id: string; email: string | null; name: string | null } | null;
  cadenceResult: { runId: number; eventsCreated: number };
}

/**
 * Auto-create a quote from a generic BCC email (no quotePublicId).
 *
 * 1. Parse originalTo → find or create Contact
 * 2. Create Quote with source="bcc", businessStatus="sent"
 * 3. Generate cadence events (D+1, D+3, D+7, D+14)
 * 4. Track product event
 *
 * Returns the created quote, contact, and cadence result.
 */
export async function autoCreateQuoteFromInbound(
  options: AutoCreateQuoteOptions
): Promise<AutoCreateQuoteResult> {
  const {
    organizationId,
    orgTimezone = "Europe/Lisbon",
    originalTo,
    subject,
    emailSentAt,
  } = options;

  // 1. Find or create contact from originalTo
  let contact: { id: string; email: string | null; name: string | null } | null = null;

  if (originalTo) {
    // Parse first address from To: header (may have multiple recipients)
    const firstRecipient = originalTo.split(",")[0]?.trim();
    if (firstRecipient) {
      const parsed = parseEmailAddress(firstRecipient);
      if (parsed) {
        // Try to find existing contact by email in this org
        const existing = await prisma.contact.findFirst({
          where: {
            organizationId,
            email: parsed.email,
          },
          select: { id: true, email: true, name: true },
        });

        if (existing) {
          contact = existing;
        } else {
          // Create new contact
          const newContact = await prisma.contact.create({
            data: {
              organizationId,
              email: parsed.email,
              name: parsed.name,
            },
            select: { id: true, email: true, name: true },
          });
          contact = newContact;
        }
      }
    }
  }

  // 2. Create quote
  const decodedSubject = subject ? decodeMimeHeader(subject) : null;
  const title = decodedSubject ? decodedSubject.substring(0, 100) : "Orçamento via BCC";
  const publicId = nanoid();

  // Find org owner for ownerUserId
  const orgOwner = await prisma.user.findFirst({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  const quote = await prisma.quote.create({
    data: {
      publicId,
      organizationId,
      contactId: contact?.id ?? null,
      title,
      businessStatus: "sent",
      sentAt: emailSentAt,
      firstSentAt: emailSentAt,
      source: "bcc",
      ownerUserId: orgOwner?.id ?? null,
      lastActivityAt: new Date(),
    },
    select: { id: true, publicId: true, title: true },
  });

  // 3. Generate cadence events using sentAt from the email
  const cadenceResult = await generateCadenceEvents({
    quoteId: quote.id,
    organizationId,
    sentAt: emailSentAt,
    quoteValue: null, // No value available from email
    timezone: orgTimezone,
  });

  // 4. Track product event
  await trackEvent(ProductEventNames.QUOTE_AUTO_CREATED_FROM_BCC, {
    organizationId,
    props: {
      quoteId: quote.id,
      hasContact: !!contact,
      hasSubject: !!subject,
      cadenceEventsCreated: cadenceResult.eventsCreated,
    },
  });

  log.info(
    {
      quoteId: quote.id,
      publicId: quote.publicId,
      contactId: contact?.id,
      title: quote.title,
    },
    "Auto-created quote from BCC"
  );

  return { quote, contact, cadenceResult };
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
    const match = matches.find((url) => pattern.test(url));
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
    const found = hrefs.find((url) => pattern.test(url));
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
 * Normalize attachment content type.
 *
 * Some email clients (Outlook, Apple Mail) send PDF attachments with
 * contentType "application/octet-stream" instead of "application/pdf".
 * When the filename has a .pdf extension, treat it as application/pdf.
 */
export function normalizeAttachmentContentType(contentType: string, filename: string): string {
  if (filename.toLowerCase().endsWith(".pdf")) {
    return "application/pdf";
  }
  return contentType;
}

/**
 * Validate attachment for processing
 */
export function validateAttachment(attachment: AttachmentInfo): {
  valid: boolean;
  error?: string;
} {
  // Normalize contentType: some clients send application/octet-stream for PDFs
  const normalizedContentType = normalizeAttachmentContentType(
    attachment.contentType,
    attachment.filename
  );

  // Check content type (PDF only for now)
  if (!normalizedContentType.includes("pdf")) {
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
export function generateIdempotencyKey(
  messageId: string | null,
  timestamp: string,
  token: string
): string {
  if (messageId) {
    return messageId;
  }

  // Fallback: hash of timestamp + token
  return createHash("sha256").update(`${timestamp}:${token}`).digest("hex").substring(0, 32);
}

/**
 * Generate body checksum for additional deduplication
 */
export function generateBodyChecksum(bodyText: string | null, bodyHtml: string | null): string {
  const content = (bodyText || "") + (bodyHtml || "");
  return createHash("sha256").update(content).digest("hex").substring(0, 32);
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
