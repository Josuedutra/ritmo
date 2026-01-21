/**
 * GET /api/admin/sentry-test
 *
 * Smoke test endpoint for Sentry integration.
 * Protected by ADMIN_EMAILS environment variable.
 *
 * Sends a test message to Sentry to verify:
 * - DSN is configured correctly
 * - Events are reaching Sentry
 * - Request ID correlation is working
 */

import { NextRequest } from "next/server";
import {
    getApiSession,
    unauthorized,
    serverError,
    success,
} from "@/lib/api-utils";
import {
    setSentryRequestContext,
    captureMessage,
} from "@/lib/observability/sentry-context";
import { getRequestId } from "@/lib/observability/request-id";

// SUPERADMIN emails from environment
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase());

export async function GET(request: NextRequest) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        // Check if user is SUPERADMIN
        const userEmail = session.user.email?.toLowerCase();
        if (!userEmail || !ADMIN_EMAILS.includes(userEmail)) {
            return unauthorized();
        }

        // Set Sentry request context
        setSentryRequestContext(request);

        // Get request ID for response
        const requestId = await getRequestId();

        // Capture test message to Sentry
        const sentryEventId = captureMessage(
            "sentry_test_ok",
            "info",
            {
                requestId,
                extra: {
                    triggeredBy: userEmail,
                    timestamp: new Date().toISOString(),
                },
            }
        );

        return success({
            ok: true,
            requestId,
            sentryEventId,
            message: "Test event sent to Sentry. Check your Sentry dashboard.",
        });
    } catch (error) {
        return serverError(error, "GET /api/admin/sentry-test");
    }
}
