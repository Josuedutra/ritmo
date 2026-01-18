import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { isBusinessDay, isWithinSendWindow } from "@/lib/business-days";
import { toZonedTime } from "date-fns-tz";
import { endOfDay, startOfDay } from "date-fns";
import { sendCadenceEmail, hasEmailCapability, isEmailSuppressed } from "@/lib/email";
import { canUseAutoEmail } from "@/lib/entitlements";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel Pro: 60s max

// Constants
const CLAIM_TIMEOUT_MINUTES = 5;
const BATCH_SIZE = 50;

// Global feature flag: AUTO-EMAIL mode (Sprint 3)
// When true AND org has autoEmailEnabled entitlement, emails are sent automatically
const AUTO_EMAIL_MODE_GLOBAL = process.env.AUTO_EMAIL_MODE === "true";

// Map event types to template codes
const EVENT_TO_TEMPLATE: Record<string, string> = {
    email_d1: "T2",
    email_d3: "T3",
    email_d14: "T5",
};

interface ProcessResult {
    success: boolean;
    workerId: string;
    processed: number;
    tasksCreated: number;
    skipped: number;
    deferred: number;
    cancelled: number;
    failed: number;
    durationMs: number;
}

/**
 * POST /api/cron/process-cadence
 *
 * Cron endpoint for processing scheduled cadence events.
 * Protected by CRON_SECRET bearer token.
 *
 * Mode: TASK-EMAIL (Sprint 1)
 * - Creates tasks for emails and calls
 * - Does NOT send emails automatically
 * - User copies template and sends manually
 *
 * Idempotency:
 * - Uses transactional claim with claimedAt/claimedBy
 * - Releases orphan claims after 5 minutes
 * - Running twice won't duplicate tasks
 */
