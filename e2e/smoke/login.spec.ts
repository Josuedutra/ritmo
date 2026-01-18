import { test, expect } from "@playwright/test";

test.describe("Login Flow", () => {
    test.use({ storageState: { cookies: [], origins: [] } }); // Don't use auth state

    test("should show login page", async ({ page }) => {
        await page.goto("/login");

        // Should see login form
        await expect(page.getByLabel(/email/i)).toBeVisible();
        await expect(page.getByLabel(/password/i)).toBeVisible();
        await expect(page.getByRole("button", { name: /entrar|login/i })).toBeVisible();
    });

    test("should redirect unauthenticated users to login", async ({ page }) => {
        await page.goto("/dashboard");

        // Should be redirected to login
        await expect(page).toHaveURL(/\/login/);
    });

    test("should show error for invalid credentials", async ({ page }) => {
        await page.goto("/login");

        await page.getByLabel(/email/i).fill("invalid@test.com");
        await page.getByLabel(/password/i).fill("wrongpassword");
        await page.getByRole("button", { name: /entrar|login/i }).click();

        // Should show error message
        await expect(page.getByText(/inválid|incorrect|error/i)).toBeVisible({ timeout: 5000 });
    });

    test("should login successfully with valid credentials", async ({ page }) => {
        await page.goto("/login");

        await page.getByLabel(/email/i).fill(process.env.TEST_USER_EMAIL || "admin@test.com");
        await page.getByLabel(/password/i).fill(process.env.TEST_USER_PASSWORD || "password123");
        await page.getByRole("button", { name: /entrar|login/i }).click();

        // Should redirect to dashboard
        await page.waitForURL(/\/(dashboard)?$/, { timeout: 10000 });
        await expect(page.getByRole("navigation")).toBeVisible();
    });
});
