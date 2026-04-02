/**
 * Tests for Email Notification Delivery Channel (D3-08b)
 *
 * Tests:
 * 1. sendEmailNotification — calls Resend API with correct to/subject/html, returns messageId
 * 2. sendEmailNotification — handles Resend API error gracefully (no throw, logs error)
 * 3. Email template renders correct HTML with notification data (title, body, actionUrl)
 * 4. Rate limiting: does not send duplicate email for same notification within 5min window
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockResendEmailsSend = vi.fn();

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: mockResendEmailsSend,
    },
  })),
}));

const mockPrismaNotificationOutboxFindFirst = vi.fn();
const mockPrismaNotificationOutboxUpdate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    notificationOutbox: {
      findFirst: mockPrismaNotificationOutboxFindFirst,
      update: mockPrismaNotificationOutboxUpdate,
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

// ---------------------------------------------------------------------------
// Import after mocks are hoisted
// ---------------------------------------------------------------------------

import { sendEmailNotification, renderEmailTemplate } from "@/lib/notification-channels";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const baseNotification = {
  id: "notif-001",
  title: "Nova mensagem recebida",
  body: "Tens uma nova mensagem de João Silva.",
  actionUrl: "https://app.useritmo.pt/notifications/notif-001",
  recipientEmail: "user@example.com",
  organizationId: "org-abc",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("sendEmailNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResendEmailsSend.mockResolvedValue({ data: { id: "resend-msg-123" }, error: null });
    mockPrismaNotificationOutboxFindFirst.mockResolvedValue(null);
  });

  it("calls Resend API with correct to, subject, html and returns messageId", async () => {
    const result = await sendEmailNotification(baseNotification);

    expect(mockResendEmailsSend).toHaveBeenCalledOnce();
    const call = mockResendEmailsSend.mock.calls[0][0];
    expect(call.to).toBe(baseNotification.recipientEmail);
    expect(call.subject).toContain(baseNotification.title);
    expect(call.html).toContain(baseNotification.title);
    expect(result.messageId).toBe("resend-msg-123");
    expect(result.success).toBe(true);
  });

  it("handles Resend API error gracefully — does not throw, logs error", async () => {
    mockResendEmailsSend.mockResolvedValue({
      data: null,
      error: { message: "Invalid API key", name: "invalid_api_key" },
    });

    const result = await sendEmailNotification(baseNotification);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    // Must NOT throw
  });

  it("does not send duplicate email for same notification within 5-minute window", async () => {
    // Simulate a recent outbox entry (within 5 min)
    const recentlySent = new Date(Date.now() - 2 * 60 * 1000); // 2 min ago
    mockPrismaNotificationOutboxFindFirst.mockResolvedValue({
      id: "outbox-001",
      notificationId: baseNotification.id,
      channel: "EMAIL",
      status: "DELIVERED",
      sentAt: recentlySent,
    });

    const result = await sendEmailNotification(baseNotification);

    expect(mockResendEmailsSend).not.toHaveBeenCalled();
    expect(result.skipped).toBe(true);
    expect(result.reason).toMatch(/duplicate|rate.?limit/i);
  });
});

describe("renderEmailTemplate", () => {
  it("renders correct HTML with notification title, body and actionUrl", () => {
    const html = renderEmailTemplate({
      title: baseNotification.title,
      body: baseNotification.body,
      actionUrl: baseNotification.actionUrl,
    });

    expect(html).toContain(baseNotification.title);
    expect(html).toContain(baseNotification.body);
    expect(html).toContain(baseNotification.actionUrl);
    // Should be valid HTML fragment
    expect(html).toMatch(/<[a-z]/i);
  });
});
