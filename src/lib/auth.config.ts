import type { NextAuthConfig } from "next-auth";

/**
 * Auth config without Prisma - used by middleware (Edge runtime)
 * This keeps the middleware bundle under 1MB for Vercel Hobby plan
 */
export const authConfig: NextAuthConfig = {
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/login",
        error: "/login",
    },
    // Providers are defined in auth.ts with full Prisma access
    providers: [],
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
            const isOnQuotes = nextUrl.pathname.startsWith("/quotes");
            const isOnSettings = nextUrl.pathname.startsWith("/settings");
            const isOnTemplates = nextUrl.pathname.startsWith("/templates");
            const isProtected = isOnDashboard || isOnQuotes || isOnSettings || isOnTemplates;

            if (isProtected) {
                if (isLoggedIn) return true;
                return false; // Redirect to login
            }

            // Redirect logged-in users from login to dashboard
            if (nextUrl.pathname === "/login" && isLoggedIn) {
                return Response.redirect(new URL("/dashboard", nextUrl));
            }

            return true;
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.organizationId = (user as { organizationId?: string }).organizationId;
                token.role = (user as { role?: string }).role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.organizationId = token.organizationId as string;
                session.user.role = token.role as string;
            }
            return session;
        },
    },
};
