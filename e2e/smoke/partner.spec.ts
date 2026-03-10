import { test, expect } from "@playwright/test";

test.describe("Partner workflow", () => {
  test("partner registration returns referral code", async ({ request }) => {
    // Test partner registration via API (UI form is on landing page)
    const email = `partner-${Date.now()}@e2e.ritmo.app`;

    const res = await request.post("/api/partners/register", {
      data: {
        name: "E2E Partner",
        email,
        company: "E2E Contabilidade Lda",
        clients: "1-10",
        source: "e2e-test",
      },
    });

    expect(res.status()).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.referralCode).toBeTruthy();
    expect(typeof data.referralCode).toBe("string");
  });

  test("signup via referral link shows partner UX", async ({ page }) => {
    // First register a partner via API
    const email = `partner-ui-${Date.now()}@e2e.ritmo.app`;
    const res = await page.request.post("/api/partners/register", {
      data: { name: "E2E Partner UI", email, company: "E2E Lda", clients: "1-10" },
    });
    const { referralCode } = await res.json();

    // Visit signup with referral code
    await page.goto(`/signup?ref=${referralCode}`);

    // Should show partner-specific UX (not trial messaging)
    await page.waitForSelector("text=/parceiro|cockpit/i", { timeout: 5000 });
    const buttonText = await page
      .getByRole("button", { name: /criar conta|parceiro/i })
      .textContent();
    expect(buttonText).toMatch(/parceiro/i);

    // Trial benefits box should be hidden
    await expect(page.getByText(/14 dias/i)).not.toBeVisible();
  });

  test("partner can access cockpit after signup with same email", async ({ page }) => {
    const email = `partner-cockpit-${Date.now()}@e2e.ritmo.app`;
    const password = "testpass123";

    // Register partner
    await page.request.post("/api/partners/register", {
      data: { name: "E2E Cockpit Partner", email, company: "E2E Cockpit Lda", clients: "1-10" },
    });

    // Create account with same email
    await page.goto("/signup");
    await page.getByLabel(/nome/i).fill("E2E Cockpit Partner");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /começar|criar conta/i }).click();
    await page.waitForURL(/\/onboarding/, { timeout: 10000 });

    // Skip onboarding
    await page.goto("/dashboard");

    // Navigate to partner cockpit
    await page.goto("/cockpit/partner");

    // Should show partner cockpit (not "acesso negado")
    await expect(page.getByText(/cockpit do parceiro/i)).toBeVisible();
    await expect(page.getByText(/referrals/i)).toBeVisible();
  });
});