export async function POST(request: NextRequest) {
    const log = logger.child({ endpoint: "cron/process-cadence" });
    const startTime = Date.now();

    // Validate CRON_SECRET
    const authHeader = request.headers.get("authorization");
    const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

    if (!process.env.CRON_SECRET) {
        log.error("CRON_SECRET not configured");
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    if (authHeader !== expectedToken) {
        log.warn("Unauthorized cron attempt");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse optional worker ID from body
    let workerId = `cron-${Date.now()}`;
    try {
        const body = await request.json().catch(() => ({}));
        if (body.worker_id) {
            workerId = body.worker_id;
        }
    } catch {
        // Empty body is fine
    }

    log.info({ workerId }, "Cron job started");

    const result: ProcessResult = {
        success: true,
        workerId,
        processed: 0,
        tasksCreated: 0,
        skipped: 0,
        deferred: 0,
        cancelled: 0,
        failed: 0,
        durationMs: 0,
    };

    try {
        // Step 1: Release orphan claims (older than 5 minutes)
        const orphanThreshold = new Date(Date.now() - CLAIM_TIMEOUT_MINUTES * 60 * 1000);
        await prisma.cadenceEvent.updateMany({
            where: {
                status: "claimed",
                claimedAt: { lt: orphanThreshold },
            },
            data: {
                status: "scheduled",
                claimedAt: null,
                claimedBy: null,
            },
        });

        // Step 2: Get all organizations with their timezones
        const organizations = await prisma.organization.findMany({
            select: {
                id: true,
                timezone: true,
                sendWindowStart: true,
                sendWindowEnd: true,
            },
        });

        // Process each organization
        for (const org of organizations) {
            const orgResult = await processOrganization(org, workerId, log);
            result.processed += orgResult.processed;
            result.tasksCreated += orgResult.tasksCreated;
            result.skipped += orgResult.skipped;
            result.deferred += orgResult.deferred;
            result.cancelled += orgResult.cancelled;
            result.failed += orgResult.failed;
        }
    } catch (error) {
        result.success = false;
        result.failed++;
        log.error({ error }, "Cron job failed");
    }

    result.durationMs = Date.now() - startTime;
    log.info({ ...result }, "Cron job completed");

    return NextResponse.json(result);
}

interface OrgConfig {
    id: string;
    timezone: string;
    sendWindowStart: string;
    sendWindowEnd: string;
}

interface OrgResult {
    processed: number;
    tasksCreated: number;
    skipped: number;
    deferred: number;
    cancelled: number;
    failed: number;
}

async function processOrganization(
    org: OrgConfig,
    workerId: string,
    log: ReturnType<typeof logger.child>
): Promise<OrgResult> {
    const result: OrgResult = {
        processed: 0,
        tasksCreated: 0,
        skipped: 0,
        deferred: 0,
        cancelled: 0,
        failed: 0,
    };

    const now = new Date();
    const nowInTz = toZonedTime(now, org.timezone);

    // Check if today is a business day
    if (!isBusinessDay(nowInTz)) {
        log.info({ orgId: org.id }, "Skipping: not a business day");
        return result;
    }

    // Check if within send window
    if (!isWithinSendWindow(org.sendWindowStart, org.sendWindowEnd, org.timezone)) {
        log.info({ orgId: org.id }, "Skipping: outside send window");
        return result;
    }

    // Get today's boundaries
    const todayStart = startOfDay(nowInTz);
    const todayEnd = endOfDay(nowInTz);

    // Claim a batch of events using atomic update
    // This ensures idempotency - only one worker can claim each event
    const claimedEvents = await prisma.$queryRaw<{ id: string }[]>`
        UPDATE cadence_events
        SET
            status = 'claimed',
            claimed_at = NOW(),
            claimed_by = ${workerId}
        WHERE id IN (
            SELECT id FROM cadence_events
            WHERE organization_id = ${org.id}
            AND status = 'scheduled'
            AND scheduled_for >= ${todayStart}
            AND scheduled_for <= ${todayEnd}
            LIMIT ${BATCH_SIZE}
            FOR UPDATE SKIP LOCKED
        )
        RETURNING id
    `;

    if (claimedEvents.length === 0) {
        return result;
    }

    log.info({ orgId: org.id, count: claimedEvents.length }, "Claimed events");

    // Get full event details
    const eventIds = claimedEvents.map((e) => e.id);
    const events = await prisma.cadenceEvent.findMany({
        where: { id: { in: eventIds } },
        include: {
            quote: {
                include: {
                    contact: true,
                },
            },
        },
    });

    // Process each event
    for (const event of events) {
        result.processed++;

        try {
            // Check if quote status changed (won/lost/negotiation)
            if (["won", "lost", "negotiation"].includes(event.quote.businessStatus)) {
                await prisma.cadenceEvent.update({
                    where: { id: event.id },
                    data: {
                        status: "cancelled",
                        cancelReason: "status_changed",
                        processedAt: new Date(),
                    },
                });
                result.cancelled++;
                continue;
            }

            const isEmailEvent = event.eventType.startsWith("email_");
            const isCallEvent = event.eventType === "call_d7";
            const contactEmail = event.quote.contact?.email;
            const contactName = event.quote.contact?.name;

            // Call events always create tasks
            if (isCallEvent) {
                await createTask(org.id, event, "call",
                    getTaskTitle(event.eventType, contactName),
                    getTaskDescription(event.eventType, event.quote)
                );
                await markEventCompleted(event.id);
                await updateQuoteRitmoStage(event.quoteId, event.eventType);
                result.tasksCreated++;
                continue;
            }

            // Email events: AUTO-EMAIL mode vs TASK-EMAIL mode
            if (isEmailEvent) {
                // No email on contact - create fallback task
                if (!contactEmail) {
                    await createTask(org.id, event, "call",
                        getNoEmailTaskTitle(event.eventType, contactName),
                        getNoEmailTaskDescription(event.eventType, event.quote)
                    );
                    await markEventSkipped(event.id, "no_email");
                    await updateQuoteRitmoStage(event.quoteId, event.eventType);
                    result.tasksCreated++;
                    continue;
                }

                // Check suppression
                if (await isEmailSuppressed(org.id, contactEmail)) {
                    await markEventSkipped(event.id, "suppressed");
                    await updateQuoteRitmoStage(event.quoteId, event.eventType);
                    result.skipped++;
                    continue;
                }

                // AUTO-EMAIL mode: try to send email automatically
                // Requires BOTH global flag AND org-level entitlement (paid/trial)
                const orgCanAutoEmail = AUTO_EMAIL_MODE_GLOBAL && await canUseAutoEmail(org.id);

                if (orgCanAutoEmail) {
                    const emailResult = await processAutoEmail(org.id, event, log);

                    if (emailResult.sent) {
                        result.tasksCreated++; // Count as "processed action"
                    } else if (emailResult.taskCreated) {
                        result.tasksCreated++;
                    } else if (emailResult.deferred) {
                        result.deferred++;
                    } else {
                        result.failed++;
                    }

                    await updateQuoteRitmoStage(event.quoteId, event.eventType);
                    continue;
                }

                // TASK-EMAIL mode (default for free tier or when AUTO_EMAIL disabled): create task for manual sending
                await createTask(org.id, event, "email",
                    getTaskTitle(event.eventType, contactName),
                    getTaskDescription(event.eventType, event.quote)
                );
                await markEventCompleted(event.id);
                await updateQuoteRitmoStage(event.quoteId, event.eventType);
                result.tasksCreated++;
            }
        } catch (error) {
            log.error({ eventId: event.id, error }, "Failed to process event");

            await prisma.cadenceEvent.update({
                where: { id: event.id },
                data: {
                    status: "failed",
                    errorMessage: error instanceof Error ? error.message : "Unknown error",
                    processedAt: new Date(),
                },
            });

            result.failed++;
        }
    }

    return result;
}

function getTaskTitle(eventType: string, contactName?: string | null): string {
    const name = contactName || "contacto";

    switch (eventType) {
        case "email_d1":
            return `Enviar follow-up D+1 para ${name}`;
        case "email_d3":
            return `Enviar follow-up D+3 para ${name}`;
        case "call_d7":
            return `Ligar para ${name} (D+7)`;
        case "email_d14":
            return `Enviar follow-up final D+14 para ${name}`;
        default:
            return `Ação de follow-up para ${name}`;
    }
}

function getTaskDescription(
    eventType: string,
    quote: { title: string; reference?: string | null; value?: { toString: () => string } | null }
): string {
    const quoteRef = quote.reference || quote.title;
    const value = quote.value ? `€${quote.value.toString()}` : "";

    switch (eventType) {
        case "email_d1":
            return `Follow-up 1 dia após envio do orçamento "${quoteRef}" ${value}. Use o template T2.`;
        case "email_d3":
            return `Follow-up 3 dias após envio do orçamento "${quoteRef}" ${value}. Use o template T3.`;
        case "call_d7":
            return `Telefonar ao cliente sobre o orçamento "${quoteRef}" ${value}. Consulte o script de chamada.`;
        case "email_d14":
            return `Follow-up final (14 dias) para o orçamento "${quoteRef}" ${value}. Use o template T5.`;
        default:
            return `Ação de follow-up para o orçamento "${quoteRef}"`;
    }
}

// Alternative task titles when contact has no email
function getNoEmailTaskTitle(eventType: string, contactName?: string | null): string {
    const name = contactName || "contacto";

    switch (eventType) {
        case "email_d1":
            return `Ligar para ${name} (D+1 - sem email)`;
        case "email_d3":
            return `Ligar para ${name} (D+3 - sem email)`;
        case "email_d14":
            return `Ligar para ${name} (D+14 - sem email)`;
        default:
            return `Contactar ${name} (sem email)`;
    }
}

function getNoEmailTaskDescription(
    eventType: string,
    quote: { title: string; reference?: string | null; value?: { toString: () => string } | null }
): string {
    const quoteRef = quote.reference || quote.title;
    const value = quote.value ? `€${quote.value.toString()}` : "";

    const dayLabel =
        eventType === "email_d1" ? "1 dia" : eventType === "email_d3" ? "3 dias" : "14 dias";

    return `Contacto sem email registado. Ligar ao cliente ${dayLabel} após envio do orçamento "${quoteRef}" ${value}. Tentar obter email para futuros follow-ups.`;
}

async function updateQuoteRitmoStage(quoteId: string, completedEvent: string): Promise<void> {
    // Map event type to next ritmo stage
    const stageMap: Record<string, string> = {
        email_d1: "fup_d3",
        email_d3: "fup_d7",
        call_d7: "fup_d14",
        email_d14: "completed",
    };

    const nextStage = stageMap[completedEvent];

    if (nextStage) {
        await prisma.quote.update({
            where: { id: quoteId },
            data: {
                ritmoStage: nextStage as never,
                lastActivityAt: new Date(),
            },
        });
    }
}

// Helper function to create a task
async function createTask(
    organizationId: string,
    event: { id: string; quoteId: string; scheduledFor: Date; priority: string | null },
    type: string,
    title: string,
    description: string
): Promise<void> {
    await prisma.task.create({
        data: {
            organizationId,
            quoteId: event.quoteId,
            cadenceEventId: event.id,
            type,
            title,
            description,
            dueAt: event.scheduledFor,
            priority: (event.priority || "LOW") as "HIGH" | "LOW",
            status: "pending",
        },
    });
}

// Helper function to mark event as completed
async function markEventCompleted(eventId: string): Promise<void> {
    await prisma.cadenceEvent.update({
        where: { id: eventId },
        data: {
            status: "completed",
            processedAt: new Date(),
        },
    });
}

// Helper function to mark event as skipped
async function markEventSkipped(eventId: string, reason: string): Promise<void> {
    await prisma.cadenceEvent.update({
        where: { id: eventId },
        data: {
            status: "skipped",
            skipReason: reason,
            processedAt: new Date(),
        },
    });
}

// Process auto-email sending (Sprint 3)
interface AutoEmailResult {
    sent: boolean;
    taskCreated: boolean;
    deferred: boolean;
    error?: string;
}

async function processAutoEmail(
    organizationId: string,
    event: {
        id: string;
        quoteId: string;
        eventType: string;
        scheduledFor: Date;
        priority: string | null;
        quote: {
            id: string;
            title: string;
            reference: string | null;
            value: { toNumber: () => number } | null;
            contact: { email: string | null; name: string | null; company: string | null } | null;
        };
    },
    log: ReturnType<typeof logger.child>
): Promise<AutoEmailResult> {
    const { quote } = event;
    const contact = quote.contact;

    // Check if org has email capability
    if (!(await hasEmailCapability(organizationId))) {
        // No SMTP/Resend configured - create manual task
        await createTask(organizationId, event, "email",
            `Enviar email manualmente - ${quote.title}`,
            `SMTP não configurado. Enviar follow-up ${event.eventType} manualmente.`
        );
        await markEventSkipped(event.id, "no_smtp");
        log.info({ eventId: event.id }, "No email capability - task created");
        return { sent: false, taskCreated: true, deferred: false };
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
        await createTask(organizationId, event, "email",
            `Enviar email manualmente - ${quote.title}`,
            `Template ${templateCode} não encontrado. Configurar em /templates.`
        );
        await markEventSkipped(event.id, "no_template");
        log.info({ eventId: event.id, templateCode }, "No template - task created");
        return { sent: false, taskCreated: true, deferred: false };
    }

    // Build email content
    const variables: Record<string, string> = {
        contact_name: contact?.name || "Cliente",
        contact_company: contact?.company || "",
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

    // Send email
    const sendResult = await sendCadenceEmail({
        organizationId,
        quoteId: quote.id,
        cadenceEventId: event.id,
        templateId: template.id,
        to: contact!.email!,
        subject,
        body,
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
        return { sent: false, taskCreated: false, deferred: true };
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
        await createTask(organizationId, event, "email",
            `Enviar email manualmente - ${quote.title}`,
            `Falha no envio automático: ${sendResult.error}\n\nEnviar follow-up ${event.eventType} manualmente.`
        );

        log.error({ eventId: event.id, error: sendResult.error }, "Email send failed - task created");
        return { sent: false, taskCreated: true, deferred: false, error: sendResult.error };
    }

    // Success - mark event as sent
    await prisma.cadenceEvent.update({
        where: { id: event.id },
        data: {
            status: "sent",
            processedAt: new Date(),
        },
    });

    log.info({
        eventId: event.id,
        quoteId: quote.id,
        provider: sendResult.provider,
    }, "Email sent automatically");

    return { sent: true, taskCreated: false, deferred: false };
}
