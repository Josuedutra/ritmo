"use server";

/**
 * Evidence Link Actions (Duedilis D3)
 *
 * RLS: All links scoped to orgId. Cross-org linking is forbidden.
 * Links are immutable (no update/delete after creation).
 * D3 models (EvidenceLink) not in main schema — use `prisma as any`.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as crypto from "crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EntityType = "issue" | "document" | "photo" | "meeting";

export interface EvidenceLink {
  id: string;
  orgId: string;
  sourceType: EntityType;
  sourceId: string;
  targetType: EntityType;
  targetId: string;
  createdById: string;
  hash: string;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// biome-ignore lint: intentional cast for D3 models not in main schema
const db = prisma as unknown as {
  orgMembership: {
    findUnique: (args: unknown) => Promise<{ userId: string; orgId: string; role: string } | null>;
  };
  issue: {
    findUnique: (args: unknown) => Promise<{ id: string; orgId: string } | null>;
  };
  document: {
    findUnique: (args: unknown) => Promise<{ id: string; orgId: string } | null>;
  };
  photo: {
    findUnique: (args: unknown) => Promise<{ id: string; orgId: string } | null>;
  };
  meeting: {
    findUnique: (args: unknown) => Promise<{ id: string; orgId: string } | null>;
  };
  evidenceLink: {
    findMany: (args: unknown) => Promise<EvidenceLink[]>;
    findUnique: (args: unknown) => Promise<EvidenceLink | null>;
    create: (args: unknown) => Promise<EvidenceLink>;
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

async function fetchEntity(
  type: EntityType,
  id: string
): Promise<{ id: string; orgId: string } | null> {
  switch (type) {
    case "issue":
      return db.issue.findUnique({ where: { id } });
    case "document":
      return db.document.findUnique({ where: { id } });
    case "photo":
      return db.photo.findUnique({ where: { id } });
    case "meeting":
      return db.meeting.findUnique({ where: { id } });
    default:
      return null;
  }
}

function computeAuditHash(
  orgId: string,
  sourceType: string,
  sourceId: string,
  targetType: string,
  targetId: string,
  userId: string,
  createdAt: string
): string {
  const data = `${orgId}:${sourceType}:${sourceId}:${targetType}:${targetId}:${userId}:${createdAt}`;
  return crypto.createHash("sha256").update(data).digest("hex");
}

// ---------------------------------------------------------------------------
// Evidence Link operations
// ---------------------------------------------------------------------------

export async function createEvidenceLink(input: {
  orgId: string;
  sourceType: EntityType;
  sourceId: string;
  targetType: EntityType;
  targetId: string;
}): Promise<EvidenceLink> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("401: unauthorized");
  }

  const userId = session.user.id;
  await requireMembership(input.orgId, userId);

  // RLS: verify source entity belongs to org
  const sourceEntity = await fetchEntity(input.sourceType, input.sourceId);
  if (!sourceEntity) {
    throw new Error("404: source entity not found");
  }
  if (sourceEntity.orgId !== input.orgId) {
    throw new Error("403: forbidden — cross-org");
  }

  // RLS: verify target entity belongs to org
  const targetEntity = await fetchEntity(input.targetType, input.targetId);
  if (!targetEntity) {
    throw new Error("404: target entity not found");
  }
  if (targetEntity.orgId !== input.orgId) {
    throw new Error("403: forbidden — cross-org");
  }

  const now = new Date();
  const hash = computeAuditHash(
    input.orgId,
    input.sourceType,
    input.sourceId,
    input.targetType,
    input.targetId,
    userId,
    now.toISOString()
  );

  return db.evidenceLink.create({
    data: {
      orgId: input.orgId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      targetType: input.targetType,
      targetId: input.targetId,
      createdById: userId,
      hash,
      createdAt: now,
    },
  });
}

export async function listLinksForEntity(input: {
  orgId: string;
  entityType: EntityType;
  entityId: string;
}): Promise<EvidenceLink[]> {
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

  // Bidirectional: find links where entity is source OR target
  // RLS: both queries filter by orgId
  const [asSource, asTarget] = await Promise.all([
    db.evidenceLink.findMany({
      where: {
        orgId: input.orgId,
        sourceType: input.entityType,
        sourceId: input.entityId,
      },
    }),
    db.evidenceLink.findMany({
      where: {
        orgId: input.orgId,
        targetType: input.entityType,
        targetId: input.entityId,
      },
    }),
  ]);

  // Deduplicate by id
  const seen = new Set<string>();
  const combined: EvidenceLink[] = [];
  for (const link of [...asSource, ...asTarget]) {
    if (!seen.has(link.id)) {
      seen.add(link.id);
      combined.push(link);
    }
  }

  return combined.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

// Links are immutable — update/delete always throw
export async function updateEvidenceLink(_input: unknown): Promise<never> {
  throw new Error("403: proibido — imutável");
}

export async function deleteEvidenceLink(_input: unknown): Promise<never> {
  throw new Error("403: proibido — imutável");
}
