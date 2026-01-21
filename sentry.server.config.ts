/**
 * Sentry Server Configuration
 *
 * This file configures Sentry for the Node.js server-side.
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

    // Performance monitoring sample rate (10% in production)
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // PII scrubbing before sending events
    beforeSend: scrubEvent,

    // Don't send default PII
    sendDefaultPii: false,

    // Ignore common non-actionable errors
    ignoreErrors: [
        // Prisma connection issues (usually transient)
        "Can't reach database server",
        "Connection timed out",
        // Next.js internal
        "NEXT_NOT_FOUND",
        "NEXT_REDIRECT",
    ],

    // Enable profiling for performance insights (optional)
    profilesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
});
