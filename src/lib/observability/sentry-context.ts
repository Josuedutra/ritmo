/**
 * Sentry Context Utilities
 *
 * Helpers for setting Sentry context in API routes and server components.
 * P0 Observability requirement.
 */

import * as Sentry from "@sentry/nextjs";
import { REQUEST_ID_HEADER } from "./request-id";

/**
 * Set Sentry request context from a Request object.
 * Call this at the beginning of API route handlers.
 *
 * Sets:
 * - request_id tag for correlation
 * - url tag for easier filtering
 */
export function setSentryRequestContext(request: Request): void {
    const requestId = request.headers.get(REQUEST_ID_HEADER);
    if (requestId) {
        Sentry.setTag("request_id", requestId);
    }

    // Set URL without query params for context
    const url = new URL(request.url);
    Sentry.setTag("url_path", url.pathname);
}

/**
 * Set Sentry user context (PII-safe).
 * Only set org/user IDs, not emails.
 */
export function setSentryUserContext(
    organizationId?: string | null,
    userId?: string | null
): void {
    if (organizationId || userId) {
        Sentry.setUser({
            // Only IDs, no email
            id: userId || undefined,
        });
        if (organizationId) {
            Sentry.setTag("organization_id", organizationId);
        }
    }
}

/**
 * Capture an error with additional context.
 * Wraps Sentry.captureException with standard context.
 */
export function captureError(
    error: Error,
    context?: {
        requestId?: string;
        organizationId?: string;
        userId?: string;
        extra?: Record<string, unknown>;
    }
): string {
    if (context?.requestId) {
        Sentry.setTag("request_id", context.requestId);
    }
    if (context?.organizationId) {
        Sentry.setTag("organization_id", context.organizationId);
    }
    if (context?.userId) {
        Sentry.setUser({ id: context.userId });
    }

    return Sentry.captureException(error, {
        extra: context?.extra,
    });
}

/**
 * Capture a message with context (for non-error events like tests).
 */
export function captureMessage(
    message: string,
    level: "info" | "warning" | "error" = "info",
    context?: {
        requestId?: string;
        extra?: Record<string, unknown>;
    }
): string {
    if (context?.requestId) {
        Sentry.setTag("request_id", context.requestId);
    }

    return Sentry.captureMessage(message, {
        level,
        extra: context?.extra,
    });
}
