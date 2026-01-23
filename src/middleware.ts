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
 * Check Basic Auth for staging/preview environments
 * Returns 401 if credentials are invalid, null if valid or not applicable
 */
function checkStagingAuth(request: NextRequest): NextResponse | null {
    // Only apply to Vercel preview deployments when STAGING_PASSWORD is set
    const stagingPassword = process.env.STAGING_PASSWORD;
    const isPreview = process.env.VERCEL_ENV === "preview";

    if (!isPreview || !stagingPassword) {
        return null; // Not a staging environment or no password configured
    }

    // Skip auth for health check endpoint
    if (request.nextUrl.pathname === "/api/health") {
        return null;
    }

    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Basic ")) {
        return new NextResponse("Authentication required", {
            status: 401,
            headers: {
                "WWW-Authenticate": 'Basic realm="Ritmo Staging"',
            },
        });
    }

    // Decode and verify credentials
    // Expected format: "Basic base64(username:password)"
    // Username can be anything, only password matters
    try {
        const base64Credentials = authHeader.substring(6);
        const credentials = atob(base64Credentials);
        const [, password] = credentials.split(":");

        if (password !== stagingPassword) {
            return new NextResponse("Invalid credentials", {
                status: 401,
                headers: {
                    "WWW-Authenticate": 'Basic realm="Ritmo Staging"',
                },
            });
        }
    } catch {
        return new NextResponse("Invalid authorization header", {
            status: 401,
            headers: {
                "WWW-Authenticate": 'Basic realm="Ritmo Staging"',
            },
        });
    }

    return null; // Auth successful
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
    // Check staging authentication first
    const stagingAuthResponse = checkStagingAuth(request);
    if (stagingAuthResponse) {
        return stagingAuthResponse;
    }

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
