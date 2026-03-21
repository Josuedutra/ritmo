/**
 * Injection Guard Tests (S5-11)
 *
 * Static analysis safety net for injection vulnerabilities.
 * These tests grep the codebase for forbidden patterns and fail CI if
 * new unsafe code is introduced outside the approved whitelist.
 *
 * Tests:
 * 1. No raw SQL queries ($queryRaw / $executeRaw) outside whitelist
 * 2. No dangerouslySetInnerHTML outside whitelist
 * 3. CSP header configured in next.config.ts
 * 4. Rate limit applied on all POST /api/auth/* routes
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

// Resolve project root (two levels up from src/__tests__)
const PROJECT_ROOT = path.resolve(__dirname, "../../");
const SRC_DIR = path.join(PROJECT_ROOT, "src");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Read a file relative to PROJECT_ROOT */
function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf-8");
}

/** Find all .ts / .tsx files under a directory (excludes __tests__, node_modules, .next) */
function findSourceFiles(dir: string, extensions = [".ts", ".tsx"]): string[] {
  const results: string[] = [];

  function walk(current: string) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "__tests__") {
        continue;
      }
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results;
}

// ---------------------------------------------------------------------------
// Test 1: No raw SQL queries outside whitelist
// ---------------------------------------------------------------------------

/**
 * Files explicitly approved to use $queryRaw / $executeRaw.
 * All usages are tagged template literals (parameterised), not string
 * concatenation, so SQL injection is not possible.  This whitelist exists
 * so that CI catches any NEW usage introduced outside these files.
 */
const RAW_SQL_WHITELIST = new Set([
  "src/lib/entitlements.ts", // $executeRaw for atomic storage decrement (GREATEST guard)
  "src/app/api/admin/seed/route.ts", // $executeRaw for ON CONFLICT seeding
  "src/app/api/cron/process-cadence/route.ts", // $queryRaw for atomic event claim
  "src/app/api/reports/route.ts", // $queryRaw for date-bucketed aggregates
  "src/app/api/health/route.ts", // $queryRaw`SELECT 1` health probe
]);

