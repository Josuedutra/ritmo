/**
 * Cadence Worker - Processes scheduled cadence events
 *
 * This worker:
 * 1. Claims scheduled events (transactional to prevent duplicates)
 * 2. Sends emails for email_d1/d3/d14 events
 * 3. Creates tasks for call_d7 events
 * 4. Handles fallback when no email/SMTP configured
 * 5. Updates quote ritmoStage as cadence progresses
 */

import { prisma } from "./prisma";
import { sendCadenceEmail, hasEmailCapability, isEmailSuppressed } from "./email";
import { logger } from "./logger";
import type { CadenceEvent, Quote, Contact, Template } from "@prisma/client";

const log = logger.child({ service: "cadence-worker" });

// Map event types to template codes
const EVENT_TO_TEMPLATE: Record<string, string> = {
    email_d1: "T2",
    email_d3: "T3",
    email_d14: "T5",
};

// Map event types to next ritmo stage
const EVENT_TO_NEXT_STAGE: Record<string, string> = {
    email_d1: "fup_d3",
    email_d3: "fup_d7",
    call_d7: "fup_d14",
    email_d14: "completed",
};

interface ProcessResult {
    processed: number;
    sent: number;
    failed: number;
    skipped: number;
    tasksCreated: number;
}

/**
 * Process all due cadence events
 *
 * @param workerId - Unique identifier for this worker instance
 * @param batchSize - Maximum events to process in one batch
 */
export async function processCadenceEvents(
    workerId: string = `worker-${Date.now()}`,
    batchSize: number = 50
): Promise<ProcessResult> {
    const result: ProcessResult = {
        processed: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        tasksCreated: 0,
    };

    const now = new Date();

    // Find and claim events that are due
    // Using raw query for atomic claim with proper locking
    const claimedEvents = await claimDueEvents(workerId, now, batchSize);

    log.info({ workerId, count: claimedEvents.length }, "Claimed cadence events");

    for (const event of claimedEvents) {
        try {
            const eventResult = await processEvent(event, workerId);

            result.processed++;
            if (eventResult.status === "sent" || eventResult.status === "completed") {
                result.sent++;
            } else if (eventResult.status === "failed") {
                result.failed++;
            } else if (eventResult.status === "skipped") {
                result.skipped++;
            }

            if (eventResult.taskCreated) {
                result.tasksCreated++;
            }
        } catch (error) {
            log.error({ error, eventId: event.id }, "Error processing cadence event");
            result.failed++;

            // Mark event as failed
            await prisma.cadenceEvent.update({
                where: { id: event.id },
                data: {
                    status: "failed",
                    errorMessage: error instanceof Error ? error.message : "Unknown error",
                    processedAt: new Date(),
                },
            });
        }
    }

    log.info({ workerId, result }, "Cadence processing complete");
    return result;
}

/**
 * Claim due events atomically to prevent duplicate processing
 */
async function claimDueEvents(
    workerId: string,
    now: Date,
    limit: number
): Promise<Array<CadenceEvent & {
    quote: Quote & { contact: Contact | null };
    organization: { id: string; timezone: string };
}>> {
    // Use transaction to claim events atomically
    const events = await prisma.$transaction(async (tx) => {
        // Find unclaimed events that are due
        const dueEvents = await tx.cadenceEvent.findMany({
            where: {
                status: "scheduled",
                scheduledFor: { lte: now },
                claimedAt: null,
            },
            orderBy: [
                { priority: "desc" }, // HIGH priority first
                { scheduledFor: "asc" },
            ],
            take: limit,
            include: {
                quote: {
                    include: {
                        contact: true,
                    },
                },
                organization: {
                    select: {
                        id: true,
                        timezone: true,
                    },
                },
            },
        });

        if (dueEvents.length === 0) {
            return [];
        }

        // Claim all events
        await tx.cadenceEvent.updateMany({
            where: {
                id: { in: dueEvents.map((e) => e.id) },
            },
            data: {
                status: "claimed",
                claimedAt: now,
                claimedBy: workerId,
            },
        });

        return dueEvents;
    });

    return events;
}

