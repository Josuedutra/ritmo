import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

export interface ApiSession {
    user: {
        id: string;
        email: string;
        organizationId: string;
        role: string;
    };
}

/**
 * Get authenticated session with organization scoping
 * Returns null if not authenticated
 */
export async function getApiSession(): Promise<ApiSession | null> {
    const session = await auth();

    if (!session?.user?.organizationId) {
        return null;
    }

    return session as ApiSession;
}

/**
 * Standard unauthorized response
 */
export function unauthorized() {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * Standard forbidden response (authenticated but not authorized)
 */
export function forbidden(message = "Forbidden") {
    return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * Standard not found response
 */
export function notFound(resource = "Resource") {
    return NextResponse.json({ error: `${resource} not found` }, { status: 404 });
}

/**
 * Standard bad request response
 */
export function badRequest(message: string) {
    return NextResponse.json({ error: message }, { status: 400 });
}

/**
 * Standard server error response
 */
export function serverError(error: unknown, context?: string) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error: message, context }, "API error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

/**
 * Standard success response
 */
export function success<T>(data: T, status = 200) {
    return NextResponse.json(data, { status });
}
