"use server";

/**
 * Approval Actions (Duedilis D2)
 *
 * RLS: All queries filter by orgId. Membership required for all operations.
 * D2 models (Approval) not in main schema — use `prisma as any`.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface Approval {
  id: string;
  orgId: string;
  entityType: string;
  entityId: string;
  requestedById: string;
  reviewedById?: string | null;
  status: ApprovalStatus;
  comment?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// biome-ignore lint: intentional cast for D2 models not in main schema
const db = prisma as unknown as {
  orgMembership: {
    findUnique: (args: unknown) => Promise<{ userId: string; orgId: string; role: string } | null>;
  };
  approval: {
    findMany: (args: unknown) => Promise<Approval[]>;
    findUnique: (args: unknown) => Promise<Approval | null>;
    create: (args: unknown) => Promise<Approval>;
    update: (args: unknown) => Promise<Approval>;
  };
};

async function requireMembership(orgId: string, userId: string) {
  const membership = await db.orgMembership.findUnique({
    where: { userId_orgId: { userId, orgId } },
  });
  if (!membership) {
    throw new Error("403: forbidden — not a member of this org");
  }
  return membership;
}

// ---------------------------------------------------------------------------
// Approval operations
// ---------------------------------------------------------------------------

export async function createApproval(input: {
  orgId: string;
  entityType: string;
  entityId: string;
}): Promise<Approval> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("401: unauthorized");
  }

  const userId = session.user.id;
  await requireMembership(input.orgId, userId);

  return db.approval.create({
    data: {
      orgId: input.orgId,
      entityType: input.entityType,
      entityId: input.entityId,
      requestedById: userId,
      status: "PENDING",
    },
  });
}

export async function reviewApproval(input: {
  orgId: string;
  approvalId: string;
  decision: "APPROVED" | "REJECTED";
  comment?: string;
}): Promise<Approval> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("401: unauthorized");
  }

  const userId = session.user.id;
  const membership = await requireMembership(input.orgId, userId);

  // Only ADMIN_ORG or FISCAL can review approvals
  if (membership.role !== "ADMIN_ORG" && membership.role !== "FISCAL") {
    throw new Error("403: forbidden — requires ADMIN_ORG or FISCAL role");
  }

  // RLS: verify approval belongs to org
  const approval = await db.approval.findUnique({
    where: { id: input.approvalId },
  });

  if (!approval) {
    throw new Error("404: approval not found");
  }

  if (approval.orgId !== input.orgId) {
    throw new Error("403: forbidden — cross-org access");
  }

  return db.approval.update({
    where: { id: input.approvalId },
    data: {
      status: input.decision,
      reviewedById: userId,
      comment: input.comment ?? null,
    },
  });
}
