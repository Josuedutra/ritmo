import { execSync } from "child_process";

/**
 * Playwright global setup — ensures database is ready before E2E tests.
 *
 * If DATABASE_URL is not set, skips DB setup and sets E2E_SKIP flag
 * so auth.setup.ts can skip gracefully (all dependent tests skip too).
 */
export default async function globalSetup() {
  if (!process.env.DATABASE_URL) {
    console.warn(
      "[e2e] DATABASE_URL not set — skipping DB setup. Add DATABASE_URL secret to GitHub Actions to enable E2E tests."
    );
    process.env.E2E_DB_AVAILABLE = "false";
    return;
  }

  console.log("[e2e] Pushing database schema...");
  execSync("pnpm db:push --accept-data-loss", {
    stdio: "inherit",
    env: { ...process.env, SKIP_ENV_VALIDATION: "true" },
  });

  console.log("[e2e] Seeding test data...");
  execSync("pnpm db:seed", {
    stdio: "inherit",
    env: { ...process.env, SKIP_ENV_VALIDATION: "true" },
  });

  console.log("[e2e] Database ready.");
  process.env.E2E_DB_AVAILABLE = "true";
}
