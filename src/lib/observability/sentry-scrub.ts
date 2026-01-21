/**
 * Sentry PII Scrubbing
 *
 * Scrubs sensitive data before sending to Sentry:
 * - Emails (user.email, message body)
 * - Tokens (authorization headers, query params)
 * - Auth headers (Cookie, X-Auth-*)
 *
 * P0 Observability requirement.
 */

import type { ErrorEvent, EventHint, Breadcrumb } from "@sentry/nextjs";

// Patterns to detect and mask
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const TOKEN_REGEX = /(bearer\s+|token[=:]\s*|api[_-]?key[=:]\s*|secret[=:]\s*)([a-zA-Z0-9_-]{20,})/gi;
const JWT_REGEX = /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g;

// Headers to scrub entirely
const SENSITIVE_HEADERS = [
    "authorization",
    "cookie",
    "x-auth-token",
    "x-api-key",
    "x-session-token",
];

/**
 * Mask an email address for privacy
 * "john.doe@example.com" -> "j***@example.com"
 */
export function maskEmail(email: string): string {
    const [local, domain] = email.split("@");
    if (!domain) return "[EMAIL]";
    const masked = local && local.length > 1 ? local[0] + "***" : "***";
    return `${masked}@${domain}`;
}

/**
 * Scrub sensitive data from a string
 */
export function scrubString(value: string): string {
    if (!value || typeof value !== "string") return value;

    let scrubbed = value;

    // Mask emails
    scrubbed = scrubbed.replace(EMAIL_REGEX, (match) => maskEmail(match));

    // Mask tokens (bearer, api keys, etc)
    scrubbed = scrubbed.replace(TOKEN_REGEX, (_, prefix) => `${prefix}[REDACTED]`);

    // Mask JWTs
    scrubbed = scrubbed.replace(JWT_REGEX, "[JWT_REDACTED]");

    return scrubbed;
}

/**
 * Recursively scrub an object
 */
export function scrubObject(obj: unknown): unknown {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === "string") {
        return scrubString(obj);
    }

    if (Array.isArray(obj)) {
        return obj.map(scrubObject);
    }

    if (typeof obj === "object") {
        const scrubbed: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
            // Scrub sensitive header values entirely
            if (SENSITIVE_HEADERS.includes(key.toLowerCase())) {
                scrubbed[key] = "[REDACTED]";
            } else {
                scrubbed[key] = scrubObject(value);
            }
        }
        return scrubbed;
    }

    return obj;
}

/**
 * Sentry beforeSend hook to scrub PII from events
 *
 * Usage in sentry.*.config.ts:
 * ```
 * Sentry.init({
 *   beforeSend: scrubEvent,
 * });
 * ```
 */
export function scrubEvent(event: ErrorEvent, _hint?: EventHint): ErrorEvent | null {
    // Scrub user data
    if (event.user) {
        if (event.user.email) {
            event.user.email = maskEmail(event.user.email);
        }
        if (event.user.username) {
            event.user.username = scrubString(event.user.username);
        }
        if (event.user.ip_address) {
            event.user.ip_address = "[REDACTED]";
        }
    }

    // Scrub request data
    if (event.request) {
        // Scrub headers
        if (event.request.headers) {
            event.request.headers = scrubObject(event.request.headers) as Record<string, string>;
        }

        // Scrub query string
        if (event.request.query_string) {
            event.request.query_string = scrubString(
                typeof event.request.query_string === "string"
                    ? event.request.query_string
                    : JSON.stringify(event.request.query_string)
            );
        }

        // Scrub cookies
        if (event.request.cookies) {
            event.request.cookies = { _scrubbed: "[REDACTED]" };
        }

        // Scrub request body/data
        if (event.request.data) {
            event.request.data = scrubObject(event.request.data);
        }
    }

    // Scrub breadcrumbs
    if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((crumb: Breadcrumb) => {
            if (crumb.message) {
                crumb.message = scrubString(crumb.message);
            }
            if (crumb.data) {
                crumb.data = scrubObject(crumb.data) as Record<string, unknown>;
            }
            return crumb;
        });
    }

    // Scrub exception messages and stack traces
    if (event.exception?.values) {
        event.exception.values = event.exception.values.map((exc) => {
            if (exc.value) {
                exc.value = scrubString(exc.value);
            }
            if (exc.stacktrace?.frames) {
                exc.stacktrace.frames = exc.stacktrace.frames.map((frame) => {
                    if (frame.vars) {
                        frame.vars = scrubObject(frame.vars) as Record<string, unknown>;
                    }
                    return frame;
                });
            }
            return exc;
        });
    }

    // Scrub extra context
    if (event.extra) {
        event.extra = scrubObject(event.extra) as Record<string, unknown>;
    }

    // Scrub tags
    if (event.tags) {
        event.tags = scrubObject(event.tags) as Record<string, string>;
    }

    // Scrub contexts
    if (event.contexts) {
        event.contexts = scrubObject(event.contexts) as Record<string, Record<string, unknown>>;
    }

    return event;
}
