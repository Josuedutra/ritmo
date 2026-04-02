"use server";

/**
 * Meeting Actions (Duedilis D3)
 *
 * RLS: All queries filter by orgId. Membership required for all operations.
 * D3 models (Meeting, MeetingParticipant, MeetingMinutes, ActionItem)
 * not in main schema — use `prisma as any`.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MeetingStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface Meeting {
  id: string;
  orgId: string;
  projectId: string;
  title: string;
  description?: string | null;
  scheduledAt: Date;
  location?: string | null;
  status: MeetingStatus;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MeetingParticipant {
  id: string;
  meetingId: string;
  userId: string;
  role: string;
  attended: boolean;
}

export interface MeetingMinutes {
  id: string;
  meetingId: string;
  orgId: string;
  content: string;
  publishedAt?: Date | null;
  publishedById?: string | null;
  createdAt: Date;
}

export interface ActionItem {
  id: string;
  meetingId: string;
  orgId: string;
  description: string;
  assignedToId?: string | null;
  dueDate?: Date | null;
  status: string;
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
  meeting: {
    findMany: (args: unknown) => Promise<Meeting[]>;
    findUnique: (args: unknown) => Promise<Meeting | null>;
    create: (args: unknown) => Promise<Meeting>;
    update: (args: unknown) => Promise<Meeting>;
  };
  meetingParticipant: {
    findMany: (args: unknown) => Promise<MeetingParticipant[]>;
    findUnique: (args: unknown) => Promise<MeetingParticipant | null>;
    create: (args: unknown) => Promise<MeetingParticipant>;
    update: (args: unknown) => Promise<MeetingParticipant>;
    delete: (args: unknown) => Promise<MeetingParticipant>;
  };
  meetingMinutes: {
    findUnique: (args: unknown) => Promise<MeetingMinutes | null>;
    create: (args: unknown) => Promise<MeetingMinutes>;
    update: (args: unknown) => Promise<MeetingMinutes>;
  };
  actionItem: {
    findMany: (args: unknown) => Promise<ActionItem[]>;
    findUnique: (args: unknown) => Promise<ActionItem | null>;
    create: (args: unknown) => Promise<ActionItem>;
    update: (args: unknown) => Promise<ActionItem>;
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
// Meeting CRUD
// ---------------------------------------------------------------------------

export async function createMeeting(input: {
  orgId: string;
  projectId: string;
  title: string;
  description?: string;
  scheduledAt: Date;
  location?: string;
}): Promise<Meeting> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("401: unauthorized");
  }

  const userId = session.user.id;
  await requireMembership(input.orgId, userId);

  return db.meeting.create({
    data: {
      orgId: input.orgId,
      projectId: input.projectId,
      title: input.title,
      description: input.description ?? null,
      scheduledAt: input.scheduledAt,
      location: input.location ?? null,
      status: "SCHEDULED",
      createdById: userId,
    },
  });
}

export async function listMeetings(input: {
  orgId: string;
  projectId?: string;
}): Promise<Meeting[]> {
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

  const where: Record<string, unknown> = { orgId: input.orgId };
  if (input.projectId) {
    where.projectId = input.projectId;
  }

  return db.meeting.findMany({
    where,
    orderBy: { scheduledAt: "desc" },
  });
}

export async function updateMeeting(input: {
  orgId: string;
  meetingId: string;
  title?: string;
  description?: string;
  scheduledAt?: Date;
  location?: string;
  status?: MeetingStatus;
}): Promise<Meeting> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("401: unauthorized");
  }

  const userId = session.user.id;
  await requireMembership(input.orgId, userId);

  // RLS: verify meeting belongs to org
  const existing = await db.meeting.findUnique({
    where: { id: input.meetingId },
  });

  if (!existing) {
    throw new Error("404: meeting not found");
  }

  if (existing.orgId !== input.orgId) {
    throw new Error("403: forbidden — cross-org access");
  }

  const data: Record<string, unknown> = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.scheduledAt !== undefined) data.scheduledAt = input.scheduledAt;
  if (input.location !== undefined) data.location = input.location;
  if (input.status !== undefined) data.status = input.status;

  return db.meeting.update({
    where: { id: input.meetingId },
    data,
  });
}

// ---------------------------------------------------------------------------
// Participants
// ---------------------------------------------------------------------------

export async function addParticipant(input: {
  orgId: string;
  meetingId: string;
  userId: string;
  role?: string;
}): Promise<MeetingParticipant> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("401: unauthorized");
  }

  const requesterId = session.user.id;
  await requireMembership(input.orgId, requesterId);

  // RLS: verify meeting belongs to org
  const meeting = await db.meeting.findUnique({
    where: { id: input.meetingId },
  });

  if (!meeting) {
    throw new Error("404: meeting not found");
  }

  if (meeting.orgId !== input.orgId) {
    throw new Error("403: forbidden — cross-org access");
  }

  // Verify target user is also a member of the org
  const targetMembership = await db.orgMembership.findUnique({
    where: { userId_orgId: { userId: input.userId, orgId: input.orgId } },
  });
  if (!targetMembership) {
    throw new Error("403: forbidden — target user is not a member of this org");
  }

  return db.meetingParticipant.create({
    data: {
      meetingId: input.meetingId,
      userId: input.userId,
      role: input.role ?? "PARTICIPANT",
      attended: false,
    },
  });
}

// ---------------------------------------------------------------------------
// Minutes
// ---------------------------------------------------------------------------

export async function publishMinutes(input: {
  orgId: string;
  meetingId: string;
  content: string;
}): Promise<MeetingMinutes> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("401: unauthorized");
  }

  const userId = session.user.id;
  const membership = await requireMembership(input.orgId, userId);

  // Only ADMIN_ORG or GESTOR_PROJETO can publish minutes
  if (membership.role !== "ADMIN_ORG" && membership.role !== "GESTOR_PROJETO") {
    throw new Error("403: forbidden — requires ADMIN_ORG or GESTOR_PROJETO role");
  }

  // RLS: verify meeting belongs to org
  const meeting = await db.meeting.findUnique({
    where: { id: input.meetingId },
  });

  if (!meeting) {
    throw new Error("404: meeting not found");
  }

  if (meeting.orgId !== input.orgId) {
    throw new Error("403: forbidden — cross-org access");
  }

  // Check if minutes already exist
  const existing = await db.meetingMinutes.findUnique({
    where: { meetingId: input.meetingId },
  });

  if (existing) {
    return db.meetingMinutes.update({
      where: { meetingId: input.meetingId },
      data: {
        content: input.content,
        publishedAt: new Date(),
        publishedById: userId,
      },
    });
  }

  return db.meetingMinutes.create({
    data: {
      meetingId: input.meetingId,
      orgId: input.orgId,
      content: input.content,
      publishedAt: new Date(),
      publishedById: userId,
    },
  });
}
