import { test as setup, expect } from "@playwright/test";

const authFile = "e2e/.auth/user.json";

/**
 * Authentication setup - runs before all tests
 * This creates a logged-in session that other tests can reuse
 */
setup("authenticate", async ({ page }) => {
    // Navigate to login page
    await page.goto("/login");

    // Fill in credentials (using test user from seed)
    await page.getByLabel(/email/i).fill(process.env.TEST_USER_EMAIL || "admin@test.com");
    await page.getByLabel(/password/i).fill(process.env.TEST_USER_PASSWORD || "password123");

    // Click login button
    await page.getByRole("button", { name: /entrar|login/i }).click();

    // Wait for redirect to dashboard
    await page.waitForURL(/\/(dashboard)?$/);

    // Verify we're logged in by checking for user elements
    await expect(page.getByRole("navigation")).toBeVisible();

    // Save signed-in state
    await page.context().storageState({ path: authFile });
});
