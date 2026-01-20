/**
 * Unit tests for Plan visibility (Pro+ hidden, public plans only)
 *
 * Run with: npx tsx src/lib/__tests__/plans-visibility.test.ts
 *
 * Tests:
 * 1) PLANS_FALLBACK contains only public plans (no pro_plus, enterprise)
 * 2) Filtering works correctly
 * 3) Hidden plans cannot appear via fallback
 */

import { PLANS_FALLBACK, PLANS } from "../stripe";

// Simple test runner
let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
    try {
        fn();
        console.log(`✅ ${name}`);
        passed++;
    } catch (error) {
        console.log(`❌ ${name}`);
        console.log(`   Error: ${error instanceof Error ? error.message : error}`);
        failed++;
    }
}

function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(message);
    }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
    if (actual !== expected) {
        throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
}

console.log("\n📋 Plan Visibility Tests\n");
console.log("=".repeat(50));

// ============================================================================
// Test 1: PLANS_FALLBACK contains only public plans
// ============================================================================
console.log("\n🔹 Testing PLANS_FALLBACK content:\n");

test("PLANS_FALLBACK should NOT contain pro_plus", () => {
    assert(!("pro_plus" in PLANS_FALLBACK), "pro_plus should not be in fallback");
});

test("PLANS_FALLBACK should NOT contain enterprise", () => {
    assert(!("enterprise" in PLANS_FALLBACK), "enterprise should not be in fallback");
});

test("PLANS_FALLBACK should contain free", () => {
    assert("free" in PLANS_FALLBACK, "free should be in fallback");
});

test("PLANS_FALLBACK should contain starter", () => {
    assert("starter" in PLANS_FALLBACK, "starter should be in fallback");
});

test("PLANS_FALLBACK should contain pro", () => {
    assert("pro" in PLANS_FALLBACK, "pro should be in fallback");
});

test("PLANS_FALLBACK should have exactly 3 plans", () => {
    assertEqual(Object.keys(PLANS_FALLBACK).length, 3, "PLANS_FALLBACK.length");
});

// ============================================================================
// Test 2: All fallback plans are public
// ============================================================================
console.log("\n🔹 Testing fallback plans are all public:\n");

test("PLANS_FALLBACK.free should be public", () => {
    assertEqual(PLANS_FALLBACK.free.isPublic, true, "free.isPublic");
});

test("PLANS_FALLBACK.starter should be public", () => {
    assertEqual(PLANS_FALLBACK.starter.isPublic, true, "starter.isPublic");
});

test("PLANS_FALLBACK.pro should be public", () => {
    assertEqual(PLANS_FALLBACK.pro.isPublic, true, "pro.isPublic");
});

// ============================================================================
// Test 3: Hidden plans cannot appear via fallback filtering
// ============================================================================
console.log("\n🔹 Testing fallback filtering:\n");

test("Filtering PLANS_FALLBACK by isPublic returns all 3 plans", () => {
    const publicPlans = Object.values(PLANS_FALLBACK).filter(p => p.isPublic);
    assertEqual(publicPlans.length, 3, "publicPlans.length");
});

test("All PLANS_FALLBACK entries are public (no hidden plans can leak)", () => {
    const allPublic = Object.values(PLANS_FALLBACK).every(p => p.isPublic === true);
    assert(allPublic, "All fallback plans should be public");
});

test("PLANS_FALLBACK IDs are only free, starter, pro", () => {
    const ids = Object.keys(PLANS_FALLBACK).sort();
    assertEqual(ids.join(","), "free,pro,starter", "PLANS_FALLBACK IDs");
});

// ============================================================================
// Test 4: Verify plan pricing
// ============================================================================
console.log("\n🔹 Testing plan pricing:\n");

test("free plan should cost €0", () => {
    assertEqual(PLANS_FALLBACK.free.priceMonthly, 0, "free.priceMonthly");
});

test("starter plan should cost €39 (3900 cents)", () => {
    assertEqual(PLANS_FALLBACK.starter.priceMonthly, 3900, "starter.priceMonthly");
});

test("pro plan should cost €99 (9900 cents)", () => {
    assertEqual(PLANS_FALLBACK.pro.priceMonthly, 9900, "pro.priceMonthly");
});

// ============================================================================
// Test 5: Legacy PLANS alias works
// ============================================================================
console.log("\n🔹 Testing PLANS alias:\n");

test("PLANS should be same as PLANS_FALLBACK", () => {
    assert(PLANS === PLANS_FALLBACK, "PLANS should be alias for PLANS_FALLBACK");
});

// ============================================================================
// Summary
// ============================================================================
console.log("\n" + "=".repeat(50));
console.log(`Tests: ${passed} passed, ${failed} failed`);
console.log("=".repeat(50) + "\n");

if (failed > 0) {
    console.log("❌ Some tests failed!");
    process.exit(1);
} else {
    console.log("✅ All tests passed!");
}
