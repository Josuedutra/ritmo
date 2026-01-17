import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
    const isLoggedIn = !!req.auth;
    const isOnDashboard = req.nextUrl.pathname.startsWith("/dashboard");
    const isOnQuotes = req.nextUrl.pathname.startsWith("/quotes");
    const isOnSettings = req.nextUrl.pathname.startsWith("/settings");
    const isOnTemplates = req.nextUrl.pathname.startsWith("/templates");

    // Protected routes
    if ((isOnDashboard || isOnQuotes || isOnSettings || isOnTemplates) && !isLoggedIn) {
        return NextResponse.redirect(new URL("/login", req.nextUrl));
    }

    // Redirect logged-in users from login to dashboard
    if (req.nextUrl.pathname === "/login" && isLoggedIn) {
        return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    }

    return NextResponse.next();
});

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
