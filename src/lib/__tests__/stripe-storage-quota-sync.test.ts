/**
 * P0-MC-01: Storage Quota Sync Tests
 *
 * Validates that Organization.storageQuotaBytes is correctly synced
 * when subscription/plan changes occur via Stripe webhooks.
 *
 * Scenarios:
 * 1. Upgrade: org default → Pro (20 GB)
 * 2. Downgrade: Pro → Starter (5 GB)
 * 3. Cancelled: subscription deleted → free quota (100 MB)
 * 4. Idempotency: same webhook twice maintains correct quota
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    getStorageQuotaForPlan,
    syncStorageQuota,
    PLAN_LIMITS,
} from "@/lib/entitlements";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
    prisma: {
        organization: {
            findUnique: vi.fn(),
            update: vi.fn(),
        },
        usageCounter: {
            findFirst: vi.fn(),
        },
    },
}));

import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
    organization: {
        findUnique: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
    };
    usageCounter: {
        findFirst: ReturnType<typeof vi.fn>;
    };
};

describe("P0-MC-01: Storage Quota Sync", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getStorageQuotaForPlan", () => {
        it("should return free quota for null planId", () => {
            const quota = getStorageQuotaForPlan(null);
            expect(quota).toBe(PLAN_LIMITS.free.storageQuotaBytes);
            expect(quota).toBe(100 * 1024 * 1024); // 100 MB
        });

        it("should return free quota for 'free' planId", () => {
            const quota = getStorageQuotaForPlan("free");
            expect(quota).toBe(PLAN_LIMITS.free.storageQuotaBytes);
        });

        it("should return starter quota for 'starter' planId", () => {
            const quota = getStorageQuotaForPlan("starter");
            expect(quota).toBe(PLAN_LIMITS.starter.storageQuotaBytes);
            expect(quota).toBe(5 * 1024 * 1024 * 1024); // 5 GB
        });

        it("should return pro quota for 'pro' planId", () => {
            const quota = getStorageQuotaForPlan("pro");
            expect(quota).toBe(PLAN_LIMITS.pro.storageQuotaBytes);
            expect(quota).toBe(20 * 1024 * 1024 * 1024); // 20 GB
        });

        it("should return enterprise quota for 'enterprise' planId", () => {
            const quota = getStorageQuotaForPlan("enterprise");
            expect(quota).toBe(PLAN_LIMITS.enterprise.storageQuotaBytes);
            expect(quota).toBe(50 * 1024 * 1024 * 1024); // 50 GB
        });

        it("should fallback to starter for unknown planId", () => {
            const quota = getStorageQuotaForPlan("unknown_plan");
            expect(quota).toBe(PLAN_LIMITS.starter.storageQuotaBytes);
        });
    });

    describe("syncStorageQuota", () => {
        it("should sync quota for paid org with Pro plan", async () => {
            const orgId = "org-pro";

            // Mock org with Pro subscription
            mockPrisma.organization.findUnique.mockResolvedValue({
                id: orgId,
                trialEndsAt: null,
                trialSentLimit: 20,
                trialSentUsed: 0,
                autoEmailEnabled: true,
                bccInboundEnabled: true,
                storageUsedBytes: BigInt(1 * 1024 * 1024 * 1024), // 1 GB used
                storageQuotaBytes: BigInt(1 * 1024 * 1024 * 1024), // 1 GB (old default)
                subscription: {
                    status: "active",
                    quotesLimit: 250,
                    planId: "pro",
                    plan: { id: "pro", name: "Pro", monthlyQuoteLimit: 250, maxUsers: 5 },
                },
            });

            mockPrisma.usageCounter.findFirst.mockResolvedValue(null);
            mockPrisma.organization.update.mockResolvedValue({});

            const newQuota = await syncStorageQuota(orgId);

            expect(newQuota).toBe(PLAN_LIMITS.pro.storageQuotaBytes);
            expect(mockPrisma.organization.update).toHaveBeenCalledWith({
                where: { id: orgId },
                data: { storageQuotaBytes: BigInt(PLAN_LIMITS.pro.storageQuotaBytes) },
            });
        });

        it("should sync quota for trial org (Starter level)", async () => {
            const orgId = "org-trial";

            // Mock org in trial
            mockPrisma.organization.findUnique.mockResolvedValue({
                id: orgId,
                trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days left
                trialSentLimit: 20,
                trialSentUsed: 5,
                autoEmailEnabled: true,
                bccInboundEnabled: true,
                storageUsedBytes: BigInt(0),
                storageQuotaBytes: BigInt(1 * 1024 * 1024 * 1024), // 1 GB (old default)
                subscription: null,
            });

            mockPrisma.usageCounter.findFirst.mockResolvedValue(null);
            mockPrisma.organization.update.mockResolvedValue({});

            const newQuota = await syncStorageQuota(orgId);

            // Trial gets Starter-level quota
            expect(newQuota).toBe(PLAN_LIMITS.starter.storageQuotaBytes);
        });

        it("should sync quota for free tier org", async () => {
            const orgId = "org-free";

            // Mock org in free tier (trial expired)
            mockPrisma.organization.findUnique.mockResolvedValue({
                id: orgId,
                trialEndsAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Expired 7 days ago
                trialSentLimit: 20,
                trialSentUsed: 25,
                autoEmailEnabled: false,
                bccInboundEnabled: false,
                storageUsedBytes: BigInt(50 * 1024 * 1024), // 50 MB used
                storageQuotaBytes: BigInt(5 * 1024 * 1024 * 1024), // 5 GB (old Starter quota)
                subscription: null,
            });

            mockPrisma.usageCounter.findFirst.mockResolvedValue(null);
            mockPrisma.organization.update.mockResolvedValue({});

            const newQuota = await syncStorageQuota(orgId);

            // Free tier gets free quota
            expect(newQuota).toBe(PLAN_LIMITS.free.storageQuotaBytes);
        });
    });

    describe("Plan upgrade/downgrade scenarios", () => {
        it("Upgrade: 1GB default → Pro (20 GB)", () => {
            // Simulate upgrade scenario
            const oldQuota = 1 * 1024 * 1024 * 1024; // 1 GB (schema default)
            const newQuota = getStorageQuotaForPlan("pro");

            expect(newQuota).toBeGreaterThan(oldQuota);
            expect(newQuota).toBe(20 * 1024 * 1024 * 1024); // 20 GB
        });

        it("Downgrade: Pro (20 GB) → Starter (5 GB)", () => {
            const proQuota = getStorageQuotaForPlan("pro");
            const starterQuota = getStorageQuotaForPlan("starter");

            expect(proQuota).toBeGreaterThan(starterQuota);
            expect(starterQuota).toBe(5 * 1024 * 1024 * 1024); // 5 GB
        });

        it("Cancelled: Any plan → Free (100 MB)", () => {
            const proQuota = getStorageQuotaForPlan("pro");
            const freeQuota = getStorageQuotaForPlan("free");

            expect(proQuota).toBeGreaterThan(freeQuota);
            expect(freeQuota).toBe(100 * 1024 * 1024); // 100 MB
        });
    });

    describe("Idempotency", () => {
        it("should maintain same quota when webhook processed twice", async () => {
            const orgId = "org-idempotent";

            // First call
            mockPrisma.organization.findUnique.mockResolvedValue({
                id: orgId,
                trialEndsAt: null,
                trialSentLimit: 20,
                trialSentUsed: 0,
                autoEmailEnabled: true,
                bccInboundEnabled: true,
                storageUsedBytes: BigInt(0),
                storageQuotaBytes: BigInt(PLAN_LIMITS.pro.storageQuotaBytes), // Already Pro quota
                subscription: {
                    status: "active",
                    quotesLimit: 250,
                    planId: "pro",
                    plan: { id: "pro", name: "Pro", monthlyQuoteLimit: 250, maxUsers: 5 },
                },
            });

            mockPrisma.usageCounter.findFirst.mockResolvedValue(null);
            mockPrisma.organization.update.mockResolvedValue({});

            const quota1 = await syncStorageQuota(orgId);
            const quota2 = await syncStorageQuota(orgId);

            expect(quota1).toBe(quota2);
            expect(quota1).toBe(PLAN_LIMITS.pro.storageQuotaBytes);
        });
    });

    describe("Plan limits constants", () => {
        it("should have correct storage quotas defined", () => {
            expect(PLAN_LIMITS.free.storageQuotaBytes).toBe(100 * 1024 * 1024); // 100 MB
            expect(PLAN_LIMITS.starter.storageQuotaBytes).toBe(5 * 1024 * 1024 * 1024); // 5 GB
            expect(PLAN_LIMITS.pro.storageQuotaBytes).toBe(20 * 1024 * 1024 * 1024); // 20 GB
            expect(PLAN_LIMITS.enterprise.storageQuotaBytes).toBe(50 * 1024 * 1024 * 1024); // 50 GB
        });

        it("should have correct retention days defined", () => {
            expect(PLAN_LIMITS.free.retentionDays).toBe(30);
            expect(PLAN_LIMITS.starter.retentionDays).toBe(180);
            expect(PLAN_LIMITS.pro.retentionDays).toBe(365);
            expect(PLAN_LIMITS.enterprise.retentionDays).toBe(730);
        });
    });
});
