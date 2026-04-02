"use server";

/**
 * Photo Actions (Duedilis D2)
 *
 * RLS: All queries filter by orgId. Membership required for all operations.
 * D2 models (Photo/Evidence) not in main schema — use `prisma as any`.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Photo {
  id: string;
  orgId: string;
  projectId: string;
  issueId?: string | null;
  filename: string;
  storageKey: string;
  capturedAt?: Date | null;
  uploadedById: string;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// biome-ignore lint: intentional cast for D2 models not in main schema
// Note: photo model is exposed as "evidence" in the DB (D2 schema decision)
const db = prisma as unknown as {
  orgMembership: {
    findUnique: (args: unknown) => Promise<{ userId: string; orgId: string; role: string } | null>;
  };
  evidence: {
    findMany: (args: unknown) => Promise<Photo[]>;
    findUnique: (args: unknown) => Promise<Photo | null>;
    create: (args: unknown) => Promise<Photo>;
    delete: (args: unknown) => Promise<Photo>;
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
// Photo operations
// ---------------------------------------------------------------------------

export async function uploadPhoto(input: {
  orgId: string;
  projectId: string;
  issueId?: string;
  filename: string;
  storageKey: string;
  capturedAt?: Date;
}): Promise<Photo> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("401: unauthorized");
  }

  const userId = session.user.id;
  await requireMembership(input.orgId, userId);

  return db.evidence.create({
    data: {
      orgId: input.orgId,
      projectId: input.projectId,
      issueId: input.issueId ?? null,
      filename: input.filename,
      storageKey: input.storageKey,
      capturedAt: input.capturedAt ?? null,
      uploadedById: userId,
    },
  });
}

export async function listPhotosByProject(input: {
  orgId: string;
  projectId: string;
}): Promise<Photo[]> {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  const userId = session.user.id;

  const membership = await db.orgMembership.findUnique({
    where: { userId_orgId: { userId, orgId: input.orgId } },
  });
  if (!membership) {
    return [];
  }

  // RLS: filter by orgId AND projectId
  return db.evidence.findMany({
    where: {
      orgId: input.orgId,
      projectId: input.projectId,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listPhotosByIssue(input: {
  orgId: string;
  issueId: string;
}): Promise<Photo[]> {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  const userId = session.user.id;

  const membership = await db.orgMembership.findUnique({
    where: { userId_orgId: { userId, orgId: input.orgId } },
  });
  if (!membership) {
    return [];
  }

  // RLS: filter by orgId AND issueId
  return db.evidence.findMany({
    where: {
      orgId: input.orgId,
      issueId: input.issueId,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function deletePhoto(input: { orgId: string; photoId: string }): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("401: unauthorized");
  }

  const userId = session.user.id;
  await requireMembership(input.orgId, userId);

  // RLS: verify photo belongs to org
  const photo = await db.evidence.findUnique({
    where: { id: input.photoId },
  });

  if (!photo) {
    throw new Error("Foto não encontrada (404)");
  }

  if (photo.orgId !== input.orgId) {
    throw new Error("403: forbidden — cross-org access");
  }

  await db.evidence.delete({
    where: { id: input.photoId },
  });
}
