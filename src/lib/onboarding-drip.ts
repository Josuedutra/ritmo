/**
 * Onboarding Drip Engine — Ritmo
 *
 * Manages a 5-email onboarding sequence triggered by signup_completed.
 * Uses ProductEvent for idempotency tracking and suppress-condition checks.
 *
 * Sequence:
 * 1. Welcome       — immediate (called from signup route)
 * 2. Setup Guide   — D+1   — suppress if mark_sent_success already occurred
 * 3. Quota Reminder — D+3  — suppress if mark_sent_success already occurred
 * 4. Social Proof  — D+7   — always sent
 * 5. Upgrade CTA   — D+14  — suppress if user already on paid plan
 *
 * Idempotency: Each sent email logs a ProductEvent with name "onboarding_drip_N_sent".
 * Before sending, we check if that event already exists for the org.
 */

import { prisma } from "./prisma";
import { sendEmail } from "./email";
import { isEmailSuppressed, isWithinSendWindow } from "./email";
import { logger } from "./logger";
import { trackEvent, ProductEventNames } from "./product-events";
import {
  onboardingEmail1,
  onboardingEmail2,
  onboardingEmail3,
  onboardingEmail4,
  onboardingEmail5,
} from "./onboarding-drip-templates";

const log = logger.child({ service: "onboarding-drip" });

// Drip event names for idempotency tracking
const DRIP_EVENT_NAMES = {
  DRIP_1_SENT: "onboarding_drip_1_sent",
  DRIP_2_SENT: "onboarding_drip_2_sent",
  DRIP_3_SENT: "onboarding_drip_3_sent",
  DRIP_4_SENT: "onboarding_drip_4_sent",
  DRIP_5_SENT: "onboarding_drip_5_sent",
} as const;

// Schedule: days after signup for each email
const DRIP_SCHEDULE = [
  { emailNum: 1, daysAfterSignup: 0, eventName: DRIP_EVENT_NAMES.DRIP_1_SENT },
  { emailNum: 2, daysAfterSignup: 1, eventName: DRIP_EVENT_NAMES.DRIP_2_SENT },
  { emailNum: 3, daysAfterSignup: 3, eventName: DRIP_EVENT_NAMES.DRIP_3_SENT },
  { emailNum: 4, daysAfterSignup: 7, eventName: DRIP_EVENT_NAMES.DRIP_4_SENT },
  { emailNum: 5, daysAfterSignup: 14, eventName: DRIP_EVENT_NAMES.DRIP_5_SENT },
] as const;

interface DripProcessResult {
  processed: number;
  sent: number;
  suppressed: number;
  alreadySent: number;
  failed: number;
  outsideWindow: number;
}

/**
 * Send onboarding email 1 (Welcome) immediately after signup.
 * Called from the signup route.
 */
