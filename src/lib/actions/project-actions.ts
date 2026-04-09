"use server";

/**
 * Project Actions (Duedilis D1)
 *
 * RLS: All queries filter by orgId. All writes verify org membership.
 * D1 models (Project, Issue, etc.) not in main schema — use `prisma as any`.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Project {
  id: string;
  orgId: string;
  name: string;
  description?: string | null;
  status: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// biome-ignore lint: intentional cast for D1 models not in main schema
const db = prisma as unknown as {
  project: {
    findMany: (args: unknown) => Promise<Project[]>;
    findUnique: (args: unknown) => Promise<Project | null>;
    create: (args: unknown) => Promise<Project>;
    update: (args: unknown) => Promise<Project>;
    delete: (args: unknown) => Promise<Project>;
  };
  orgMembership: {
    findUnique: (args: unknown) => Promise<{ userId: string; orgId: string; role: string } | null>;
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
// Read
// ---------------------------------------------------------------------------

export async function listProjects(input: { orgId: string }): Promise<Project[]> {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  const userId = session.user.id;

  // RLS: verify membership before listing
  const membership = await db.orgMembership.findUnique({
    where: { userId_orgId: { userId, orgId: input.orgId } },
  });
  if (!membership) {
    return [];
  }

  return db.project.findMany({
    where: { orgId: input.orgId },
    orderBy: { createdAt: "desc" },
  });
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export async function createProject(input: {
  orgId: string;
  name: string;
  description?: string;
}): Promise<Project> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("401: unauthorized");
  }

  const userId = session.user.id;
  await requireMembership(input.orgId, userId);

  return db.project.create({
    data: {
      orgId: input.orgId,
      name: input.name,
      description: input.description ?? null,
      status: "ACTIVE",
      createdById: userId,
    },
  });
}

export async function updateProject(input: {
  orgId: string;
  projectId: string;
  name?: string;
  description?: string;
  status?: string;
}): Promise<Project> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("401: unauthorized");
  }

  const userId = session.user.id;
  await requireMembership(input.orgId, userId);

  // RLS: verify project belongs to org before updating
  const existing = await db.project.findUnique({
    where: { id: input.projectId },
  });

  if (!existing) {
    throw new Error("404: project not found");
  }

  if (existing.orgId !== input.orgId) {
    throw new Error("403: forbidden — cross-org access");
  }

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.status !== undefined) data.status = input.status;

  return db.project.update({
    where: { id: input.projectId },
    data,
  });
}
