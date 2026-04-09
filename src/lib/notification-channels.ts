/**
 * Notification Delivery Channels (D3-08b)
 *
 * Stub — implementation pending.
 * Tests in src/__tests__/notification-email.test.ts and notification-whatsapp.test.ts
 * are RED-phase TDD covering this module.
 */

export interface EmailNotificationInput {
  id: string;
  title: string;
  body: string;
  actionUrl: string;
  recipientEmail: string;
  organizationId: string;
}

export interface EmailNotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  skipped?: boolean;
  reason?: string;
}

export interface WhatsAppNotificationInput {
  id: string;
  title: string;
  body: string;
  actionUrl: string;
  recipientPhone: string;
  priority: "URGENT" | "NORMAL" | "LOW";
  organizationId: string;
}

export interface WhatsAppNotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  skipped?: boolean;
  reason?: string;
}

export interface EmailTemplateInput {
  title: string;
  body: string;
  actionUrl: string;
}

/**
 * Send an email notification via Resend.
 * Includes rate-limit dedup: skips if same notification was sent within 5 minutes.
 */
export async function sendEmailNotification(
  _input: EmailNotificationInput
): Promise<EmailNotificationResult> {
  throw new Error("Not implemented");
}

/**
 * Send a WhatsApp message for URGENT priority notifications only.
 * Non-urgent notifications are skipped.
 */
export async function sendUrgentWhatsApp(
  _input: WhatsAppNotificationInput
): Promise<WhatsAppNotificationResult> {
  throw new Error("Not implemented");
}

/**
 * Render an HTML email template for a notification.
 */
export function renderEmailTemplate(_input: EmailTemplateInput): string {
  throw new Error("Not implemented");
}
