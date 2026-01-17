import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextRequest } from "next/server";

const { auth } = NextAuth(authConfig);

/**
 * Lightweight middleware using auth.config (no Prisma)
 * This keeps bundle under 1MB for Vercel Hobby plan
 */
export async function middleware(request: NextRequest) {
    return auth(request as any);
}

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
