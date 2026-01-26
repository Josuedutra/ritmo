/**
 * Tests for Entitlements System (P0)
 *
 * Validates:
 * 1. Trial ends → falls to free → autoEmail/bcc disabled
 * 2. Precedence: Paid > Trial > Free
 * 3. Trial only decrements on first send
 * 4. Free uses period usage counter
 */

import { describe, it, expect } from "vitest";
import { calculateEntitlements, FREE_TIER_LIMIT, TRIAL_LIMIT, PLAN_LIMITS } from "@/lib/entitlements";

// Default storage and AHA fields for test org data
const DEFAULT_ORG_FIELDS = {
    storageUsedBytes: BigInt(0),
    storageQuotaBytes: BigInt(PLAN_LIMITS.starter.storageQuotaBytes),
    trialBccCaptures: 0,
    ahaFirstBccCapture: false,
    ahaFirstBccCaptureAt: null,
};

describe("Entitlements System", () => {
    const now = new Date("2024-06-15T10:00:00Z");

    describe("Tier Precedence (Paid > Trial > Free)", () => {
        it("should return paid tier when subscription is active", () => {
            const org = {
                id: "org-1",
                trialEndsAt: new Date("2024-06-20"), // Trial still valid
                trialSentLimit: 20,
                trialSentUsed: 5,
                autoEmailEnabled: true,
                bccInboundEnabled: true,
                subscription: {
                    status: "active",
                    quotesLimit: 100,
                    planId: "pro",
                    plan: { id: "pro", name: "Pro", monthlyQuoteLimit: 100, maxUsers: 5 },
                },
                ...DEFAULT_ORG_FIELDS,
            };

            const entitlements = calculateEntitlements(org, 10, now);

            expect(entitlements.tier).toBe("paid");
            expect(entitlements.effectivePlanLimit).toBe(100);
            expect(entitlements.quotesUsed).toBe(10); // Uses period usage, not trial
            expect(entitlements.autoEmailEnabled).toBe(true);
            expect(entitlements.bccInboundEnabled).toBe(true);
        });

        it("should return trial tier when no active subscription but trial is valid", () => {
            const org = {
                id: "org-1",
                trialEndsAt: new Date("2024-06-20"), // 5 days remaining
                trialSentLimit: 20,
                trialSentUsed: 10,
                autoEmailEnabled: true,
                bccInboundEnabled: true,
                subscription: null,
                ...DEFAULT_ORG_FIELDS,
            };

            const entitlements = calculateEntitlements(org, 5, now);

            expect(entitlements.tier).toBe("trial");
            expect(entitlements.effectivePlanLimit).toBe(20);
            expect(entitlements.quotesUsed).toBe(10); // Uses trialSentUsed
            expect(entitlements.quotesRemaining).toBe(10); // 20 - 10 = 10
            expect(entitlements.trialActive).toBe(true);
            expect(entitlements.trialDaysRemaining).toBe(5);
            expect(entitlements.autoEmailEnabled).toBe(true);
            expect(entitlements.bccInboundEnabled).toBe(true);
        });

        it("should return free tier when trial expired and no subscription", () => {
            const org = {
                id: "org-1",
                trialEndsAt: new Date("2024-06-10"), // Expired 5 days ago
                trialSentLimit: 20,
                trialSentUsed: 25,
                autoEmailEnabled: true, // DB still has true but should be overridden
                bccInboundEnabled: true,
                subscription: null,
                ...DEFAULT_ORG_FIELDS,
            };

            const entitlements = calculateEntitlements(org, 3, now);

            expect(entitlements.tier).toBe("free");
            expect(entitlements.effectivePlanLimit).toBe(FREE_TIER_LIMIT);
            expect(entitlements.quotesUsed).toBe(3); // Uses period usage
            expect(entitlements.trialActive).toBe(false);
            expect(entitlements.autoEmailEnabled).toBe(false); // Disabled for free
            expect(entitlements.bccInboundEnabled).toBe(false); // Disabled for free
        });
    });

    describe("Trial to Free Transition", () => {
        it("should disable autoEmail and bcc when trial ends", () => {
            // Before trial ends
            const orgBeforeTrial = {
                id: "org-1",
                trialEndsAt: new Date("2024-06-16"), // Tomorrow
                trialSentLimit: 20,
                trialSentUsed: 15,
                autoEmailEnabled: true,
                bccInboundEnabled: true,
                subscription: null,
                ...DEFAULT_ORG_FIELDS,
            };

            const beforeEntitlements = calculateEntitlements(orgBeforeTrial, 0, now);
            expect(beforeEntitlements.tier).toBe("trial");
            expect(beforeEntitlements.autoEmailEnabled).toBe(true);
            expect(beforeEntitlements.bccInboundEnabled).toBe(true);

            // After trial ends (same org data, different now)
            const afterNow = new Date("2024-06-17T10:00:00Z");
            const afterEntitlements = calculateEntitlements(orgBeforeTrial, 0, afterNow);

            expect(afterEntitlements.tier).toBe("free");
            expect(afterEntitlements.autoEmailEnabled).toBe(false);
            expect(afterEntitlements.bccInboundEnabled).toBe(false);
        });

        it("should switch from trial counter to period counter when trial ends", () => {
            const org = {
                id: "org-1",
                trialEndsAt: new Date("2024-06-10"), // Expired
                trialSentLimit: 20,
                trialSentUsed: 25, // Had 25 during trial
                autoEmailEnabled: true,
                bccInboundEnabled: true,
                subscription: null,
                ...DEFAULT_ORG_FIELDS,
            };

            const entitlements = calculateEntitlements(org, 3, now);

            // Should use period usage (3), not trial usage (25)
            expect(entitlements.quotesUsed).toBe(3);
            expect(entitlements.effectivePlanLimit).toBe(FREE_TIER_LIMIT);
            expect(entitlements.quotesRemaining).toBe(2); // FREE_TIER_LIMIT (5) - 3 = 2
        });
    });

    describe("Usage Limits and canMarkSent", () => {
        it("should allow sending when under limit", () => {
            const org = {
                id: "org-1",
                trialEndsAt: null,
                trialSentLimit: 20,
                trialSentUsed: 0,
                autoEmailEnabled: false,
                bccInboundEnabled: false,
                subscription: null,
                ...DEFAULT_ORG_FIELDS,
            };

            const entitlements = calculateEntitlements(org, 3, now); // 3 used, FREE_TIER_LIMIT is 5

            expect(entitlements.canMarkSent.allowed).toBe(true);
            expect(entitlements.quotesRemaining).toBe(2); // 5 - 3 = 2
        });

        it("should block sending when free tier limit reached", () => {
            const org = {
                id: "org-1",
                trialEndsAt: null,
                trialSentLimit: 20,
                trialSentUsed: 0,
                autoEmailEnabled: false,
                bccInboundEnabled: false,
                subscription: null,
                ...DEFAULT_ORG_FIELDS,
            };

            const entitlements = calculateEntitlements(org, 5, now); // 5 used = FREE_TIER_LIMIT

            expect(entitlements.canMarkSent.allowed).toBe(false);
            expect(entitlements.canMarkSent.reason).toBe("LIMIT_EXCEEDED");
            expect(entitlements.canMarkSent.ctaAction).toBe("upgrade_plan");
            expect(entitlements.canMarkSent.ctaUrl).toBe("/settings/billing");
        });

        it("should block sending when trial limit reached", () => {
            const org = {
                id: "org-1",
                trialEndsAt: new Date("2024-06-20"),
                trialSentLimit: 20,
                trialSentUsed: 30,
                autoEmailEnabled: true,
                bccInboundEnabled: true,
                subscription: null,
                ...DEFAULT_ORG_FIELDS,
            };

            const entitlements = calculateEntitlements(org, 0, now);

            expect(entitlements.canMarkSent.allowed).toBe(false);
            expect(entitlements.canMarkSent.reason).toBe("LIMIT_EXCEEDED");
            expect(entitlements.canMarkSent.ctaAction).toBe("start_subscription");
        });

        it("should block when subscription is cancelled", () => {
            const org = {
                id: "org-1",
                trialEndsAt: null,
                trialSentLimit: 20,
                trialSentUsed: 0,
                autoEmailEnabled: false,
                bccInboundEnabled: false,
                subscription: {
                    status: "cancelled",
                    quotesLimit: 100,
                    planId: "pro",
                    plan: { id: "pro", name: "Pro", monthlyQuoteLimit: 100, maxUsers: 5 },
                },
                ...DEFAULT_ORG_FIELDS,
            };

            const entitlements = calculateEntitlements(org, 5, now);

            expect(entitlements.canMarkSent.allowed).toBe(false);
            expect(entitlements.canMarkSent.reason).toBe("SUBSCRIPTION_CANCELLED");
            expect(entitlements.canMarkSent.ctaAction).toBe("reactivate_subscription");
        });

        it("should block when subscription is past_due", () => {
            const org = {
                id: "org-1",
                trialEndsAt: null,
                trialSentLimit: 20,
                trialSentUsed: 0,
                autoEmailEnabled: false,
                bccInboundEnabled: false,
                subscription: {
                    status: "past_due",
                    quotesLimit: 100,
                    planId: "pro",
                    plan: { id: "pro", name: "Pro", monthlyQuoteLimit: 100, maxUsers: 5 },
                },
                ...DEFAULT_ORG_FIELDS,
            };

            const entitlements = calculateEntitlements(org, 5, now);

            expect(entitlements.canMarkSent.allowed).toBe(false);
            expect(entitlements.canMarkSent.reason).toBe("PAYMENT_REQUIRED");
            expect(entitlements.canMarkSent.ctaAction).toBe("update_payment");
        });
    });

    describe("Resend Tracking", () => {
        // Note: Resend logic is in mark-sent/route.ts, not in entitlements
        // These tests verify the constants are exported correctly
        it("should export correct limits", () => {
            expect(FREE_TIER_LIMIT).toBe(5);
            expect(TRIAL_LIMIT).toBe(20);
        });
    });
});

