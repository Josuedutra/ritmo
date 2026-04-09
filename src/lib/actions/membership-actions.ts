"use server";

/**
 * Membership Actions (Duedilis D1)
 *
 * RLS: All queries filter by orgId. Role changes require ADMIN_ORG.
 * D1 models (OrgMembership) not in main schema — use `prisma as any`.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OrgRole =
  | "ADMIN_ORG"
  | "GESTOR_PROJETO"
  | "FISCAL"
  | "TECNICO"
  | "AUDITOR"
  | "OBSERVADOR";

export interface OrgMembership {
  userId: string;
  orgId: string;
  role: OrgRole;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// biome-ignore lint: intentional cast for D1 models not in main schema
const db = prisma as unknown as {
  orgMembership: {
    findMany: (args: unknown) => Promise<OrgMembership[]>;
    findUnique: (args: unknown) => Promise<OrgMembership | null>;
    create: (args: unknown) => Promise<OrgMembership>;
    update: (args: unknown) => Promise<OrgMembership>;
    delete: (args: unknown) => Promise<OrgMembership>;
  };
};

async function requireAdminMembership(orgId: string, userId: string) {
  const membership = await db.orgMembership.findUnique({
    where: { userId_orgId: { userId, orgId } },
  });
  if (!membership) {
    throw new Error("403: forbidden — not a member of this org");
  }
  if (membership.role !== "ADMIN_ORG") {
    throw new Error("403: forbidden — requires ADMIN_ORG role");
  }
  return membership;
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function listMembers(input: { orgId: string }): Promise<OrgMembership[]> {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  const userId = session.user.id;

  // RLS: verify membership
  const membership = await db.orgMembership.findUnique({
    where: { userId_orgId: { userId, orgId: input.orgId } },
  });
  if (!membership) {
    return [];
  }

  return db.orgMembership.findMany({
    where: { orgId: input.orgId },
  });
}

// ---------------------------------------------------------------------------
// Write (ADMIN_ORG only)
// ---------------------------------------------------------------------------

export async function addMember(input: {
  orgId: string;
  targetUserId: string;
  role: OrgRole;
}): Promise<OrgMembership> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("401: unauthorized");
  }

  const userId = session.user.id;
  await requireAdminMembership(input.orgId, userId);

  return db.orgMembership.create({
    data: {
      orgId: input.orgId,
      userId: input.targetUserId,
      role: input.role,
    },
  });
}

export async function removeMember(input: { orgId: string; targetUserId: string }): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("401: unauthorized");
  }

  const userId = session.user.id;
  await requireAdminMembership(input.orgId, userId);

  // RLS: verify target membership belongs to same org
  const target = await db.orgMembership.findUnique({
    where: { userId_orgId: { userId: input.targetUserId, orgId: input.orgId } },
  });
  if (!target) {
    throw new Error("404: membership not found");
  }

  await db.orgMembership.delete({
    where: { userId_orgId: { userId: input.targetUserId, orgId: input.orgId } },
  });
}

export async function updateRole(input: {
  orgId: string;
  targetUserId: string;
  role: OrgRole;
}): Promise<OrgMembership> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("401: unauthorized");
  }

  const userId = session.user.id;
  await requireAdminMembership(input.orgId, userId);

  // RLS: verify target membership belongs to same org
  const target = await db.orgMembership.findUnique({
    where: { userId_orgId: { userId: input.targetUserId, orgId: input.orgId } },
  });
  if (!target) {
    throw new Error("404: membership not found");
  }

  return db.orgMembership.update({
    where: { userId_orgId: { userId: input.targetUserId, orgId: input.orgId } },
    data: { role: input.role },
  });
}
