/**
 * Tests for WhatsApp Notification Delivery Channel (D3-08b)
 *
 * Tests:
 * 1. sendUrgentWhatsApp — sends message via WhatsApp API for priority=URGENT notifications only
 * 2. sendUrgentWhatsApp — skips non-urgent notifications (returns early, no API call)
 * 3. WhatsApp message format includes notification title and action URL
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockWhatsAppSend = vi.fn();

vi.mock("@/lib/whatsapp-client", () => ({
  whatsappClient: {
    sendMessage: mockWhatsAppSend,
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

import { sendUrgentWhatsApp } from "@/lib/notification-channels";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const urgentNotification = {
  id: "notif-urgent-001",
  title: "Alerta urgente: prazo iminente",
  body: "O prazo de submissão termina em 30 minutos.",
  actionUrl: "https://app.useritmo.pt/notifications/notif-urgent-001",
  recipientPhone: "+351912345678",
  priority: "URGENT" as const,
  organizationId: "org-abc",
};

const normalNotification = {
  ...urgentNotification,
  id: "notif-normal-001",
  title: "Nova atualização disponível",
  priority: "NORMAL" as const,
};

const lowNotification = {
  ...urgentNotification,
  id: "notif-low-001",
  title: "Resumo semanal",
  priority: "LOW" as const,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("sendUrgentWhatsApp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWhatsAppSend.mockResolvedValue({ success: true, messageId: "wa-msg-456" });
  });

  it("sends WhatsApp message for priority=URGENT notifications", async () => {
    const result = await sendUrgentWhatsApp(urgentNotification);

    expect(mockWhatsAppSend).toHaveBeenCalledOnce();
    expect(result.success).toBe(true);
    expect(result.messageId).toBe("wa-msg-456");
  });

  it("skips non-urgent notifications — returns early without API call (NORMAL)", async () => {
    const result = await sendUrgentWhatsApp(normalNotification);

    expect(mockWhatsAppSend).not.toHaveBeenCalled();
    expect(result.skipped).toBe(true);
    expect(result.success).toBe(false);
  });

  it("skips non-urgent notifications — returns early without API call (LOW)", async () => {
    const result = await sendUrgentWhatsApp(lowNotification);

    expect(mockWhatsAppSend).not.toHaveBeenCalled();
    expect(result.skipped).toBe(true);
    expect(result.success).toBe(false);
  });

  it("WhatsApp message format includes notification title and action URL", async () => {
    await sendUrgentWhatsApp(urgentNotification);

    expect(mockWhatsAppSend).toHaveBeenCalledOnce();
    const [to, message] = mockWhatsAppSend.mock.calls[0];
    expect(to).toBe(urgentNotification.recipientPhone);
    expect(message).toContain(urgentNotification.title);
    expect(message).toContain(urgentNotification.actionUrl);
  });
});
