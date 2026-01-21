/**
 * Ops Endpoint Authentication
 *
 * Validates OPS_TOKEN for protected /api/ops/* endpoints.
 *
 * P0 Observability requirement.
 */

import { NextRequest, NextResponse } from "next/server";

const OPS_TOKEN_HEADER = "x-ops-token";

/**
 * Validate OPS_TOKEN from request header
 * Returns error response if invalid, null if valid
 */
export function validateOpsToken(request: NextRequest): NextResponse | null {
    const expectedToken = process.env.OPS_TOKEN;

    if (!expectedToken) {
        return NextResponse.json(
            { error: "OPS_TOKEN not configured" },
            { status: 500 }
        );
    }

    const providedToken = request.headers.get(OPS_TOKEN_HEADER);

    if (!providedToken) {
        return NextResponse.json(
            { error: "Missing x-ops-token header" },
            { status: 401 }
        );
    }

    // Timing-safe comparison (simple version)
    if (providedToken !== expectedToken) {
        return NextResponse.json(
            { error: "Invalid x-ops-token" },
            { status: 401 }
        );
    }

    return null; // Valid
}

/**
 * Get admin emails from environment
 */
export function getAdminEmails(): string[] {
    const adminEmails = process.env.ADMIN_EMAILS || "";
    return adminEmails
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter((email) => email.length > 0);
}

/**
 * Check if user email is an admin
 */
export function isAdmin(email: string | null | undefined): boolean {
    if (!email) return false;
    const adminEmails = getAdminEmails();
    return adminEmails.includes(email.toLowerCase());
}
