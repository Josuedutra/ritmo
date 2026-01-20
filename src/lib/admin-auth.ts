/**
 * Admin Authentication Helper
 *
 * Checks if the current user is a superadmin based on ADMIN_EMAILS env var.
 */

import { getApiSession } from "@/lib/api-utils";

// SUPERADMIN emails from environment
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

/**
 * Check if user is a superadmin.
 * Returns the session if authorized, null otherwise.
 */
export async function requireAdminSession() {
    const session = await getApiSession();
    if (!session) return null;

    const userEmail = session.user.email?.toLowerCase();
    if (!userEmail || !ADMIN_EMAILS.includes(userEmail)) {
        return null;
    }

    return session;
}

/**
 * Check if email is an admin email.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
    if (!email) return false;
    return ADMIN_EMAILS.includes(email.toLowerCase());
}
