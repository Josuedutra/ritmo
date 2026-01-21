import type { NextConfig } from "next";

/**
 * Security Headers Configuration (P0 Security Hardening)
 *
 * HSTS: Force HTTPS
 * X-Content-Type-Options: Prevent MIME sniffing
 * Referrer-Policy: Control referrer information
 * Permissions-Policy: Restrict browser features
 * X-Frame-Options: Prevent clickjacking (legacy)
 * CSP: Content Security Policy (report-only mode initially)
 */
const securityHeaders = [
    {
        // HSTS: Force HTTPS for 1 year, include subdomains
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains",
    },
    {
        // Prevent MIME type sniffing
        key: "X-Content-Type-Options",
        value: "nosniff",
    },
    {
        // Control referrer information
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
    },
    {
        // Restrict browser features
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=()",
    },
    {
        // Prevent clickjacking (legacy header, CSP frame-ancestors is preferred)
        key: "X-Frame-Options",
        value: "DENY",
    },
    {
        // Content Security Policy - Report-Only mode
        // Allows: self, Google (OAuth), Stripe, Sentry, Vercel Analytics
        // Reports violations to /api/csp-report
        key: "Content-Security-Policy-Report-Only",
        value: [
            "default-src 'self'",
            // Scripts: self + inline (for Next.js) + eval (for dev) + trusted CDNs
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://accounts.google.com https://*.vercel-insights.com https://*.vercel-analytics.com",
            // Styles: self + inline (for Tailwind/styled components)
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            // Images: self + data URIs + blob + common image hosts
            "img-src 'self' data: blob: https://*.googleusercontent.com https://*.stripe.com",
            // Fonts: self + Google Fonts
            "font-src 'self' https://fonts.gstatic.com",
            // Connections: self + APIs
            "connect-src 'self' https://api.stripe.com https://accounts.google.com https://*.sentry.io https://*.vercel-insights.com https://*.vercel-analytics.com wss://*.pusher.com",
            // Frames: Stripe (3D Secure) + Google (OAuth)
            "frame-src https://js.stripe.com https://hooks.stripe.com https://accounts.google.com",
            // Frame ancestors: none (prevent embedding)
            "frame-ancestors 'none'",
            // Form targets
            "form-action 'self'",
            // Base URI
            "base-uri 'self'",
            // Report violations
            "report-uri /api/csp-report",
        ].join("; "),
    },
];

const nextConfig: NextConfig = {
    // Logging for debugging
    logging: {
        fetches: {
            fullUrl: true,
        },
    },

    // Security headers for all routes
    async headers() {
        return [
            {
                // Apply to all routes
                source: "/:path*",
                headers: securityHeaders,
            },
        ];
    },
};

export default nextConfig;