interface EventProcessResult {
    status: "sent" | "completed" | "failed" | "skipped" | "deferred";
    taskCreated: boolean;
    error?: string;
}

/**
 * Process a single cadence event
 */
async function processEvent(
    event: CadenceEvent & {
        quote: Quote & { contact: Contact | null };
        organization: { id: string; timezone: string };
    },
    workerId: string
): Promise<EventProcessResult> {
    const { quote, organization } = event;
    const contact = quote.contact;

    // Check if quote is still in valid state
    if (quote.businessStatus !== "sent") {
        // Quote status changed, skip this event
        await prisma.cadenceEvent.update({
            where: { id: event.id },
            data: {
                status: "cancelled",
                cancelReason: "status_changed",
                processedAt: new Date(),
            },
        });

        log.info({ eventId: event.id, quoteStatus: quote.businessStatus }, "Event cancelled - quote status changed");
        return { status: "skipped", taskCreated: false };
    }

    // Handle call events - always create task
    if (event.eventType === "call_d7") {
        return await handleCallEvent(event, quote, contact);
    }

    // Handle email events
    return await handleEmailEvent(event, quote, contact, organization.id);
}

/**
 * Handle call_d7 event - creates a task for manual call
 */
async function handleCallEvent(
    event: CadenceEvent,
    quote: Quote,
    contact: Contact | null
): Promise<EventProcessResult> {
    // Create call task
    await prisma.task.create({
        data: {
            organizationId: event.organizationId,
            quoteId: quote.id,
            cadenceEventId: event.id,
            type: "call",
            title: `Ligar para ${contact?.name || contact?.company || "cliente"} - ${quote.title}`,
            description: `Follow-up D+7 para orçamento "${quote.title}"${contact?.phone ? `\nTelefone: ${contact.phone}` : ""}`,
            dueAt: event.scheduledFor,
            priority: event.priority || "LOW",
            status: "pending",
        },
    });

    // Mark event as completed
    await prisma.cadenceEvent.update({
        where: { id: event.id },
        data: {
            status: "completed",
            processedAt: new Date(),
        },
    });

    // Update quote stage
    await updateQuoteStage(quote.id, event.eventType);

    log.info({ eventId: event.id, quoteId: quote.id }, "Call task created");
    return { status: "completed", taskCreated: true };
}

/**
 * Handle email events (d1, d3, d14)
 */
async function handleEmailEvent(
    event: CadenceEvent,
    quote: Quote,
    contact: Contact | null,
    organizationId: string
): Promise<EventProcessResult> {
    // Check if contact has email
    if (!contact?.email) {
        // No email - create manual task as fallback
        return await createFallbackTask(event, quote, contact, "no_email");
    }

    // Check if email is suppressed
    if (await isEmailSuppressed(organizationId, contact.email)) {
        await prisma.cadenceEvent.update({
            where: { id: event.id },
            data: {
                status: "skipped",
                skipReason: "suppressed",
                processedAt: new Date(),
            },
        });

        // Update quote stage even when skipped
        await updateQuoteStage(quote.id, event.eventType);

        log.info({ eventId: event.id, email: contact.email }, "Event skipped - email suppressed");
        return { status: "skipped", taskCreated: false };
    }

    // Check if org has email capability
    if (!(await hasEmailCapability(organizationId))) {
        // No SMTP/Resend configured - create manual task
        return await createFallbackTask(event, quote, contact, "no_smtp");
    }

    // Get template
    const templateCode = EVENT_TO_TEMPLATE[event.eventType];
    const template = await prisma.template.findFirst({
        where: {
            organizationId,
            code: templateCode,
            isActive: true,
        },
    });

    if (!template) {
        // No template - create manual task
        return await createFallbackTask(event, quote, contact, "no_template");
    }

    // Build email content
    const emailContent = buildEmailContent(template, quote, contact);

    // Send email
    const sendResult = await sendCadenceEmail({
        organizationId,
        quoteId: quote.id,
        cadenceEventId: event.id,
        templateId: template.id,
        to: contact.email,
        subject: emailContent.subject,
        body: emailContent.body,
    });

    if (sendResult.deferred) {
        // Outside send window - mark as deferred for retry
        await prisma.cadenceEvent.update({
            where: { id: event.id },
            data: {
                status: "deferred",
                claimedAt: null,
                claimedBy: null,
            },
        });

        log.info({ eventId: event.id }, "Event deferred - outside send window");
        return { status: "deferred", taskCreated: false };
    }

    if (!sendResult.success) {
        // Send failed - mark event and create fallback task
        await prisma.cadenceEvent.update({
            where: { id: event.id },
            data: {
                status: "failed",
                errorMessage: sendResult.error,
                processedAt: new Date(),
            },
        });

        // Create fallback task
        await prisma.task.create({
            data: {
                organizationId,
                quoteId: quote.id,
                cadenceEventId: event.id,
                type: "follow_up",
                title: `Enviar email manualmente - ${quote.title}`,
                description: `Falha no envio automático: ${sendResult.error}\n\nEnviar email de follow-up ${event.eventType} manualmente.`,
                dueAt: new Date(),
                priority: "HIGH",
                status: "pending",
            },
        });

        log.error({ eventId: event.id, error: sendResult.error }, "Email send failed - task created");
        return { status: "failed", taskCreated: true, error: sendResult.error };
    }

    // Success - mark event as sent
    await prisma.cadenceEvent.update({
        where: { id: event.id },
        data: {
            status: "sent",
            processedAt: new Date(),
        },
    });

    // Update quote stage
    await updateQuoteStage(quote.id, event.eventType);

    log.info({
        eventId: event.id,
        quoteId: quote.id,
        provider: sendResult.provider,
    }, "Email sent successfully");

    return { status: "sent", taskCreated: false };
}

