import { test, expect } from "@playwright/test";

test.describe("Mark Quote as Sent", () => {
    test("should show mark as sent button on draft quote", async ({ page }) => {
        // First, create a draft quote
        await page.goto("/quotes/new");

        const quoteTitle = `Draft Quote ${Date.now()}`;
        await page.getByLabel(/título|title/i).fill(quoteTitle);

        // Submit form
        await page.getByRole("button", { name: /criar|guardar|save/i }).click();

        // Wait for redirect to quote detail
        await expect(page).toHaveURL(/\/quotes\/[a-f0-9-]+/, { timeout: 10000 });

        // Should see "Marcar como enviado" button
        await expect(page.getByRole("button", { name: /marcar como enviado|mark.*sent/i })).toBeVisible();
    });

    test("should mark quote as sent and show success toast", async ({ page }) => {
        // Create a draft quote
        await page.goto("/quotes/new");

        const quoteTitle = `Send Test ${Date.now()}`;
        await page.getByLabel(/título|title/i).fill(quoteTitle);

        // Add contact with email for proper cadence
        const emailField = page.getByLabel(/email/i);
        if (await emailField.isVisible()) {
            await emailField.fill("test@example.com");
        }

        await page.getByRole("button", { name: /criar|guardar|save/i }).click();
        await expect(page).toHaveURL(/\/quotes\/[a-f0-9-]+/, { timeout: 10000 });

        // Click mark as sent
        await page.getByRole("button", { name: /marcar como enviado|mark.*sent/i }).click();

        // Should show success toast or update status
        await expect(
            page.getByText(/enviado|cadência.*iniciada|follow-up/i)
        ).toBeVisible({ timeout: 5000 });
    });

    test("should show resend button on sent quote", async ({ page }) => {
        // Navigate to quotes list filtered by sent
        await page.goto("/quotes?filter=sent");

        // If there are sent quotes, click the first one
        const quoteCard = page.locator('[href^="/quotes/"]').first();
        if (await quoteCard.isVisible()) {
            await quoteCard.click();

            // Should see resend button
            await expect(page.getByRole("button", { name: /reenviar|resend/i })).toBeVisible();
        }
    });

    test("should show limit error when quota exceeded", async ({ page, request }) => {
        // This test verifies the limit exceeded UI
        // We test the API response handling

        await page.goto("/quotes/new");

        const quoteTitle = `Limit Test ${Date.now()}`;
        await page.getByLabel(/título|title/i).fill(quoteTitle);
        await page.getByRole("button", { name: /criar|guardar|save/i }).click();

        await expect(page).toHaveURL(/\/quotes\/[a-f0-9-]+/, { timeout: 10000 });

        // Get current URL to extract quote ID
        const url = page.url();
        const quoteId = url.split("/quotes/")[1]?.split(/[?#]/)[0];

        if (quoteId) {
            // Intercept the API call to simulate limit exceeded
            await page.route(`**/api/quotes/${quoteId}/mark-sent`, async (route) => {
                await route.fulfill({
                    status: 403,
                    contentType: "application/json",
                    body: JSON.stringify({
                        error: "LIMIT_EXCEEDED",
                        message: "Limite de orçamentos atingido",
                        limit: 10,
                        used: 10,
                        action: "upgrade_plan",
                    }),
                });
            });

            // Click mark as sent
            await page.getByRole("button", { name: /marcar como enviado/i }).click();

            // Should show limit error UI
            await expect(page.getByText(/limite.*atingido/i)).toBeVisible({ timeout: 5000 });
            await expect(page.getByRole("link", { name: /atualizar.*plano/i })).toBeVisible();
        }
    });
});
