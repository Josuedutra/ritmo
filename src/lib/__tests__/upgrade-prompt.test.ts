/**
 * Unit tests for Upgrade Prompt P1.1 features
 *
 * Run with: npx vitest run src/lib/__tests__/upgrade-prompt.test.ts
 *
 * Tests:
 * 1) Dedupe key generation and 24h window
 * 2) getRecommendedPlan logic
 * 3) runUpgradeCta scenarios (portal, checkout, contact)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getRecommendedPlan, runUpgradeCta } from "../billing/cta";

// ============================================================================
// Test 1: getRecommendedPlan logic
// ============================================================================
describe("getRecommendedPlan", () => {
    it("should recommend pro for send_limit when no current plan", () => {
        expect(getRecommendedPlan("send_limit")).toBe("pro");
    });

    it("should recommend pro for storage_quota when no current plan", () => {
        expect(getRecommendedPlan("storage_quota")).toBe("pro");
    });

    it("should recommend starter for retention_expired when no current plan", () => {
        // Default behavior when current plan is unknown
        expect(getRecommendedPlan("retention_expired")).toBe("starter");
    });

    it("should recommend pro for retention_expired when on starter", () => {
        expect(getRecommendedPlan("retention_expired", "starter")).toBe("pro");
    });

    it("should recommend pro for seat_limit", () => {
        expect(getRecommendedPlan("seat_limit")).toBe("pro");
    });

    it("should recommend pro_plus for benchmark_locked", () => {
        expect(getRecommendedPlan("benchmark_locked")).toBe("pro_plus");
    });

    it("should recommend pro_plus when on pro and hitting send_limit", () => {
        expect(getRecommendedPlan("send_limit", "pro")).toBe("pro_plus");
    });

    it("should recommend pro_plus when on pro and hitting storage_quota", () => {
        expect(getRecommendedPlan("storage_quota", "pro")).toBe("pro_plus");
    });
});

// ============================================================================
// Test 2: runUpgradeCta scenarios
// ============================================================================
describe("runUpgradeCta", () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        // Reset fetch mock before each test
        vi.resetAllMocks();
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    it("should return contact type for pro_plus (benchmark_locked)", async () => {
        const result = await runUpgradeCta({
            reason: "benchmark_locked",
            organizationId: "org_123",
        });

        expect(result.type).toBe("contact");
        expect(result.url).toContain("mailto:ritmo@useritmo.pt");
        expect(result.url).toContain("Pedido%20Pro%2B");
    });

    it("should return portal type when portal API succeeds", async () => {
        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            json: async () => ({ url: "https://billing.stripe.com/portal/xxx" }),
        });

        const result = await runUpgradeCta({
            reason: "send_limit",
        });

        expect(result.type).toBe("portal");
        expect(result.url).toBe("https://billing.stripe.com/portal/xxx");
    });

    it("should try checkout when portal returns choose_plan action", async () => {
        // First call: portal fails with choose_plan
        // Second call: checkout succeeds
        global.fetch = vi
            .fn()
            .mockResolvedValueOnce({
                ok: false,
                status: 400,
                json: async () => ({ action: "choose_plan" }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ url: "https://checkout.stripe.com/xxx" }),
            });

        const result = await runUpgradeCta({
            reason: "send_limit",
        });

        expect(result.type).toBe("checkout");
        expect(result.url).toBe("https://checkout.stripe.com/xxx");

        // Verify checkout was called with correct plan
        expect(global.fetch).toHaveBeenCalledTimes(2);
        const checkoutCall = (global.fetch as ReturnType<typeof vi.fn>).mock
            .calls[1];
        expect(checkoutCall[0]).toBe("/api/billing/checkout");
        const body = JSON.parse(checkoutCall[1].body);
        expect(body.planKey).toBe("pro");
    });

    it("should return contact when checkout fails with PLAN_NOT_PUBLIC", async () => {
        global.fetch = vi
            .fn()
            .mockResolvedValueOnce({
                ok: false,
                status: 400,
                json: async () => ({ action: "choose_plan" }),
            })
            .mockResolvedValueOnce({
                ok: false,
                status: 400,
                json: async () => ({ error: "PLAN_NOT_PUBLIC" }),
            });

        const result = await runUpgradeCta({
            reason: "send_limit",
            currentPlan: "pro", // This will recommend pro_plus
            organizationId: "org_123",
        });

        expect(result.type).toBe("contact");
        expect(result.url).toContain("mailto:");
    });

    it("should return fallback on network error", async () => {
        global.fetch = vi.fn().mockRejectedValueOnce(new Error("Network error"));

        const result = await runUpgradeCta({
            reason: "send_limit",
        });

        expect(result.type).toBe("fallback");
        expect(result.url).toBe("/settings/billing");
        expect(result.error).toBe("Network error");
    });

    it("should return fallback when both portal and checkout fail", async () => {
        global.fetch = vi
            .fn()
            .mockResolvedValueOnce({
                ok: false,
                status: 400,
                json: async () => ({ action: "choose_plan" }),
            })
            .mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: async () => ({ error: "Internal error" }),
            });

        const result = await runUpgradeCta({
            reason: "send_limit",
        });

        expect(result.type).toBe("fallback");
        expect(result.url).toBe("/settings/billing");
    });
});

// ============================================================================
// Test 3: Dedupe logic (simulated)
// ============================================================================
describe("Dedupe localStorage logic", () => {
    const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

    // Simulate the dedupe functions from upgrade-prompt.tsx
    function hasShownRecently(
        storage: Map<string, string>,
        reason: string,
        location: string,
        now: number
    ): boolean {
        const key = `upgrade_prompt_shown:${reason}:${location}`;
        const stored = storage.get(key);

        if (!stored) return false;

        const timestamp = parseInt(stored, 10);
        if (isNaN(timestamp)) return false;

        return now - timestamp < DEDUPE_WINDOW_MS;
    }

    function markShown(
        storage: Map<string, string>,
        reason: string,
        location: string,
        now: number
    ): void {
        const key = `upgrade_prompt_shown:${reason}:${location}`;
        storage.set(key, now.toString());
    }

    it("should return false when no previous shown event", () => {
        const storage = new Map<string, string>();
        const now = Date.now();

        expect(hasShownRecently(storage, "send_limit", "quote_actions", now)).toBe(
            false
        );
    });

    it("should return true when shown within 24h window", () => {
        const storage = new Map<string, string>();
        const now = Date.now();
        const twelveHoursAgo = now - 12 * 60 * 60 * 1000;

        storage.set(
            "upgrade_prompt_shown:send_limit:quote_actions",
            twelveHoursAgo.toString()
        );

        expect(hasShownRecently(storage, "send_limit", "quote_actions", now)).toBe(
            true
        );
    });

    it("should return false when shown more than 24h ago", () => {
        const storage = new Map<string, string>();
        const now = Date.now();
        const thirtyHoursAgo = now - 30 * 60 * 60 * 1000;

        storage.set(
            "upgrade_prompt_shown:send_limit:quote_actions",
            thirtyHoursAgo.toString()
        );

        expect(hasShownRecently(storage, "send_limit", "quote_actions", now)).toBe(
            false
        );
    });

    it("should use different keys for different reason+location combos", () => {
        const storage = new Map<string, string>();
        const now = Date.now();
        const recentTime = now - 1000;

        // Mark send_limit at quote_actions
        storage.set(
            "upgrade_prompt_shown:send_limit:quote_actions",
            recentTime.toString()
        );

        // Same reason, different location should NOT be deduped
        expect(
            hasShownRecently(storage, "send_limit", "proposal_section", now)
        ).toBe(false);

        // Different reason, same location should NOT be deduped
        expect(
            hasShownRecently(storage, "storage_quota", "quote_actions", now)
        ).toBe(false);

        // Same reason and location SHOULD be deduped
        expect(hasShownRecently(storage, "send_limit", "quote_actions", now)).toBe(
            true
        );
    });

    it("should handle invalid timestamp gracefully", () => {
        const storage = new Map<string, string>();
        const now = Date.now();

        storage.set("upgrade_prompt_shown:send_limit:quote_actions", "invalid");

        expect(hasShownRecently(storage, "send_limit", "quote_actions", now)).toBe(
            false
        );
    });
});
