"use server";

/**
 * Upload Actions (Duedilis D2)
 *
 * RLS: All queries filter by orgId. Membership required for all writes.
 * D2 models (Document, UploadBatch) not in main schema — use `prisma as any`.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as crypto from "crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UploadBatch {
  id: string;
  orgId: string;
  projectId: string;
  createdById: string;
  status: string;
  createdAt: Date;
}

export interface Document {
  id: string;
  orgId: string;
  projectId: string;
  uploadBatchId?: string | null;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  hash: string;
  uploadedById: string;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// biome-ignore lint: intentional cast for D2 models not in main schema
const db = prisma as unknown as {
  orgMembership: {
    findUnique: (args: unknown) => Promise<{ userId: string; orgId: string; role: string } | null>;
  };
  uploadBatch: {
    findUnique: (args: unknown) => Promise<UploadBatch | null>;
    create: (args: unknown) => Promise<UploadBatch>;
    update: (args: unknown) => Promise<UploadBatch>;
  };
  document: {
    findMany: (args: unknown) => Promise<Document[]>;
    findUnique: (args: unknown) => Promise<Document | null>;
    create: (args: unknown) => Promise<Document>;
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

function computeDocumentHash(
  orgId: string,
  filename: string,
  sizeBytes: number,
  storageKey: string
): string {
  const data = `${orgId}:${filename}:${sizeBytes}:${storageKey}`;
  return crypto.createHash("sha256").update(data).digest("hex");
}

// ---------------------------------------------------------------------------
// Upload operations
// ---------------------------------------------------------------------------

export async function presignUpload(input: {
  orgId: string;
  projectId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<{ uploadUrl: string; storageKey: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("401: unauthorized");
  }

  const userId = session.user.id;
  await requireMembership(input.orgId, userId);

  // Generate storage key scoped to org
  const storageKey = `orgs/${input.orgId}/documents/${Date.now()}-${input.filename}`;

  // In production: return pre-signed URL from storage provider
  // For now: return placeholder URL (storage provider integration in D2-impl)
  const uploadUrl = `/api/upload/${storageKey}`;

  return { uploadUrl, storageKey };
}

export async function verifyUploadHash(input: {
  orgId: string;
  storageKey: string;
  filename: string;
  sizeBytes: number;
  expectedHash: string;
}): Promise<{ valid: boolean; computedHash: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("401: unauthorized");
  }

  const userId = session.user.id;
  await requireMembership(input.orgId, userId);

  const computedHash = computeDocumentHash(
    input.orgId,
    input.filename,
    input.sizeBytes,
    input.storageKey
  );
  const valid = computedHash === input.expectedHash;

  return { valid, computedHash };
}

export async function createUploadBatch(input: {
  orgId: string;
  projectId: string;
}): Promise<UploadBatch> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("401: unauthorized");
  }

  const userId = session.user.id;
  await requireMembership(input.orgId, userId);

  return db.uploadBatch.create({
    data: {
      orgId: input.orgId,
      projectId: input.projectId,
      createdById: userId,
      status: "PENDING",
    },
  });
}

export async function confirmBatch(input: {
  orgId: string;
  batchId: string;
}): Promise<UploadBatch> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("401: unauthorized");
  }

  const userId = session.user.id;
  await requireMembership(input.orgId, userId);

  // RLS: verify batch belongs to org
  const batch = await db.uploadBatch.findUnique({
    where: { id: input.batchId },
  });

  if (!batch) {
    throw new Error("404: batch not found");
  }

  if (batch.orgId !== input.orgId) {
    throw new Error("403: forbidden — cross-org access");
  }

  return db.uploadBatch.update({
    where: { id: input.batchId },
    data: { status: "CONFIRMED" },
  });
}

export async function createIndividualDocument(input: {
  orgId: string;
  projectId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
}): Promise<Document> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("401: unauthorized");
  }

  const userId = session.user.id;
  await requireMembership(input.orgId, userId);

  const hash = computeDocumentHash(input.orgId, input.filename, input.sizeBytes, input.storageKey);

  return db.document.create({
    data: {
      orgId: input.orgId,
      projectId: input.projectId,
      filename: input.filename,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      storageKey: input.storageKey,
      hash,
      uploadedById: userId,
    },
  });
}