/**
 * Create a fallback task when automatic email can't be sent
 */
async function createFallbackTask(
    event: CadenceEvent,
    quote: Quote,
    contact: Contact | null,
    reason: "no_email" | "no_smtp" | "no_template"
): Promise<EventProcessResult> {
    const reasonDescriptions: Record<string, string> = {
        no_email: "Contacto não tem email",
        no_smtp: "SMTP não configurado - enviar manualmente",
        no_template: "Template não encontrado",
    };

    await prisma.task.create({
        data: {
            organizationId: event.organizationId,
            quoteId: quote.id,
            cadenceEventId: event.id,
            type: "follow_up",
            title: `Enviar email manualmente - ${quote.title}`,
            description: `${reasonDescriptions[reason]}\n\nEnviar follow-up ${event.eventType} manualmente para ${contact?.name || contact?.company || "cliente"}.`,
            dueAt: event.scheduledFor,
            priority: event.priority || "LOW",
            status: "pending",
        },
    });

    // Mark event as skipped with reason
    await prisma.cadenceEvent.update({
        where: { id: event.id },
        data: {
            status: "skipped",
            skipReason: reason,
            processedAt: new Date(),
        },
    });

    // Update quote stage even when skipped
    await updateQuoteStage(quote.id, event.eventType);

    log.info({ eventId: event.id, reason }, "Fallback task created");
    return { status: "skipped", taskCreated: true };
}

/**
 * Update quote ritmoStage based on completed event
 */
async function updateQuoteStage(quoteId: string, completedEventType: string): Promise<void> {
    const nextStage = EVENT_TO_NEXT_STAGE[completedEventType];
    if (nextStage) {
        await prisma.quote.update({
            where: { id: quoteId },
            data: {
                ritmoStage: nextStage as any,
                lastActivityAt: new Date(),
            },
        });
    }
}

/**
 * Build email content from template
 */
function buildEmailContent(
    template: Template,
    quote: Quote,
    contact: Contact
): { subject: string; body: string } {
    const variables: Record<string, string> = {
        contact_name: contact.name || "Cliente",
        contact_company: contact.company || "",
        quote_title: quote.title,
        quote_reference: quote.reference || quote.title,
        quote_value: quote.value ? `€${quote.value.toNumber().toLocaleString("pt-PT")}` : "",
    };

    let subject = template.subject || `Follow-up: ${quote.title}`;
    let body = template.body;

    // Replace variables
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, "g");
        subject = subject.replace(regex, value);
        body = body.replace(regex, value);
    }

    return { subject, body };
}
