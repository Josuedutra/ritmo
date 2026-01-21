/**
 * Sentry Edge Configuration
 *
 * This file configures Sentry for Edge runtime (middleware, edge functions).
 * Initialized automatically by @sentry/nextjs.
 */

import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "@/lib/observability/sentry-scrub";

Sentry.init({
    dsn: process.env.SENTRY_DSN,

    // Environment from env var or default to development
    environment: process.env.SENTRY_ENVIRONMENT || "development",

    // Release tracking (uses Vercel commit SHA if available)
    release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local",

    // Sample rate for error events (100%)
    sampleRate: 1.0,

    // Performance monitoring (lower for edge to reduce costs)
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 1.0,

    // PII scrubbing before sending events
    beforeSend: scrubEvent,

    // Don't send default PII
    sendDefaultPii: false,
});
