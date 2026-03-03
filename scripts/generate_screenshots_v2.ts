import { chromium } from "playwright";

async function main() {
  console.log("🚀 Starting screenshot generation (Refined Data)...");

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  try {
    // 1. Login
    console.log("🔑 Logging in...");
    await page.goto("http://localhost:3000/login");
    await page.fill('input[type="email"]', "admin@demo.ritmo.app");
    await page.fill('input[type="password"]', "demo123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15000 });
    console.log("✅ Login successful");

    // 2. Force Dark Mode
    await page.evaluate(() => {
      window.localStorage.setItem("theme", "dark");
      document.documentElement.classList.add("dark");
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    // 3. Step 3: Dashboard (Cockpit)
    console.log("📸 Capturing Dashboard (Step 3)...");
    await page.screenshot({ path: "public/landing_step3_v2.png" });

    // 4. Step 1: New Quote
    // Just the form, clean state
    console.log("📸 Capturing New Quote (Step 1)...");
    await page.goto("http://localhost:3000/quotes/new");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "public/landing_step1_v2.png" });

    // 5. Step 2: Quotes List (The one the user complained about)
    // Now it should have realistic data
    console.log("📸 Capturing Quotes List (Step 2)...");
    await page.goto("http://localhost:3000/quotes");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "public/landing_step2_v2.png" });

    console.log("🎉 All screenshots updated with realistic data!");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await browser.close();
  }
}

main();
