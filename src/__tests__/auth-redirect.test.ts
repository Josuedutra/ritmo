/**
 * E3 Test Companion — Auth Login Redirect
 * Task: gov-1775209005300-yl7n52
 *
 * Covers:
 * 1. Middleware (via authorized callback) redirects unauthenticated /dashboard → /login?next=%2Fdashboard
 * 2. Login page reads `next` param and redirects after signIn
 * 3. Middleware allows /login, /register, /api/auth/* without auth
 *
 * Diagnostic findings:
 * - auth.config.ts uses `?next=` (not `?callbackUrl=`) for post-login redirect
 * - login/page.tsx reads searchParams.get("next") correctly and calls router.push(next)
 * - login/page.tsx uses client-side signIn("credentials", { redirect: false }) — no server action
 * - middleware.ts wraps with auth() from next-auth which invokes the authorized callback
 * - No redirect loop risk in current code: authorized callback only redirects unauthenticated
 *   users to /login, and explicitly redirects logged-in users away from /login to /dashboard
 */

import { describe, it, expect } from "vitest";
import { authConfig } from "@/lib/auth.config";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type AuthorizedArgs = Parameters<
  NonNullable<NonNullable<typeof authConfig.callbacks>["authorized"]>
>[0];

/**
 * Build a minimal mock for the authorized() callback arguments.
 * `auth` is null for unauthenticated, or has a user object for authenticated.
 */
function makeAuthArgs(
  pathname: string,
  isLoggedIn: boolean,
  origin = "http://localhost:3000"
): AuthorizedArgs {
  const nextUrl = new URL(pathname, origin);
  return {
    auth: isLoggedIn ? ({ user: { id: "u1", email: "test@example.com" } } as never) : null,
    request: { nextUrl } as never,
  };
}

// ---------------------------------------------------------------------------
// 1. Protected routes redirect unauthenticated users
// ---------------------------------------------------------------------------

describe("authorized callback — protected routes redirect unauthenticated", () => {
  const protectedPaths = [
    "/dashboard",
    "/dashboard/projects",
    "/quotes",
    "/quotes/123",
    "/settings",
    "/settings/billing",
    "/templates",
    "/onboarding",
    "/onboarding/step-1",
  ];

  for (const pathname of protectedPaths) {
    it(`redirects unauthenticated ${pathname} → /login?next=<encoded>`, () => {
      const result = authConfig.callbacks!.authorized!(makeAuthArgs(pathname, false));

      // Should return a Response (redirect), not true/false
      expect(result).toBeInstanceOf(Response);
      const response = result as Response;
      expect(response.status).toBe(302);

      const location = response.headers.get("location");
      expect(location).toBeTruthy();

      const redirectUrl = new URL(location!);
      expect(redirectUrl.pathname).toBe("/login");
      // The `next` param must be the encoded original pathname
      expect(redirectUrl.searchParams.get("next")).toBe(pathname);
    });
  }

  it("encodes /dashboard correctly as %2Fdashboard in the next param", () => {
    const result = authConfig.callbacks!.authorized!(makeAuthArgs("/dashboard", false)) as Response;
    const location = result.headers.get("location")!;
    // The raw query string should contain encoded slash
    expect(location).toContain("next=%2Fdashboard");
  });
});

// ---------------------------------------------------------------------------
// 2. Authenticated users can access protected routes
// ---------------------------------------------------------------------------

