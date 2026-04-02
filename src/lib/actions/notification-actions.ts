"use server";

/**
 * Notification Actions (D3-06/07)
 *
 * In-app notifications + outbox pattern for async delivery.
 * Schema: Notification + NotificationOutbox (not in main Prisma schema — use `prisma as any`).
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationType =
  | "ISSUE_CREATED"
  | "ISSUE_ASSIGNED"
  | "ISSUE_STATUS_CHANGED"
  | "APPROVAL_REQUESTED"
  | "APPROVAL_DECIDED"
  | "MEETING_SCHEDULED"
  | "MEETING_MINUTES_PUBLISHED"
  | "ACTION_ITEM_ASSIGNED"
  | "EVIDENCE_LINK_CREATED";

export type OutboxChannel = "EMAIL" | "WHATSAPP";
export type OutboxStatus = "PENDING" | "PROCESSING" | "DELIVERED" | "FAILED";

export interface Notification {
  id: string;
  orgId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  read: boolean;
  readAt?: Date | null;
  createdAt: Date;
}

export interface NotificationOutboxEntry {
  id: string;
  orgId: string;
  recipientId: string;
  channel: OutboxChannel;
  subject?: string | null;
  body: string;
  entityType?: string | null;
  entityId?: string | null;
  status: OutboxStatus;
  attempts: number;
  lastAttemptAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// D3 models (Notification, NotificationOutbox) not yet in main Prisma schema
// Access via raw cast — safe at runtime when migrations are applied
// biome-ignore lint: intentional cast for D3 models
const db = prisma as unknown as {
  notification: {
    findMany: (args: unknown) => Promise<Notification[]>;
    findFirst: (args: unknown) => Promise<Notification | null>;
    findUnique: (args: unknown) => Promise<Notification | null>;
    create: (args: unknown) => Promise<Notification>;
    update: (args: unknown) => Promise<Notification>;
    updateMany: (args: unknown) => Promise<{ count: number }>;
    count: (args: unknown) => Promise<number>;
  };
  notificationOutbox: {
    findMany: (args: unknown) => Promise<NotificationOutboxEntry[]>;
    findFirst: (args: unknown) => Promise<NotificationOutboxEntry | null>;
    create: (args: unknown) => Promise<NotificationOutboxEntry>;
    update: (args: unknown) => Promise<NotificationOutboxEntry>;
  };
};

// ---------------------------------------------------------------------------
// In-app notifications — read side
// ---------------------------------------------------------------------------

export async function listNotifications(input: {
  orgId: string;
  limit?: number;
}): Promise<Notification[]> {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  const userId = session.user.id;
  const limit = input.limit ?? 20;

  return db.notification.findMany({
    where: {
      orgId: input.orgId,
      userId,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getUnreadCount(orgId: string): Promise<number> {
  const session = await auth();
  if (!session?.user?.id) {
    return 0;
  }

  const userId = session.user.id;

  return db.notification.count({
    where: {
      orgId,
      userId,
      read: false,
    },
  });
}

export async function markAsRead(notificationId: string): Promise<Notification | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const userId = session.user.id;

  // Verify ownership before updating
  const existing = await db.notification.findUnique({
    where: { id: notificationId },
  });

  if (!existing) {
    return null;
  }

  if (existing.userId !== userId) {
    throw new Error("403: forbidden — cannot mark another user's notification as read");
  }

  return db.notification.update({
    where: { id: notificationId },
    data: {
      read: true,
      readAt: new Date(),
    },
  });
}

export async function markAllAsRead(orgId: string): Promise<{ count: number }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { count: 0 };
  }

  const userId = session.user.id;

  const result = await db.notification.updateMany({
    where: {
      orgId,
      userId,
      read: false,
    },
    data: {
      read: true,
      readAt: new Date(),
    },
  });

  return { count: result.count };
}

// ---------------------------------------------------------------------------
// Notification creation (internal — called by event triggers)
// ---------------------------------------------------------------------------

export async function createNotification(input: {
  orgId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
}): Promise<Notification | null> {
  // Idempotency: skip if same notification created in last 5 minutes
  if (input.entityId) {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existing = await db.notification.findFirst({
      where: {
        userId: input.userId,
        type: input.type,
        entityId: input.entityId,
        createdAt: { gte: fiveMinutesAgo },
      },
    });

    if (existing) {
      logger.info(
        `[notifications] Skipping duplicate notification: ${input.type} for ${input.entityId}`
      );
      return existing;
    }
  }

  return db.notification.create({
    data: {
      orgId: input.orgId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      read: false,
      readAt: null,
    },
  });
}

// ---------------------------------------------------------------------------
// Outbox management (internal — called by triggers)
// ---------------------------------------------------------------------------

export async function enqueueNotification(input: {
  orgId: string;
  recipientId: string;
  channel: OutboxChannel;
  subject?: string;
  body: string;
  entityType?: string;
  entityId?: string;
}): Promise<NotificationOutboxEntry> {
  return db.notificationOutbox.create({
    data: {
      orgId: input.orgId,
      recipientId: input.recipientId,
      channel: input.channel,
      subject: input.subject ?? null,
      body: input.body,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      status: "PENDING",
      attempts: 0,
      lastAttemptAt: null,
    },
  });
}

// ---------------------------------------------------------------------------
// Outbox processor (internal — called by cron worker)
// ---------------------------------------------------------------------------

export async function processOutbox(): Promise<{
  processed: number;
  delivered: number;
  failed: number;
}> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const MAX_ATTEMPTS = 3;
  const BATCH_SIZE = 10;

  // Fetch pending entries ready for processing
  const entries: NotificationOutboxEntry[] = await db.notificationOutbox.findMany({
    where: {
      OR: [
        {
          status: "PENDING",
          OR: [{ lastAttemptAt: null }, { lastAttemptAt: { lt: fiveMinutesAgo } }],
        },
        {
          status: "FAILED",
          attempts: { lt: MAX_ATTEMPTS },
          OR: [{ lastAttemptAt: null }, { lastAttemptAt: { lt: fiveMinutesAgo } }],
        },
      ],
    },
    take: BATCH_SIZE,
  });

  let delivered = 0;
  let failed = 0;

  for (const entry of entries) {
    // Mark as PROCESSING
    await db.notificationOutbox.update({
      where: { id: entry.id },
      data: {
        status: "PROCESSING",
        lastAttemptAt: new Date(),
        attempts: entry.attempts + 1,
      },
    });

    try {
      // Channel handlers are implemented in D3-08/08b
      // For now: EMAIL and WHATSAPP remain PENDING until those tasks deliver
      // Per spec: "apenas marcar como DELIVERED quando channel handler existir"
      const channelHandled = false;

      if (channelHandled) {
        await db.notificationOutbox.update({
          where: { id: entry.id },
          data: { status: "DELIVERED" },
        });
        delivered++;
      } else {
        // No handler yet — revert to PENDING for future processing
        await db.notificationOutbox.update({
          where: { id: entry.id },
          data: { status: "PENDING" },
        });
      }
    } catch (err) {
      logger.error(`[notifications] Outbox delivery failed for ${entry.id}:`, err);
      const newAttempts = entry.attempts + 1;
      await db.notificationOutbox.update({
        where: { id: entry.id },
        data: {
          status: newAttempts >= MAX_ATTEMPTS ? "FAILED" : "PENDING",
        },
      });
      failed++;
    }
  }

  return {
    processed: entries.length,
    delivered,
    failed,
  };
}