describe("Cron AUTO_EMAIL Gating", () => {
    it("should only enable auto-email for paid/trial tiers", () => {
        const now = new Date("2024-06-15T10:00:00Z");

        // Paid tier
        const paidOrg = {
            id: "org-1",
            trialEndsAt: null,
            trialSentLimit: 20,
            trialSentUsed: 0,
            autoEmailEnabled: true,
            bccInboundEnabled: true,
            subscription: {
                status: "active",
                quotesLimit: 100,
                planId: "pro",
                plan: { id: "pro", name: "Pro", monthlyQuoteLimit: 100, maxUsers: 5 },
            },
            ...DEFAULT_ORG_FIELDS,
        };
        const paidEntitlements = calculateEntitlements(paidOrg, 0, now);
        expect(paidEntitlements.autoEmailEnabled).toBe(true);

        // Trial tier
        const trialOrg = {
            id: "org-1",
            trialEndsAt: new Date("2024-06-20"),
            trialSentLimit: 20,
            trialSentUsed: 0,
            autoEmailEnabled: true,
            bccInboundEnabled: true,
            subscription: null,
            ...DEFAULT_ORG_FIELDS,
        };
        const trialEntitlements = calculateEntitlements(trialOrg, 0, now);
        expect(trialEntitlements.autoEmailEnabled).toBe(true);

        // Free tier
        const freeOrg = {
            id: "org-1",
            trialEndsAt: new Date("2024-06-10"), // Expired
            trialSentLimit: 20,
            trialSentUsed: 0,
            autoEmailEnabled: true, // DB value ignored
            bccInboundEnabled: true,
            subscription: null,
            ...DEFAULT_ORG_FIELDS,
        };
        const freeEntitlements = calculateEntitlements(freeOrg, 0, now);
        expect(freeEntitlements.autoEmailEnabled).toBe(false);
    });
});

describe("BCC Inbound Gating", () => {
    it("should only enable BCC inbound for paid/trial tiers", () => {
        const now = new Date("2024-06-15T10:00:00Z");

        // Free tier should have bccInboundEnabled = false
        const freeOrg = {
            id: "org-1",
            trialEndsAt: null, // No trial
            trialSentLimit: 20,
            trialSentUsed: 0,
            autoEmailEnabled: false,
            bccInboundEnabled: false,
            subscription: null,
            ...DEFAULT_ORG_FIELDS,
        };
        const freeEntitlements = calculateEntitlements(freeOrg, 0, now);
        expect(freeEntitlements.bccInboundEnabled).toBe(false);

        // Trial tier should have bccInboundEnabled = true
        const trialOrg = {
            id: "org-1",
            trialEndsAt: new Date("2024-06-20"),
            trialSentLimit: 20,
            trialSentUsed: 0,
            autoEmailEnabled: true,
            bccInboundEnabled: true,
            subscription: null,
            ...DEFAULT_ORG_FIELDS,
        };
        const trialEntitlements = calculateEntitlements(trialOrg, 0, now);
        expect(trialEntitlements.bccInboundEnabled).toBe(true);
    });
});
