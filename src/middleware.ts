import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

/**
 * Lightweight middleware using auth.config (no Prisma)
 * This keeps bundle under 1MB for Vercel Hobby plan
 */
export const { auth: middleware } = NextAuth(authConfig);

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
