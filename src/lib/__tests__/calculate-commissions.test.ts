/**
 * Commission Calculation Tests
 *
 * Tests:
 * 1. Commission amount = 20% of plan monthly price
 * 2. Idempotency: existing commission skipped
 * 3. Period format defaults to current YYYY-MM
 * 4. Happy path: 2 attributions, 1 already with commission → creates only 1
 */

import { describe, it, expect } from "vitest";

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
      existingCommissions.push({ partnerId: attr.partnerId, clientId: attr.clientId, period });
    }
  }

  return { created, skipped };
}

// ============================================================================
// Tests
// ============================================================================

describe("Commission Amount Calculation", () => {
  it("20% of €10/month plan = €2.00", () => {
    expect(calculateCommissionAmount(1000)).toBe(2.0);
  });

  it("20% of €29/month plan = €5.80", () => {
    expect(calculateCommissionAmount(2900)).toBe(5.8);
  });

  it("20% of €99/month plan = €19.80", () => {
    expect(calculateCommissionAmount(9900)).toBe(19.8);
  });

  it("20% of free plan (€0) = €0", () => {
    expect(calculateCommissionAmount(0)).toBe(0);
  });

  it("commission rounded to 2 decimal places", () => {
    const amount = calculateCommissionAmount(3300);
    expect(amount).toBe(6.6);
    const amount2 = calculateCommissionAmount(3333);
    const decimals = amount2.toString().split(".")[1]?.length ?? 0;
    expect(decimals).toBeLessThanOrEqual(2);
  });
});

describe("Period Format", () => {
  it("period format is YYYY-MM", () => {
    const period = getCurrentPeriod(new Date("2026-03-13T00:00:00Z"));
    expect(period).toBe("2026-03");
  });

  it("period pads single-digit months", () => {
    const period = getCurrentPeriod(new Date("2026-01-05T00:00:00Z"));
    expect(period).toBe("2026-01");
  });

  it("period validation accepts YYYY-MM", () => {
    expect(isValidPeriod("2026-03")).toBe(true);
    expect(isValidPeriod("2025-12")).toBe(true);
  });

  it("period validation rejects invalid formats", () => {
    expect(isValidPeriod("2026-3")).toBe(false);
    expect(isValidPeriod("26-03")).toBe(false);
    expect(isValidPeriod("2026/03")).toBe(false);
    expect(isValidPeriod("")).toBe(false);
  });
});

describe("Idempotency (mock)", () => {
  it("happy path: 2 attributions, 1 already with commission → creates only 1", () => {
    const attributions = [
      { partnerId: "partner-1", clientId: "user-1", priceMonthlyInCents: 2900 },
      { partnerId: "partner-1", clientId: "user-2", priceMonthlyInCents: 2900 },
    ];
    const existing: MockAttribution[] = [
      { partnerId: "partner-1", clientId: "user-1", period: "2026-03" },
    ];
    const result = simulateCommissionCreation(attributions, existing, "2026-03");
    expect(result.created).toBe(1);
    expect(result.skipped).toBe(1);
  });

  it("running twice in same month creates no duplicates", () => {
    const attributions = [
      { partnerId: "partner-1", clientId: "user-1", priceMonthlyInCents: 2900 },
    ];
    const existing: MockAttribution[] = [];
    const run1 = simulateCommissionCreation(attributions, existing, "2026-03");
    expect(run1.created).toBe(1);
    const run2 = simulateCommissionCreation(attributions, existing, "2026-03");
    expect(run2.created).toBe(0);
    expect(run2.skipped).toBe(1);
  });

  it("different months create separate commissions", () => {
    const attributions = [
      { partnerId: "partner-1", clientId: "user-1", priceMonthlyInCents: 2900 },
    ];
    const existing: MockAttribution[] = [
      { partnerId: "partner-1", clientId: "user-1", period: "2026-02" },
    ];
    const result = simulateCommissionCreation(attributions, existing, "2026-03");
    expect(result.created).toBe(1);
    expect(result.skipped).toBe(0);
  });

  it("multiple partners, no duplicates", () => {
    const attributions = [
      { partnerId: "partner-1", clientId: "user-1", priceMonthlyInCents: 2900 },
      { partnerId: "partner-2", clientId: "user-2", priceMonthlyInCents: 9900 },
      { partnerId: "partner-1", clientId: "user-3", priceMonthlyInCents: 2900 },
    ];
    const existing: MockAttribution[] = [];
    const result = simulateCommissionCreation(attributions, existing, "2026-03");
    expect(result.created).toBe(3);
    expect(result.skipped).toBe(0);
  });
});

describe("BoosterLedger Amount Consistency", () => {
  it("amountCents matches commissionAmount in euros", () => {
    const priceMonthlyInCents = 2900;
    const commissionAmount = calculateCommissionAmount(priceMonthlyInCents);
    const amountCents = Math.round(commissionAmount * 100);
    expect(amountCents).toBe(580);
  });

  it("rateBps matches 20% commission rate", () => {
    const rate = 0.2;
    const rateBps = Math.round(rate * 10000);
    expect(rateBps).toBe(2000);
  });
});
