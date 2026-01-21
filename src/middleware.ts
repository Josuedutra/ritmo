import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextRequest, NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const REQUEST_ID_HEADER = "x-request-id";

/**
 * Generate a new request ID
 * Format: rid_<timestamp>_<random>
 */
function generateRequestId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `rid_${timestamp}_${random}`;
}

/**
 * Lightweight middleware using auth.config (no Prisma)
 * This keeps bundle under 1MB for Vercel Hobby plan
 *
 * Also injects x-request-id header for correlation.
 *
 * Uses next-auth v5 middleware wrapper pattern.
 */
export const middleware = auth(async function middleware(request) {
    // Generate or propagate request ID
    const requestId = request.headers.get(REQUEST_ID_HEADER) || generateRequestId();

    // Clone request headers and add request ID
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(REQUEST_ID_HEADER, requestId);

    // Create a response with the request ID header
    const response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
    response.headers.set(REQUEST_ID_HEADER, requestId);

    return response;
}) as (request: NextRequest) => Promise<NextResponse>;

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (images, etc)
         */
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
