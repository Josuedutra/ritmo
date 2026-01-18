import { test, expect } from "@playwright/test";

test.describe("Quote Creation", () => {
    test("should navigate to new quote page", async ({ page }) => {
        await page.goto("/dashboard");

        // Click on new quote button
        await page.getByRole("link", { name: /novo orçamento/i }).first().click();

        // Should be on new quote page
        await expect(page).toHaveURL("/quotes/new");
    });

    test("should show quote form with required fields", async ({ page }) => {
        await page.goto("/quotes/new");

        // Form should be visible with key fields
        await expect(page.getByLabel(/título|title/i)).toBeVisible();
        await expect(page.getByRole("button", { name: /criar|guardar|save/i })).toBeVisible();
    });

    test("should create a new quote", async ({ page }) => {
        await page.goto("/quotes/new");

        const quoteTitle = `Test Quote ${Date.now()}`;

        // Fill in quote form
        await page.getByLabel(/título|title/i).fill(quoteTitle);

        // Fill optional reference if available
        const referenceField = page.getByLabel(/referência|reference/i);
        if (await referenceField.isVisible()) {
            await referenceField.fill(`REF-${Date.now()}`);
        }

        // Fill value if available
        const valueField = page.getByLabel(/valor|value/i);
        if (await valueField.isVisible()) {
            await valueField.fill("1500");
        }

        // Submit form
        await page.getByRole("button", { name: /criar|guardar|save/i }).click();

        // Should redirect to quote detail or show success
        await expect(page).toHaveURL(/\/quotes\/[a-f0-9-]+/, { timeout: 10000 });

        // Quote title should be visible on detail page
        await expect(page.getByText(quoteTitle)).toBeVisible();
    });

    test("should show validation errors for empty required fields", async ({ page }) => {
        await page.goto("/quotes/new");

        // Try to submit without filling required fields
        await page.getByRole("button", { name: /criar|guardar|save/i }).click();

        // Should show validation error
        await expect(page.getByText(/obrigatório|required/i)).toBeVisible({ timeout: 3000 });
    });
});
