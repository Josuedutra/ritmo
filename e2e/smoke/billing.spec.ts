import { test, expect } from "@playwright/test";

test.describe("Billing Page", () => {
    test("should navigate to billing settings", async ({ page }) => {
        await page.goto("/dashboard");

        // Navigate via settings or direct URL
        await page.goto("/settings/billing");

        // Should be on billing page
        await expect(page).toHaveURL("/settings/billing");
    });

    test("should display billing page elements", async ({ page }) => {
        await page.goto("/settings/billing");

        // Should see plan section
        await expect(page.getByText(/plano|plan/i).first()).toBeVisible();

        // Should see usage section
        await expect(page.getByText(/utilização|usage|orçamentos/i).first()).toBeVisible();
    });

    test("should display available plans", async ({ page }) => {
        await page.goto("/settings/billing");

        // Should see plan cards/options
        // Look for common plan names or upgrade buttons
        const plansVisible = await page.getByText(/starter|pro|business|free|trial/i).first().isVisible();
        const upgradeVisible = await page.getByRole("button", { name: /upgrade|atualizar|escolher|select/i }).first().isVisible();

        expect(plansVisible || upgradeVisible).toBe(true);
    });

    test("should show usage progress", async ({ page }) => {
        await page.goto("/settings/billing");

        // Look for usage indicator (progress bar or text)
        const usageText = page.getByText(/\d+\s*\/\s*\d+/); // matches "5 / 10" format
        const progressBar = page.locator('[role="progressbar"], .progress, [class*="progress"]');

        const hasUsageText = await usageText.first().isVisible().catch(() => false);
        const hasProgressBar = await progressBar.first().isVisible().catch(() => false);

        expect(hasUsageText || hasProgressBar).toBe(true);
    });

    test("should handle manage subscription click", async ({ page }) => {
        await page.goto("/settings/billing");

        // Look for manage/portal button
        const manageButton = page.getByRole("button", { name: /gerir.*subscrição|manage.*subscription|portal/i });

        if (await manageButton.isVisible()) {
            // Mock the portal API to avoid actual Stripe redirect
            await page.route("**/api/billing/portal", async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify({
                        url: "https://billing.stripe.com/test-session",
                    }),
                });
            });

            // Track navigation
            const navigationPromise = page.waitForEvent("popup").catch(() => null);

            await manageButton.click();

            // Either opens popup or stays on page (depending on implementation)
            const popup = await navigationPromise;
            if (popup) {
                expect(popup.url()).toContain("stripe");
            }
        }
    });

    test("should handle checkout flow for plan upgrade", async ({ page }) => {
        await page.goto("/settings/billing");

        // Find upgrade/select plan button
        const upgradeButton = page.getByRole("button", { name: /escolher|select|upgrade|atualizar/i }).first();

        if (await upgradeButton.isVisible()) {
            // Mock the checkout API
            await page.route("**/api/billing/checkout", async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify({
                        url: "https://checkout.stripe.com/test-session",
                    }),
                });
            });

            // Track navigation
            page.on("request", (request) => {
                if (request.url().includes("/api/billing/checkout")) {
                    expect(request.method()).toBe("POST");
                }
            });

            await upgradeButton.click();
        }
    });

    test("should show success message after returning from checkout", async ({ page }) => {
        // Simulate returning from successful checkout
        await page.goto("/settings/billing?success=true");

        // Should show success toast or message
        await expect(page.getByText(/sucesso|success|ativad|activated/i)).toBeVisible({ timeout: 5000 });
    });

    test("should handle cancelled checkout return", async ({ page }) => {
        // Simulate returning from cancelled checkout
        await page.goto("/settings/billing?canceled=true");

        // Page should load without errors
        await expect(page.getByText(/plano|plan/i).first()).toBeVisible();
    });
});
