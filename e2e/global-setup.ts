import { execSync } from "child_process";

/**
 * Playwright global setup — ensures database is ready before E2E tests.
 *
 * Runs:
 * 1. prisma db push — apply schema to test database
 * 2. prisma db:seed — create demo user + org for auth.setup.ts
 */
export default async function globalSetup() {
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
}
