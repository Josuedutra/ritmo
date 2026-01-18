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
            const pathname = nextUrl.pathname;

            // Protected routes that require auth
            const isOnDashboard = pathname.startsWith("/dashboard");
            const isOnQuotes = pathname.startsWith("/quotes");
            const isOnSettings = pathname.startsWith("/settings");
            const isOnTemplates = pathname.startsWith("/templates");
            const isOnOnboarding = pathname.startsWith("/onboarding");
            const isProtected = isOnDashboard || isOnQuotes || isOnSettings || isOnTemplates || isOnOnboarding;

            // Requirement D: Protect app routes
            if (isProtected) {
                if (isLoggedIn) return true;
                // Redirect to login with ?next= param
                const loginUrl = new URL("/login", nextUrl);
                loginUrl.searchParams.set("next", pathname);
                return Response.redirect(loginUrl);
            }

            // Requirement D: Redirect logged-in users from login/signup to dashboard
            if ((pathname === "/login" || pathname === "/signup") && isLoggedIn) {
                return Response.redirect(new URL("/dashboard", nextUrl));
            }

            return true;
        },
        async jwt({ token, user, trigger }) {
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
