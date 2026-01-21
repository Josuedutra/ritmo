/**
 * POST /api/csp-report
 *
 * Receives Content Security Policy violation reports.
 * Used in report-only mode to identify CSP issues before enforcement.
 *
 * P0 Security Hardening.
 *
 * SECURITY: Only log sanitized/truncated fields to avoid logging sensitive URLs.
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const log = logger.child({ route: "api/csp-report" });

// Maximum length for URI fields to prevent logging sensitive data
const MAX_URI_LENGTH = 100;

/**
 * Sanitize a URI for logging - truncate and mask query strings
 */
function sanitizeUri(uri: string | undefined | null): string | null {
    if (!uri) return null;

    // Remove query string to avoid logging sensitive params
    const urlWithoutQuery = uri.split("?")[0];

    // Truncate to max length
    if (urlWithoutQuery.length > MAX_URI_LENGTH) {
        return urlWithoutQuery.substring(0, MAX_URI_LENGTH) + "...";
    }

    return urlWithoutQuery;
}

export async function POST(request: NextRequest) {
    try {
        const report = await request.json();

        // CSP reports have a specific format
        const cspReport = report["csp-report"] || report;

        // Log only sanitized/truncated fields
        // Avoid logging: original-policy (too verbose), source-file (may contain sensitive paths)
        log.warn(
            {
                // Truncate document-uri (may contain sensitive paths)
                documentUri: sanitizeUri(cspReport["document-uri"]),
                // Truncate blocked-uri (most important for debugging)
                blockedUri: sanitizeUri(cspReport["blocked-uri"]),
                // These are safe - just directive names
                violatedDirective: cspReport["violated-directive"]?.substring(0, 50),
                effectiveDirective: cspReport["effective-directive"]?.substring(0, 50),
                // Line/column for debugging (safe)
                lineNumber: cspReport["line-number"],
                columnNumber: cspReport["column-number"],
            },
            "CSP violation report"
        );

        return NextResponse.json({ received: true });
    } catch {
        // Silently accept malformed reports
        return NextResponse.json({ received: true });
    }
}

// Block other methods
export async function GET() {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