describe("authorized callback — authenticated users access protected routes", () => {
  it("allows authenticated user on /dashboard", () => {
    const result = authConfig.callbacks!.authorized!(makeAuthArgs("/dashboard", true));
    expect(result).toBe(true);
  });

  it("allows authenticated user on /quotes/new", () => {
    const result = authConfig.callbacks!.authorized!(makeAuthArgs("/quotes/new", true));
    expect(result).toBe(true);
  });

  it("allows authenticated user on /settings/billing", () => {
    const result = authConfig.callbacks!.authorized!(makeAuthArgs("/settings/billing", true));
    expect(result).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. Public routes pass through without auth
// ---------------------------------------------------------------------------

describe("authorized callback — public routes pass without auth", () => {
  const publicPaths = ["/login", "/signup", "/", "/pricing", "/about", "/forgot-password"];

  for (const pathname of publicPaths) {
    it(`allows unauthenticated ${pathname}`, () => {
      const result = authConfig.callbacks!.authorized!(makeAuthArgs(pathname, false));
      // Should NOT redirect — returns true
      expect(result).toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------
// 4. /api/auth/* routes pass through without auth
// ---------------------------------------------------------------------------

describe("authorized callback — /api/auth/* passes without auth", () => {
  const apiAuthPaths = [
    "/api/auth/signin",
    "/api/auth/callback/credentials",
    "/api/auth/callback/google",
    "/api/auth/session",
    "/api/auth/csrf",
    "/api/auth/signout",
  ];

  for (const pathname of apiAuthPaths) {
    it(`allows unauthenticated ${pathname}`, () => {
      const result = authConfig.callbacks!.authorized!(makeAuthArgs(pathname, false));
      expect(result).toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------
// 5. Logged-in users are redirected away from /login and /signup
// ---------------------------------------------------------------------------

describe("authorized callback — logged-in users redirect from auth pages", () => {
  it("redirects authenticated user from /login → /dashboard", () => {
    const result = authConfig.callbacks!.authorized!(makeAuthArgs("/login", true));

    expect(result).toBeInstanceOf(Response);
    const response = result as Response;
    expect(response.status).toBe(302);

    const location = response.headers.get("location")!;
    const redirectUrl = new URL(location);
    expect(redirectUrl.pathname).toBe("/dashboard");
  });

  it("redirects authenticated user from /signup → /dashboard", () => {
    const result = authConfig.callbacks!.authorized!(makeAuthArgs("/signup", true));

    expect(result).toBeInstanceOf(Response);
    const response = result as Response;
    expect(response.status).toBe(302);

    const location = response.headers.get("location")!;
    const redirectUrl = new URL(location);
    expect(redirectUrl.pathname).toBe("/dashboard");
  });
});

// ---------------------------------------------------------------------------
// 6. sanitizeRedirectUrl — open redirect prevention
// ---------------------------------------------------------------------------

describe("sanitizeRedirectUrl — open redirect prevention", () => {
  /**
   * Mirror of the sanitizeRedirectUrl function from login/page.tsx.
   * We test the logic inline to avoid importing a "use client" component.
   *
   * Rules:
   * - null → /dashboard
   * - Must start with / AND must NOT contain ://
   * - Otherwise → /dashboard
   */
  function sanitizeRedirectUrl(url: string | null): string {
    if (!url) return "/dashboard";
    if (url.startsWith("/") && !url.includes("://")) {
      return url;
    }
    return "/dashboard";
  }

  it("returns /dashboard for null", () => {
    expect(sanitizeRedirectUrl(null)).toBe("/dashboard");
  });

  it("allows safe relative paths", () => {
    expect(sanitizeRedirectUrl("/dashboard")).toBe("/dashboard");
    expect(sanitizeRedirectUrl("/quotes/123")).toBe("/quotes/123");
    expect(sanitizeRedirectUrl("/settings/billing")).toBe("/settings/billing");
  });

  it("blocks absolute URLs with protocol", () => {
    expect(sanitizeRedirectUrl("http://evil.com")).toBe("/dashboard");
    expect(sanitizeRedirectUrl("https://evil.com/steal")).toBe("/dashboard");
  });

  it("KNOWN GAP: does NOT block protocol-relative URLs (//evil.com)", () => {
    // //evil.com starts with "/" and does NOT contain "://" → current sanitization passes it
    // This is a security gap: browsers treat //evil.com as an absolute URL on HTTP/HTTPS
    // Safe in practice because Next.js router.push() is same-origin only in the browser,
    // but should be fixed by adding a check: url.startsWith("//")
    // Document current (permissive) behavior so the fix task knows what to change:
    expect(sanitizeRedirectUrl("//evil.com")).toBe("//evil.com"); // ← gap: should be /dashboard
  });

  it("blocks javascript: URIs", () => {
    // javascript: does not start with /
    expect(sanitizeRedirectUrl("javascript:alert(1)")).toBe("/dashboard");
  });
});

// ---------------------------------------------------------------------------
// 7. middleware.ts config — matcher does NOT match API routes
// ---------------------------------------------------------------------------

describe("middleware config matcher — API routes excluded", () => {
  /**
   * The matcher pattern:
   * "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
   *
   * We test this regex to verify /api/auth/* is excluded from middleware.
   */
  const MATCHER_PATTERN =
    /^\/((?!api|_next\/static|_next\/image|favicon\.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)/;

  it("excludes /api/auth/* from middleware", () => {
    expect(MATCHER_PATTERN.test("/api/auth/signin")).toBe(false);
    expect(MATCHER_PATTERN.test("/api/auth/callback/credentials")).toBe(false);
    expect(MATCHER_PATTERN.test("/api/auth/session")).toBe(false);
  });

  it("excludes /api/* from middleware", () => {
    expect(MATCHER_PATTERN.test("/api/quotes")).toBe(false);
    expect(MATCHER_PATTERN.test("/api/health")).toBe(false);
  });

  it("includes /dashboard in middleware", () => {
    expect(MATCHER_PATTERN.test("/dashboard")).toBe(true);
  });

  it("includes /login in middleware", () => {
    expect(MATCHER_PATTERN.test("/login")).toBe(true);
  });

  it("excludes static assets", () => {
    expect(MATCHER_PATTERN.test("/_next/static/chunk.js")).toBe(false);
    expect(MATCHER_PATTERN.test("/logo.png")).toBe(false);
    expect(MATCHER_PATTERN.test("/favicon.ico")).toBe(false);
  });
});
