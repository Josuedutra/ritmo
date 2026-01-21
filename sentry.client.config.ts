/**
 * Sentry Client Configuration
 *
 * This file configures Sentry for the browser/client-side.
 * Initialized automatically by @sentry/nextjs.
 */

import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "@/lib/observability/sentry-scrub";

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Environment from env var or default to development
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || "development",

    // Release tracking (uses Vercel commit SHA if available)
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local",

    // Sample rate for error events (100% in production, adjust if needed)
    sampleRate: 1.0,

    // Performance monitoring sample rate (10% to reduce costs)
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Session replay sample rate (disabled for now)
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    // PII scrubbing before sending events
    beforeSend: scrubEvent,

    // Don't send default PII
    sendDefaultPii: false,

    // Ignore common non-actionable errors
    ignoreErrors: [
        // Network errors
        "Network request failed",
        "Failed to fetch",
        "Load failed",
        "NetworkError",
        // User actions
        "ResizeObserver loop",
        "ResizeObserver loop limit exceeded",
        // Chrome extensions
        "chrome-extension://",
        "moz-extension://",
        // Next.js hydration
        "Hydration failed",
        "Text content does not match",
    ],

    // Filter out noisy breadcrumbs
    beforeBreadcrumb(breadcrumb) {
        // Filter out XHR/fetch to analytics endpoints
        if (breadcrumb.category === "xhr" || breadcrumb.category === "fetch") {
            const url = breadcrumb.data?.url || "";
            if (
                url.includes("analytics") ||
                url.includes("segment") ||
                url.includes("google") ||
                url.includes("facebook")
            ) {
                return null;
            }
        }
        return breadcrumb;
    },
});
