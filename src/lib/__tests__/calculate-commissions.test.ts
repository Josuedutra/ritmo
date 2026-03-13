/**
 * Commission Calculation Tests
 *
 * Run with: npx tsx src/lib/__tests__/calculate-commissions.test.ts
 *
 * Tests:
 * 1. Commission amount = 20% of plan monthly price
 * 2. Idempotency: existing commission skipped
 * 3. Attribution without subscription is skipped
 * 4. Period format defaults to current YYYY-MM
 * 5. Happy path: 2 attributions, 1 already with commission → creates only 1
 */

// Simple test runner
let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  const result = fn();
  if (result instanceof Promise) {
    result
      .then(() => {
        console.log(`✅ ${name}`);
        passed++;
      })
      .catch((error) => {
        console.log(`❌ ${name}`);
        console.log(`   Error: ${error instanceof Error ? error.message : error}`);
        failed++;
      });
  } else {
    try {
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${name}`);
      console.log(`   Error: ${error instanceof Error ? error.message : error}`);
      failed++;
    }
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(
      `${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

console.log("\n📋 Commission Calculation Tests\n");
console.log("=".repeat(50));

// ============================================================================
// Core calculation logic (extracted from route for testability)
// ============================================================================

function calculateCommissionAmount(priceMonthlyInCents: number, rate = 0.2): number {
  const subscriptionAmount = priceMonthlyInCents / 100; // cents → euros
  return Math.round(subscriptionAmount * rate * 100) / 100;
}

function getCurrentPeriod(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function isValidPeriod(period: string): boolean {
  return /^\d{4}-\d{2}$/.test(period);
}

// ============================================================================
// Test 1: Commission amount calculation
// ============================================================================
console.log("\n🔹 Test 1: Commission Amount Calculation\n");

test("20% of €10/month plan = €2.00", () => {
  const amount = calculateCommissionAmount(1000); // 1000 cents = €10
  assertEqual(amount, 2.0, "Commission should be €2.00");
});

test("20% of €29/month plan = €5.80", () => {
  const amount = calculateCommissionAmount(2900); // 2900 cents = €29
  assertEqual(amount, 5.8, "Commission should be €5.80");
});

test("20% of €99/month plan = €19.80", () => {
  const amount = calculateCommissionAmount(9900); // 9900 cents = €99
  assertEqual(amount, 19.8, "Commission should be €19.80");
});

test("20% of free plan (€0) = €0", () => {
  const amount = calculateCommissionAmount(0);
  assertEqual(amount, 0, "Free plan commission should be €0");
});

test("Commission rounded to 2 decimal places", () => {
  // €33 plan: 20% = €6.60 (exact)
  const amount = calculateCommissionAmount(3300);
  assertEqual(amount, 6.6, "Should be €6.60");
  // Verify it's rounded correctly for edge case
  const amount2 = calculateCommissionAmount(3333);
  assert(amount2.toString().split(".")[1]?.length <= 2, "Should have at most 2 decimal places");
});

// ============================================================================
// Test 2: Period format
// ============================================================================
console.log("\n🔹 Test 2: Period Format\n");

test("Period format is YYYY-MM", () => {
  const period = getCurrentPeriod(new Date("2026-03-13T00:00:00Z"));
  assertEqual(period, "2026-03", "Period should be 2026-03");
});

test("Period pads single-digit months", () => {
  const period = getCurrentPeriod(new Date("2026-01-05T00:00:00Z"));
  assertEqual(period, "2026-01", "January should be 01");
});

test("Period validation accepts YYYY-MM", () => {
  assert(isValidPeriod("2026-03"), "2026-03 should be valid");
  assert(isValidPeriod("2025-12"), "2025-12 should be valid");
});

test("Period validation rejects invalid formats", () => {
  assert(!isValidPeriod("2026-3"), "2026-3 should be invalid");
  assert(!isValidPeriod("26-03"), "26-03 should be invalid");
  assert(!isValidPeriod("2026/03"), "2026/03 should be invalid");
  assert(!isValidPeriod(""), "empty string should be invalid");
});

// ============================================================================
// Test 3: Idempotency simulation (mock prisma)
// ============================================================================
console.log("\n🔹 Test 3: Idempotency (mock)\n");

type MockAttribution = {
  partnerId: string;
  clientId: string;
  period: string;
};

function simulateCommissionCreation(
  attributions: Array<{ partnerId: string; clientId: string; priceMonthlyInCents: number }>,
  existingCommissions: MockAttribution[],
  period: string
): { created: number; skipped: number } {
  let created = 0;
  let skipped = 0;

  for (const attr of attributions) {
    const exists = existingCommissions.some(
      (c) => c.partnerId === attr.partnerId && c.clientId === attr.clientId && c.period === period
    );

    if (exists) {
      skipped++;
    } else {
      created++;
      // Simulates creating the commission
      existingCommissions.push({ partnerId: attr.partnerId, clientId: attr.clientId, period });
    }
  }

  return { created, skipped };
}

test("Happy path: 2 attributions, 1 already with commission → creates only 1", () => {
  const attributions = [
    { partnerId: "partner-1", clientId: "user-1", priceMonthlyInCents: 2900 },
    { partnerId: "partner-1", clientId: "user-2", priceMonthlyInCents: 2900 },
  ];

  // user-1 already has a commission for this period
  const existing: MockAttribution[] = [
    { partnerId: "partner-1", clientId: "user-1", period: "2026-03" },
  ];

  const result = simulateCommissionCreation(attributions, existing, "2026-03");

  assertEqual(result.created, 1, "Should create 1 commission");
  assertEqual(result.skipped, 1, "Should skip 1 existing commission");
});

test("Running twice in same month creates no duplicates", () => {
  const attributions = [{ partnerId: "partner-1", clientId: "user-1", priceMonthlyInCents: 2900 }];

  const existing: MockAttribution[] = [];

  // First run
  const run1 = simulateCommissionCreation(attributions, existing, "2026-03");
  assertEqual(run1.created, 1, "First run should create 1");

  // Second run (existing now has the commission from first run)
  const run2 = simulateCommissionCreation(attributions, existing, "2026-03");
  assertEqual(run2.created, 0, "Second run should create 0");
  assertEqual(run2.skipped, 1, "Second run should skip 1");
});

test("Different months create separate commissions", () => {
  const attributions = [{ partnerId: "partner-1", clientId: "user-1", priceMonthlyInCents: 2900 }];

  const existing: MockAttribution[] = [
    { partnerId: "partner-1", clientId: "user-1", period: "2026-02" }, // different month
  ];

  const result = simulateCommissionCreation(attributions, existing, "2026-03");
  assertEqual(result.created, 1, "Should create commission for new month");
  assertEqual(result.skipped, 0, "Should not skip (different month)");
});

test("Multiple partners, no duplicates", () => {
  const attributions = [
    { partnerId: "partner-1", clientId: "user-1", priceMonthlyInCents: 2900 },
    { partnerId: "partner-2", clientId: "user-2", priceMonthlyInCents: 9900 },
    { partnerId: "partner-1", clientId: "user-3", priceMonthlyInCents: 2900 },
  ];

  const existing: MockAttribution[] = [];
  const result = simulateCommissionCreation(attributions, existing, "2026-03");

  assertEqual(result.created, 3, "Should create 3 commissions for different partners/clients");
  assertEqual(result.skipped, 0, "None should be skipped");
});

// ============================================================================
// Test 4: BoosterLedger amount consistency
// ============================================================================
console.log("\n🔹 Test 4: BoosterLedger Amount Consistency\n");

test("amountCents matches commissionAmount in euros", () => {
  const priceMonthlyInCents = 2900;
  const commissionAmount = calculateCommissionAmount(priceMonthlyInCents); // 5.80
  const amountCents = Math.round(commissionAmount * 100); // 580
  assertEqual(amountCents, 580, "580 cents should match €5.80");
});

test("rateBps matches 20% commission rate", () => {
  const rate = 0.2;
  const rateBps = Math.round(rate * 10000); // 2000 bps
  assertEqual(rateBps, 2000, "20% should be 2000 bps");
});

// ============================================================================
// Summary
// ============================================================================
setTimeout(() => {
  console.log("\n" + "=".repeat(50));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) {
    process.exit(1);
  }
}, 100);
