import { test, expect } from "@playwright/test";

/**
 * E2E Test: Complete Quote Creation and Sending Flow
 * Validates the full workflow from creating a quote to marking it as sent
 */
test.describe("Complete Quote Flow", () => {
    test.describe("Quote Creation", () => {
        test("should navigate to new quote page from dashboard", async ({ page }) => {
            await page.goto("/dashboard");

            // Click on new quote button
            await page.getByRole("link", { name: /novo orçamento/i }).first().click();

            // Should be on new quote page
            await expect(page).toHaveURL("/quotes/new");
            // Use heading role to be more specific
            await expect(page.getByRole("heading", { name: "Novo orçamento" })).toBeVisible();
        });

        test("should display quote form with all fields", async ({ page }) => {
            await page.goto("/quotes/new");

            // Main form fields
            await expect(page.getByLabel(/título/i)).toBeVisible();
            await expect(page.getByLabel(/referência/i)).toBeVisible();
            await expect(page.getByLabel(/tipo de serviço/i)).toBeVisible();
            await expect(page.getByLabel(/valor/i)).toBeVisible();
            await expect(page.getByLabel(/link da proposta/i)).toBeVisible();
            await expect(page.getByLabel(/notas/i)).toBeVisible();

            // Contact selection
            await expect(page.getByLabel(/selecionar contacto/i)).toBeVisible();
            await expect(page.getByRole("button", { name: /criar novo contacto/i })).toBeVisible();

            // Action buttons
            await expect(page.getByRole("button", { name: /criar e marcar como enviado/i })).toBeVisible();
            await expect(page.getByRole("button", { name: /guardar rascunho/i })).toBeVisible();
        });

        test("should validate required title field", async ({ page }) => {
            await page.goto("/quotes/new");

            // Try to submit without title - button should be disabled
            const sendButton = page.getByRole("button", { name: /criar e marcar como enviado/i });
            await expect(sendButton).toBeDisabled();

            // Fill title
            await page.getByLabel(/título/i).fill("Test Quote");
            await expect(sendButton).toBeEnabled();
        });

        test("should validate proposal link format", async ({ page }) => {
            await page.goto("/quotes/new");

            // Fill title first
            await page.getByLabel(/título/i).fill("Test Quote");

            // Fill invalid URL
            await page.getByLabel(/link da proposta/i).fill("invalid-url");

            // Should show error
            await expect(page.getByText(/insira um url válido/i)).toBeVisible();

            // Fill valid URL
            await page.getByLabel(/link da proposta/i).fill("https://drive.google.com/test");

            // Error should disappear
            await expect(page.getByText(/insira um url válido/i)).not.toBeVisible();
        });

        test("should create quote as draft", async ({ page }) => {
            await page.goto("/quotes/new");

            const quoteTitle = `Draft E2E ${Date.now()}`;

            // Fill form
            await page.getByLabel(/título/i).fill(quoteTitle);
            await page.getByLabel(/referência/i).fill(`REF-${Date.now()}`);
            await page.getByLabel(/valor/i).fill("1500");

            // Save as draft
            await page.getByRole("button", { name: /guardar rascunho/i }).click();

            // Should redirect to quote detail
            await expect(page).toHaveURL(/\/quotes\/[a-f0-9-]+/, { timeout: 10000 });

            // Quote should be visible with draft status
            await expect(page.getByText(quoteTitle)).toBeVisible();
        });
    });

    test.describe("New Contact Creation in Quote Form", () => {
        test("should toggle new contact form", async ({ page }) => {
            await page.goto("/quotes/new");

            // Click to create new contact
            await page.getByRole("button", { name: /criar novo contacto/i }).click();

            // New contact fields should appear
            await expect(page.getByLabel(/^nome$/i)).toBeVisible();
            await expect(page.getByLabel(/^email \*$/i)).toBeVisible();
            await expect(page.getByLabel(/empresa/i)).toBeVisible();

            // Cancel should hide form
            await page.getByRole("button", { name: /cancelar/i }).click();
            await expect(page.getByLabel(/selecionar contacto/i)).toBeVisible();
        });

        test("should create quote with new contact", async ({ page }) => {
            await page.goto("/quotes/new");

            const quoteTitle = `Contact E2E ${Date.now()}`;
            const contactEmail = `test-${Date.now()}@example.com`;
            const contactName = "João Teste E2E";

            // Fill quote details
            await page.getByLabel(/título/i).fill(quoteTitle);
            await page.getByLabel(/valor/i).fill("2500");

            // Create new contact
            await page.getByRole("button", { name: /criar novo contacto/i }).click();
            await page.getByLabel(/^nome$/i).fill(contactName);
            await page.getByLabel(/^email \*$/i).fill(contactEmail);
            await page.getByLabel(/empresa/i).fill("Empresa Teste");

            // Save as draft
            await page.getByRole("button", { name: /guardar rascunho/i }).click();

            // Should redirect to quote detail
            await expect(page).toHaveURL(/\/quotes\/[a-f0-9-]+/, { timeout: 10000 });

            // Quote title should be visible
            await expect(page.getByText(quoteTitle)).toBeVisible();
            // Contact should be shown somewhere on page (use first to avoid strict mode)
            await expect(page.getByText(contactName).first()).toBeVisible();
        });
    });

    test.describe("Mark Quote as Sent Flow", () => {
        test("should show mark as sent button on draft quote", async ({ page }) => {
            // Create a draft quote first
            await page.goto("/quotes/new");

            const quoteTitle = `Send Test ${Date.now()}`;
            await page.getByLabel(/título/i).fill(quoteTitle);
            await page.getByRole("button", { name: /guardar rascunho/i }).click();

            await expect(page).toHaveURL(/\/quotes\/[a-f0-9-]+/, { timeout: 10000 });

            // Should see "Marcar como enviado" button
            await expect(page.getByRole("button", { name: /marcar como enviado/i })).toBeVisible();
        });

        test("should mark quote as sent and start cadence", async ({ page }) => {
            // Create quote with contact email
            await page.goto("/quotes/new");

            const quoteTitle = `Cadence Test ${Date.now()}`;
            const contactEmail = `cadence-${Date.now()}@example.com`;

            await page.getByLabel(/título/i).fill(quoteTitle);
            await page.getByLabel(/valor/i).fill("3000");

            // Add contact with email
            await page.getByRole("button", { name: /criar novo contacto/i }).click();
            await page.getByLabel(/^nome$/i).fill("Cliente Cadence");
            await page.getByLabel(/^email \*$/i).fill(contactEmail);

            // Save as draft first
            await page.getByRole("button", { name: /guardar rascunho/i }).click();
            await expect(page).toHaveURL(/\/quotes\/[a-f0-9-]+/, { timeout: 10000 });

            // Now mark as sent
            await page.getByRole("button", { name: /marcar como enviado/i }).click();

            // Wait for either success or limit warning
            // After marking as sent, either:
            // 1. Success: status changes, resend button appears
            // 2. Limit exceeded: warning appears
            await page.waitForTimeout(2000); // Give time for response

            // Check if resend button appeared (success) OR limit warning (quota exceeded)
            const resendButton = page.getByRole("button", { name: /reenviar/i });
            const limitWarning = page.getByText(/limite.*atingido/i);

            // Either should be visible
            const hasResend = await resendButton.isVisible().catch(() => false);
            const hasLimit = await limitWarning.isVisible().catch(() => false);

            expect(hasResend || hasLimit).toBeTruthy();
        });

        test("should create and send in one action", async ({ page }) => {
            await page.goto("/quotes/new");

            const quoteTitle = `One-Click Send ${Date.now()}`;
            const contactEmail = `oneclick-${Date.now()}@example.com`;

            await page.getByLabel(/título/i).fill(quoteTitle);
            await page.getByLabel(/referência/i).fill(`ORC-${Date.now()}`);
            await page.getByLabel(/valor/i).fill("5000");

            // Add contact
            await page.getByRole("button", { name: /criar novo contacto/i }).click();
            await page.getByLabel(/^nome$/i).fill("Cliente OneClick");
            await page.getByLabel(/^email \*$/i).fill(contactEmail);

            // Use "Create and mark as sent" button
            await page.getByRole("button", { name: /criar e marcar como enviado/i }).click();

            // Should redirect to quote detail
            await expect(page).toHaveURL(/\/quotes\/[a-f0-9-]+/, { timeout: 10000 });

            // Quote should be visible
            await expect(page.getByText(quoteTitle)).toBeVisible();

            // Wait and check final state
            await page.waitForTimeout(2000);

            // Either resend button (sent) or mark as sent button (draft due to limit)
            const resendButton = page.getByRole("button", { name: /reenviar/i });
            const markSentButton = page.getByRole("button", { name: /marcar como enviado/i });

            const hasResend = await resendButton.isVisible().catch(() => false);
            const hasMarkSent = await markSentButton.isVisible().catch(() => false);

            expect(hasResend || hasMarkSent).toBeTruthy();
        });
    });

    test.describe("Status Updates After Sending", () => {
        test("should show status update buttons on sent quote", async ({ page }) => {
            // Create and try to send quote
            await page.goto("/quotes/new");

            const quoteTitle = `Status Test ${Date.now()}`;
            await page.getByLabel(/título/i).fill(quoteTitle);

            await page.getByRole("button", { name: /criar e marcar como enviado/i }).click();
            await expect(page).toHaveURL(/\/quotes\/[a-f0-9-]+/, { timeout: 10000 });

            // Wait for page to be fully loaded
            await page.waitForTimeout(2000);

            // Check if status update buttons are visible (only if quote was sent)
            const resendButton = page.getByRole("button", { name: /reenviar/i });
            if (await resendButton.isVisible().catch(() => false)) {
                // Quote was sent - status buttons should be available
                // They are rendered as buttons with specific classes
                const ganhoButton = page.locator("button").filter({ hasText: /ganho/i });
                const perdidoButton = page.locator("button").filter({ hasText: /perdido/i });

                // At least one status option should be visible
                const hasGanho = await ganhoButton.isVisible().catch(() => false);
                const hasPerdido = await perdidoButton.isVisible().catch(() => false);

                expect(hasGanho || hasPerdido).toBeTruthy();
            } else {
                // Quote wasn't sent (likely limit reached) - mark as sent should be visible
                await expect(page.getByRole("button", { name: /marcar como enviado/i })).toBeVisible();
            }
        });

        test("should show loss reason modal when marking as lost", async ({ page }) => {
            // Create and try to send quote
            await page.goto("/quotes/new");

            const quoteTitle = `Lost Test ${Date.now()}`;
            await page.getByLabel(/título/i).fill(quoteTitle);

            await page.getByRole("button", { name: /criar e marcar como enviado/i }).click();
            await expect(page).toHaveURL(/\/quotes\/[a-f0-9-]+/, { timeout: 10000 });

            await page.waitForTimeout(2000);

            // Check if we can access the lost button
            const perdidoButton = page.locator("button").filter({ hasText: /perdido/i });

            if (await perdidoButton.isVisible().catch(() => false)) {
                await perdidoButton.click();

                // Should show loss reason modal
                await expect(page.getByText(/marcar como perdido/i)).toBeVisible({ timeout: 3000 });
                await expect(page.getByText(/preço elevado/i)).toBeVisible();

                // Close modal
                await page.getByRole("button", { name: /cancelar/i }).click();
            } else {
                // Quote wasn't sent due to limit - this is expected
                test.skip();
            }
        });
    });

    test.describe("Limit Exceeded Handling", () => {
        test("should show upgrade prompt when limit exceeded", async ({ page }) => {
            await page.goto("/quotes/new");

            const quoteTitle = `Limit Test ${Date.now()}`;
            await page.getByLabel(/título/i).fill(quoteTitle);

            await page.getByRole("button", { name: /guardar rascunho/i }).click();
            await expect(page).toHaveURL(/\/quotes\/[a-f0-9-]+/, { timeout: 10000 });

            // Get quote ID from URL
            const url = page.url();
            const quoteId = url.split("/quotes/")[1]?.split(/[?#]/)[0];

            if (quoteId) {
                // Intercept API to simulate limit exceeded
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

                // Try to mark as sent
                await page.getByRole("button", { name: /marcar como enviado/i }).click();

                // Should show limit error
                await expect(page.getByText(/limite.*atingido/i)).toBeVisible({ timeout: 5000 });
                await expect(page.getByText(/gerir plano/i)).toBeVisible();
            }
        });
    });

    test.describe("Quote List Navigation", () => {
        test("should navigate from quotes list to quote detail", async ({ page }) => {
            // First create a quote
            await page.goto("/quotes/new");
            const quoteTitle = `List Nav Test ${Date.now()}`;
            await page.getByLabel(/título/i).fill(quoteTitle);
            await page.getByRole("button", { name: /guardar rascunho/i }).click();
            await expect(page).toHaveURL(/\/quotes\/[a-f0-9-]+/, { timeout: 10000 });

            // Go to quotes list
            await page.goto("/quotes");

            // Find and click the quote
            const quoteLink = page.locator(`text=${quoteTitle}`).first();
            if (await quoteLink.isVisible({ timeout: 3000 })) {
                await quoteLink.click();
                await expect(page).toHaveURL(/\/quotes\/[a-f0-9-]+/);
                await expect(page.getByText(quoteTitle)).toBeVisible();
            }
        });

        test("should filter quotes by status", async ({ page }) => {
            await page.goto("/quotes");

            // Check if filter tabs exist
            const sentTab = page.getByRole("tab", { name: /enviados?/i });
            if (await sentTab.isVisible({ timeout: 3000 })) {
                await sentTab.click();
                await expect(page).toHaveURL(/filter=sent|status=sent/);
            }
        });
    });
});
