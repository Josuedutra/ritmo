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
        async jwt({ token, user, trigger, account }) {
            // Initial sign in
            if (user) {
                token.id = user.id;
                token.organizationId = (user as { organizationId?: string }).organizationId;
                token.role = (user as { role?: string }).role;
                token.provider = account?.provider;
            }

            // For OAuth users, we need to fetch organizationId from DB on subsequent requests
            // because the createUser event runs async and organizationId might not be set yet
            if (trigger === "signIn" && !token.organizationId && token.id) {
                // Delay to allow createUser event to complete
                // This is handled in the session callback instead
            }

            return token;
        },
        async session({ session, token }) {
            // Basic session population from token - no Prisma here (Edge compatible)
            // Full Prisma-based session enrichment happens in auth.ts
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = (token.role as string) || "admin";
                if (token.organizationId) {
                    session.user.organizationId = token.organizationId as string;
                }
            }
            return session;
        },
    },
};
