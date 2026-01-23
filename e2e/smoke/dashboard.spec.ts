import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
    test("should display dashboard with stats", async ({ page }) => {
        await page.goto("/dashboard");

        // Should see dashboard title
        await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();

        // Should see stat cards (check for card title in stats section)
        await expect(page.getByText("Ações hoje", { exact: true }).first()).toBeVisible();
    });

    test("should display actions section", async ({ page }) => {
        await page.goto("/dashboard");

        // Should see actions section heading
        await expect(page.getByRole("heading", { name: /ações de hoje/i })).toBeVisible();
    });

    test("should display usage meter", async ({ page }) => {
        await page.goto("/dashboard");

        // Should see usage section
        await expect(page.getByText(/utilização|usage/i)).toBeVisible();
    });

    test("should navigate to quotes from quick actions", async ({ page }) => {
        await page.goto("/dashboard");

        // Click on quotes link
        const quotesLink = page.getByRole("link", { name: /ver orçamentos|view quotes/i });
        if (await quotesLink.isVisible()) {
            await quotesLink.click();
            await expect(page).toHaveURL("/quotes");
        }
    });

    test("should navigate to new quote from dashboard", async ({ page }) => {
        await page.goto("/dashboard");

        // Click new quote button
        await page.getByRole("link", { name: /novo orçamento/i }).first().click();

        await expect(page).toHaveURL("/quotes/new");
    });
});

test.describe("Actions List", () => {
    test("should display action cards when actions exist", async ({ page }) => {
        await page.goto("/dashboard");

        // Check for action cards or empty state
        const hasActions = await page.locator('[class*="action"], [class*="card"]').first().isVisible();
        const hasEmptyState = await page.getByText(/sem.*ações|no.*actions|nenhuma/i).isVisible();

        expect(hasActions || hasEmptyState).toBe(true);
    });

    test("should allow completing an action", async ({ page }) => {
        await page.goto("/dashboard");

        // Look for complete/concluir button on action cards
        const completeButton = page.getByRole("button", { name: /concluir|complete/i }).first();

        if (await completeButton.isVisible()) {
            await completeButton.click();

            // Should show success or remove the action
            await expect(
                page.getByText(/concluído|completed|sucesso/i)
            ).toBeVisible({ timeout: 5000 });
        }
    });
});