describe("SQL Injection Guard", () => {
  it("ZERO files use $queryRaw or $executeRaw outside the approved whitelist", () => {
    const rawSqlPattern = /\$queryRaw|\$executeRaw/;
    const sourceFiles = findSourceFiles(SRC_DIR);

    const violations: string[] = [];

    for (const absPath of sourceFiles) {
      const content = fs.readFileSync(absPath, "utf-8");
      if (!rawSqlPattern.test(content)) continue;

      // Convert to relative path for whitelist comparison
      const relativePath = path.relative(PROJECT_ROOT, absPath).replace(/\\/g, "/");
      if (!RAW_SQL_WHITELIST.has(relativePath)) {
        violations.push(relativePath);
      }
    }

    if (violations.length > 0) {
      const msg = [
        `Found $queryRaw / $executeRaw in ${violations.length} non-whitelisted file(s):`,
        ...violations.map((f) => `  - ${f}`),
        "",
        "Either add the file to RAW_SQL_WHITELIST in src/__tests__/injection-guards.test.ts",
        "(with a comment explaining why the raw query is safe), or refactor to use Prisma ORM methods.",
      ].join("\n");
      expect.fail(msg);
    }

    // If we reach here, all raw SQL usages are whitelisted
    expect(violations).toHaveLength(0);
  });

  it("all whitelisted raw SQL files still exist (no stale whitelist entries)", () => {
    const stale: string[] = [];
    for (const relativePath of RAW_SQL_WHITELIST) {
      const absPath = path.join(PROJECT_ROOT, relativePath);
      if (!fs.existsSync(absPath)) {
        stale.push(relativePath);
      }
    }

    if (stale.length > 0) {
      expect.fail(
        `Stale whitelist entries (files no longer exist):\n${stale.map((f) => `  - ${f}`).join("\n")}\n\nRemove them from RAW_SQL_WHITELIST.`
      );
    }

    expect(stale).toHaveLength(0);
  });

  it("ZERO files use $queryRawUnsafe (always unsafe — no exceptions)", () => {
    const pattern = /\$queryRawUnsafe/;
    const sourceFiles = findSourceFiles(SRC_DIR);
    const violations = sourceFiles
      .filter((f) => pattern.test(fs.readFileSync(f, "utf-8")))
      .map((f) => path.relative(PROJECT_ROOT, f).replace(/\\/g, "/"));

    expect(violations, `$queryRawUnsafe found in: ${violations.join(", ")}`).toHaveLength(0);
  });

  it("ZERO files use $executeRaw with string interpolation (always unsafe — no exceptions)", () => {
    const pattern = /\$executeRaw`[^`]*\$\{/;
    const sourceFiles = findSourceFiles(SRC_DIR);
    const violations = sourceFiles
      .filter((f) => pattern.test(fs.readFileSync(f, "utf-8")))
      .map((f) => path.relative(PROJECT_ROOT, f).replace(/\\/g, "/"));

    expect(
      violations,
      `Unsafe $executeRaw interpolation found in: ${violations.join(", ")}`
    ).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Test 2: No dangerouslySetInnerHTML outside whitelist
// ---------------------------------------------------------------------------

/**
 * Files approved to use dangerouslySetInnerHTML.
 * Both usages render trusted static markup (SVG / structured data).
 */
const DANGEROUS_HTML_WHITELIST = new Set([
  "src/app/partners/page.tsx", // Renders structured data JSON-LD (trusted static content)
  "src/app/page.tsx", // Renders structured data JSON-LD (trusted static content)
]);

describe("XSS Guard — dangerouslySetInnerHTML", () => {
  it("ZERO components use dangerouslySetInnerHTML outside the approved whitelist", () => {
    const xssPattern = /dangerouslySetInnerHTML/;
    const sourceFiles = findSourceFiles(SRC_DIR, [".tsx", ".ts"]);

    const violations: string[] = [];

    for (const absPath of sourceFiles) {
      const content = fs.readFileSync(absPath, "utf-8");
      if (!xssPattern.test(content)) continue;

      const relativePath = path.relative(PROJECT_ROOT, absPath).replace(/\\/g, "/");
      if (!DANGEROUS_HTML_WHITELIST.has(relativePath)) {
        violations.push(relativePath);
      }
    }

    if (violations.length > 0) {
      const msg = [
        `Found dangerouslySetInnerHTML in ${violations.length} non-whitelisted file(s):`,
        ...violations.map((f) => `  - ${f}`),
        "",
        "Either add the file to DANGEROUS_HTML_WHITELIST in src/__tests__/injection-guards.test.ts",
        "(with a comment confirming the HTML is trusted/static), or remove dangerouslySetInnerHTML",
        "and use React-safe alternatives instead.",
      ].join("\n");
      expect.fail(msg);
    }

    expect(violations).toHaveLength(0);
  });

  it("all whitelisted dangerouslySetInnerHTML files still exist (no stale whitelist entries)", () => {
    const stale: string[] = [];
    for (const relativePath of DANGEROUS_HTML_WHITELIST) {
      const absPath = path.join(PROJECT_ROOT, relativePath);
      if (!fs.existsSync(absPath)) {
        stale.push(relativePath);
      }
    }

    if (stale.length > 0) {
      expect.fail(
        `Stale whitelist entries:\n${stale.map((f) => `  - ${f}`).join("\n")}\n\nRemove them from DANGEROUS_HTML_WHITELIST.`
      );
    }

    expect(stale).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Test 3: CSP header configured in next.config.ts
// ---------------------------------------------------------------------------

describe("CSP Header Guard", () => {
  it("next.config.ts defines a Content-Security-Policy header", () => {
    const nextConfig = readFile("next.config.ts");

    // Must define CSP (report-only or enforced)
    const hasCSP =
      nextConfig.includes("Content-Security-Policy") ||
      nextConfig.includes("content-security-policy");

    expect(hasCSP).toBe(true);
  });

  it("CSP config includes default-src directive", () => {
    const nextConfig = readFile("next.config.ts");
    expect(nextConfig).toContain("default-src");
  });

  it("CSP config includes report-uri or reportTo for violation collection", () => {
    const nextConfig = readFile("next.config.ts");
    const hasReporting = nextConfig.includes("report-uri") || nextConfig.includes("report-to");
    expect(hasReporting).toBe(true);
  });

  it("CSP report endpoint exists at src/app/api/csp-report/route.ts", () => {
    const cspRoute = path.join(SRC_DIR, "app/api/csp-report/route.ts");
    expect(fs.existsSync(cspRoute)).toBe(true);

    const content = fs.readFileSync(cspRoute, "utf-8");
    // Must export a POST handler
    expect(content).toMatch(/export\s+async\s+function\s+POST/);
  });
});

// ---------------------------------------------------------------------------
// Test 4: Rate limit on POST /api/auth/* routes
// ---------------------------------------------------------------------------

describe("Rate Limit Guard — /api/auth/* POST routes", () => {
  it("all /api/auth/* POST route handlers import and call rateLimit()", () => {
    const authDir = path.join(SRC_DIR, "app/api/auth");
    const routeFiles = findSourceFiles(authDir).filter((f) => f.endsWith("route.ts"));

    const unprotected: string[] = [];
    for (const absPath of routeFiles) {
      const content = fs.readFileSync(absPath, "utf-8");
      const relativePath = path.relative(PROJECT_ROOT, absPath).replace(/\\/g, "/");

      // Skip [...nextauth] — NextAuth manages its own protection
      if (relativePath.includes("[...nextauth]")) continue;

      // Only check files that export POST
      if (!content.includes("export async function POST") && !content.match(/export\s*\{[^}]*POST/))
        continue;

      if (!content.includes("rateLimit")) {
        unprotected.push(relativePath);
      }
    }

    expect(unprotected).toHaveLength(0);
  });

  it("rate-limit module exports RateLimitConfigs with a signup config", () => {
    const rateLimitPath = path.join(SRC_DIR, "lib/security/rate-limit.ts");
    expect(fs.existsSync(rateLimitPath)).toBe(true);

    const content = fs.readFileSync(rateLimitPath, "utf-8");
    expect(content).toContain("RateLimitConfigs");
    expect(content).toContain("signup");
  });
});
