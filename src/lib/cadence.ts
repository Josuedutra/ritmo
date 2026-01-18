import { prisma } from "@/lib/prisma";
import { addBusinessDays } from "@/lib/business-days";
import { Decimal } from "@prisma/client/runtime/library";
import type { CallPriority, Prisma } from "@prisma/client";

// Cadence event types and their business day offsets
const CADENCE_SCHEDULE = [
    { eventType: "email_d1", daysOffset: 1 },
    { eventType: "email_d3", daysOffset: 3 },
    { eventType: "call_d7", daysOffset: 7 },
    { eventType: "email_d14", daysOffset: 14 },
] as const;

// Value threshold for HIGH priority calls (Rule A/B)
const HIGH_VALUE_THRESHOLD = 1000;

interface GenerateCadenceOptions {
    quoteId: string;
    organizationId: string;
    sentAt: Date;
    quoteValue: Decimal | number | null;
    timezone?: string;
}

type TransactionClient = Prisma.TransactionClient;

/**
 * Generate cadence events for a quote when marked as sent
 *
 * Rules:
 * - D+1: Email follow-up (1 business day after sent)
 * - D+3: Email follow-up (3 business days after sent)
 * - D+7: Phone call - priority HIGH if value >= 1000€, LOW otherwise
 * - D+14: Final email follow-up (14 business days after sent)
 *
 * All dates respect Portuguese business days (excludes weekends and holidays)
 */
export async function generateCadenceEvents(options: GenerateCadenceOptions) {
    const { quoteId, organizationId, sentAt, quoteValue, timezone = "Europe/Lisbon" } = options;

    // Get current cadence_run_id and increment
    const quote = await prisma.quote.findUnique({
        where: { id: quoteId },
        select: { cadenceRunId: true },
    });

    const newRunId = (quote?.cadenceRunId ?? 0) + 1;

    // Determine call priority based on quote value
    const valueNum = quoteValue instanceof Decimal ? quoteValue.toNumber() : (quoteValue ?? 0);
    const callPriority: CallPriority = valueNum >= HIGH_VALUE_THRESHOLD ? "HIGH" : "LOW";

    // Create cadence events
    const events = CADENCE_SCHEDULE.map((schedule) => {
        const scheduledFor = addBusinessDays(sentAt, schedule.daysOffset, timezone);

        return {
            organizationId,
            quoteId,
            cadenceRunId: newRunId,
            eventType: schedule.eventType,
            scheduledFor,
            status: "scheduled" as const,
            priority: (schedule.eventType === "call_d7" ? callPriority : null) as CallPriority | null,
        };
    });

    // Use transaction to:
    // 1. Cancel any pending events from previous runs
    // 2. Create new events
    // 3. Update quote with new run ID and ritmo stage
    await prisma.$transaction(async (tx: TransactionClient) => {
        // Cancel pending events from previous runs
        await tx.cadenceEvent.updateMany({
            where: {
                quoteId,
                cadenceRunId: { lt: newRunId },
                status: "scheduled",
            },
            data: {
                status: "cancelled",
                cancelReason: "resent",
            },
        });

        // Create new cadence events
        await tx.cadenceEvent.createMany({
            data: events,
        });

        // Update quote
        await tx.quote.update({
            where: { id: quoteId },
            data: {
                cadenceRunId: newRunId,
                ritmoStage: "fup_d1",
                lastActivityAt: new Date(),
            },
        });
    });

    return {
        runId: newRunId,
        eventsCreated: events.length,
        events: events.map((e) => ({
            eventType: e.eventType,
            scheduledFor: e.scheduledFor,
            priority: e.priority,
        })),
    };
}

/**
 * Cancel all pending cadence events for a quote
 * Called when quote status changes to won/lost/negotiation
 */
export async function cancelPendingCadence(
    quoteId: string,
    reason: "status_changed" | "manual" = "status_changed"
) {
    const result = await prisma.cadenceEvent.updateMany({
        where: {
            quoteId,
            status: "scheduled",
        },
        data: {
            status: "cancelled",
            cancelReason: reason,
        },
    });

    // Update quote ritmo stage
    await prisma.quote.update({
        where: { id: quoteId },
        data: {
            ritmoStage: "stopped",
            lastActivityAt: new Date(),
        },
    });

    return { cancelledCount: result.count };
}