export async function sendWelcomeEmail(
  organizationId: string,
  userId: string,
  userEmail: string,
  userName?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if already sent (idempotency)
    const alreadySent = await prisma.productEvent.findFirst({
      where: {
        organizationId,
        name: DRIP_EVENT_NAMES.DRIP_1_SENT,
      },
    });

    if (alreadySent) {
      log.info({ organizationId }, "Welcome email already sent, skipping");
      return { success: true };
    }

    // Check suppression
    if (await isEmailSuppressed(organizationId, userEmail)) {
      log.info({ organizationId }, "Welcome email suppressed");
      return { success: true };
    }

    // Generate email content
    const email = onboardingEmail1({ userName: userName || undefined });

    // Send via Resend (direct send, no quote cooldown needed)
    const result = await sendEmail({
      to: userEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (result.success) {
      // Track as sent for idempotency
      await trackEvent(DRIP_EVENT_NAMES.DRIP_1_SENT as any, {
        organizationId,
        userId,
        props: { emailNum: 1, messageId: result.messageId },
      });

      log.info({ organizationId, messageId: result.messageId }, "Welcome email sent");
    } else {
      log.error({ organizationId, error: result.error }, "Welcome email failed");
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error({ error: message, organizationId }, "Welcome email exception");
    return { success: false, error: message };
  }
}

/**
 * Process all pending onboarding drip emails.
 * Called by the cron endpoint.
 *
 * For each org that signed up within the last 15 days:
 * - Check which drip emails are due based on days since signup
 * - Check suppress conditions for each email
 * - Send emails that are due and haven't been sent yet
 */
export async function processOnboardingDrip(): Promise<DripProcessResult> {
  const result: DripProcessResult = {
    processed: 0,
    sent: 0,
    suppressed: 0,
    alreadySent: 0,
    failed: 0,
    outsideWindow: 0,
  };

  const now = new Date();

  // Find all signup events from the last 15 days
  const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);

  const signupEvents = await prisma.productEvent.findMany({
    where: {
      name: ProductEventNames.SIGNUP_COMPLETED,
      createdAt: { gte: fifteenDaysAgo },
      organizationId: { not: null },
    },
    select: {
      organizationId: true,
      userId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Deduplicate by organizationId (take first signup per org)
  const orgSignups = new Map<string, { userId: string | null; signupAt: Date }>();
  for (const event of signupEvents) {
    if (event.organizationId && !orgSignups.has(event.organizationId)) {
      orgSignups.set(event.organizationId, {
        userId: event.userId,
        signupAt: event.createdAt,
      });
    }
  }

  log.info({ orgCount: orgSignups.size }, "Processing onboarding drip");

  for (const [organizationId, { userId, signupAt }] of orgSignups) {
    const daysSinceSignup = Math.floor(
      (now.getTime() - signupAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Process emails 2-5 (email 1 is sent immediately at signup)
    for (const schedule of DRIP_SCHEDULE) {
      if (schedule.emailNum === 1) continue; // Email 1 is handled at signup
      if (daysSinceSignup < schedule.daysAfterSignup) continue; // Not due yet

      result.processed++;

      try {
        const emailResult = await processOrgDripEmail(
          organizationId,
          userId,
          schedule.emailNum,
          schedule.eventName
        );

        switch (emailResult) {
          case "sent":
            result.sent++;
            break;
          case "already_sent":
            result.alreadySent++;
            break;
          case "suppressed":
            result.suppressed++;
            break;
          case "outside_window":
            result.outsideWindow++;
            break;
          case "failed":
            result.failed++;
            break;
        }
      } catch (error) {
        log.error({ error, organizationId, emailNum: schedule.emailNum }, "Drip email error");
        result.failed++;
      }
    }
  }

  log.info({ result }, "Onboarding drip processing complete");
  return result;
}

type DripEmailResult = "sent" | "already_sent" | "suppressed" | "outside_window" | "failed";

/**
 * Process a single drip email for an organization.
 */
async function processOrgDripEmail(
  organizationId: string,
  userId: string | null,
  emailNum: number,
  eventName: string
): Promise<DripEmailResult> {
  // 1. Check idempotency — already sent?
  const alreadySent = await prisma.productEvent.findFirst({
    where: {
      organizationId,
      name: eventName,
    },
  });

  if (alreadySent) {
    return "already_sent";
  }

  // 2. Get org info and admin user email
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      timezone: true,
      sendWindowStart: true,
      sendWindowEnd: true,
      users: {
        where: { role: "admin" },
        select: { id: true, email: true, name: true },
        take: 1,
      },
    },
  });

  if (!org || org.users.length === 0) {
    log.warn({ organizationId }, "No admin user found for org");
    return "failed";
  }

  const adminUser = org.users[0];

  // 3. Check send window (respect org timezone)
  if (!isWithinSendWindow(org.timezone, org.sendWindowStart, org.sendWindowEnd)) {
    return "outside_window";
  }

  // 4. Check suppression
  if (await isEmailSuppressed(organizationId, adminUser.email)) {
    return "suppressed";
  }

  // 5. Check suppress conditions per email
  const shouldSuppress = await checkSuppressCondition(organizationId, emailNum);
  if (shouldSuppress) {
    // Track as suppressed so we don't keep checking
    await trackEvent(eventName as any, {
      organizationId,
      userId: adminUser.id,
      props: { emailNum, suppressed: true, reason: shouldSuppress },
    });
    return "suppressed";
  }

  // 6. Generate email content
  const email = getEmailContent(emailNum, { userName: adminUser.name || undefined });
  if (!email) {
    return "failed";
  }

  // 7. Send
  const sendResult = await sendEmail({
    to: adminUser.email,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });

  if (!sendResult.success) {
    log.error({ organizationId, emailNum, error: sendResult.error }, "Drip email send failed");
    return "failed";
  }

  // 8. Track as sent
  await trackEvent(eventName as any, {
    organizationId,
    userId: adminUser.id,
    props: { emailNum, messageId: sendResult.messageId },
  });

  log.info({ organizationId, emailNum, messageId: sendResult.messageId }, "Drip email sent");
  return "sent";
}

/**
 * Check suppress conditions for a specific drip email.
 * Returns reason string if should suppress, null if should send.
 */
async function checkSuppressCondition(
  organizationId: string,
  emailNum: number
): Promise<string | null> {
  switch (emailNum) {
    case 2:
    case 3: {
      // Suppress if user already reached aha moment (mark_sent_success)
      const ahaEvent = await prisma.productEvent.findFirst({
        where: {
          organizationId,
          name: ProductEventNames.MARK_SENT_SUCCESS,
        },
      });
      if (ahaEvent) {
        return "aha_moment_reached";
      }
      return null;
    }

    case 5: {
      // Suppress if user already on paid plan
      const subscription = await prisma.subscription.findFirst({
        where: {
          organizationId,
          status: "active",
          planId: { not: "free" },
        },
      });
      if (subscription) {
        return "already_paid";
      }
      return null;
    }

    default:
      // Email 1 and 4: no suppress conditions
      return null;
  }
}

/**
 * Get email content by number.
 */
function getEmailContent(
  emailNum: number,
  params: { userName?: string }
): { html: string; text: string; subject: string } | null {
  switch (emailNum) {
    case 1:
      return onboardingEmail1(params);
    case 2:
      return onboardingEmail2(params);
    case 3:
      return onboardingEmail3(params);
    case 4:
      return onboardingEmail4(params);
    case 5:
      return onboardingEmail5(params);
    default:
      return null;
  }
}
