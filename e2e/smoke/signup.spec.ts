import { test, expect } from "@playwright/test";

test.describe("Signup + Onboarding flow", () => {
  test("creates account and completes 5-step onboarding", async ({ page }) => {
    const email = `test-${Date.now()}@e2e.ritmo.app`;
    const password = "testpass123";
    const name = "E2E Test User";

    // 1. Go to signup
    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: /criar conta/i })).toBeVisible();

    // 2. Fill form
    await page.getByLabel(/nome/i).fill(name);
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);

    // 3. Submit
    await page.getByRole("button", { name: /começar trial/i }).click();

    // 4. Should redirect to /onboarding
    await page.waitForURL(/\/onboarding/, { timeout: 10000 });
    await expect(page.getByText(/bem-vindo ao ritmo/i)).toBeVisible();

    // 5. Step 0 — Welcome: click Começar
    await page.getByRole("button", { name: /começar/i }).click();

    // 6. Step 1 — Templates: click Continuar
    await page.waitForSelector("text=/mensagens|templates/i");
    await page.getByRole("button", { name: /continuar/i }).click();

    // 7. Step 2 — SMTP: skip (usar Ritmo)
    await page.waitForSelector("text=/envio|smtp/i");
    await page.getByRole("button", { name: /continuar/i }).click();

    // 8. Step 3 — BCC: skip
    await page.waitForSelector("text=/captura|bcc/i");
    await page.getByRole("button", { name: /continuar/i }).click();

    // 9. Step 4 — Complete: click Ir para o dashboard
    await page.waitForSelector("text=/pronto|dashboard/i");
    await page.getByRole("button", { name: /dashboard|ir para/i }).click();

    // 10. Should land on dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await expect(page.getByText(/orçamentos|dashboard/i)).toBeVisible();
  });
});
