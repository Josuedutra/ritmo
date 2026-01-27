/**
 * GET /api/dashboard/cockpit
 *
 * Cockpit v1.1 data endpoint.
 * Returns recovery-focused metrics and lists for the dashboard.
 * Auth required.
 *
 * v1.1: Tightened "recovered" definition — requires a strong reply signal
 * (inbound BCC capture OR manual "negotiation" mark) that occurred AFTER
 * the first cadence follow-up was sent. This avoids false positives where
 * a quote is in "negotiation" but Ritmo didn't contribute to the recovery.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CadenceEventStatus } from "@prisma/client";
import { getApiSession } from "@/lib/api-utils";
import { getEntitlements } from "@/lib/entitlements";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "api/dashboard/cockpit" });

// View model status mapping from DB enums
type CockpitStatus = "DRAFT" | "SENT" | "FOLLOW_UP_DUE" | "WAITING_REPLY" | "REPLIED" | "ARCHIVED";

interface CockpitItem {
    id: string;
    title: string;
    reference: string | null;
    customerName: string | null;
    status: CockpitStatus;
    lastContactAt: string | null;
    nextFollowUpAt: string | null;
    repliedAt: string | null;
    value: number | null;
    ageDays: number | null;
}

// ---------------------------------------------------------------------------
// Reply signal helpers (v1.1)
// ---------------------------------------------------------------------------

/**
 * Determine if a quote has a "strong reply signal" — evidence that
 * the client actually responded.
 *
 * Signals (any one is sufficient):
 * A) InboundIngestion with status="processed" linked to the quote (BCC reply captured)
 * B) businessStatus = "negotiation" (user manually marked as replied/in negotiation)
 *
 * Returns the earliest reply timestamp if signal exists, or null.
 */
function getReplySignalAt(
    businessStatus: string,
    updatedAt: Date,
    inboundIngestions: Array<{ receivedAt: Date; status: string }>,
): Date | null {
    // Signal A: inbound BCC reply (earliest receivedAt, deterministic via ORDER BY asc LIMIT 1)
    const processedInbound = inboundIngestions.find(i => i.status === "processed");
    if (processedInbound) {
        return processedInbound.receivedAt;
    }

    // Signal B: manual negotiation mark (updatedAt is best proxy for when status changed)
    if (businessStatus === "negotiation") {
        return updatedAt;
    }

    return null;
}

/**
 * Check if a quote qualifies as "recovered by Ritmo" (v1.1).
 *
 * Recovered = hasCadenceFollowUp AND hasStrongReplySignal
 *           AND replySignalAt >= firstFollowUpSentAt
 *
 * The temporal check ensures Ritmo's follow-up contributed to the recovery,
 * not just that the quote happens to be in negotiation.
 */
function isRecoveredV11(
    businessStatus: string,
    updatedAt: Date,
    cadenceEvents: Array<{ scheduledFor: Date; status: string }>,
    inboundIngestions: Array<{ receivedAt: Date; status: string }>,
): boolean {
    // Must have at least one sent/completed follow-up
    const sentFollowUps = cadenceEvents.filter(e => e.status === "sent" || e.status === "completed");
    if (sentFollowUps.length === 0) return false;

    // Must have a reply signal
    const replyAt = getReplySignalAt(businessStatus, updatedAt, inboundIngestions);
    if (!replyAt) return false;

    // Temporal check: reply must come after first follow-up was sent
    // Sort by scheduledFor ascending to find earliest
    const firstFollowUpAt = sentFollowUps
        .map(e => e.scheduledFor)
        .sort((a, b) => a.getTime() - b.getTime())[0];

    return replyAt.getTime() >= firstFollowUpAt.getTime();
}

// ---------------------------------------------------------------------------
// Status mapping (v1.1 — deterministic, signal-based)
// ---------------------------------------------------------------------------

/**
 * Map DB quote + cadence data to cockpit view model status.
 *
 * Priority order (deterministic):
 * 1. ARCHIVED: won/lost or completed/stopped/paused
 * 2. REPLIED: has strong reply signal (inbound or manual mark)
 * 3. FOLLOW_UP_DUE: has scheduled cadence event with scheduledFor <= now
 * 4. WAITING_REPLY: active ritmoStage (fup_d1..fup_d14)
 * 5. SENT: businessStatus = sent
 * 6. DRAFT: default
 */
function mapCockpitStatus(
    businessStatus: string,
    ritmoStage: string,
    hasOverdueEvent: boolean,
    hasReplySignal: boolean,
): CockpitStatus {
    // Archived states (highest priority — never show as risk/waiting)
    if (businessStatus === "won" || businessStatus === "lost") return "ARCHIVED";
    if (ritmoStage === "completed" || ritmoStage === "stopped" || ritmoStage === "paused") return "ARCHIVED";

    // Replied (signal-based, not just negotiation status)
    if (hasReplySignal) return "REPLIED";

    // Follow-up due (overdue scheduled event)
    if (hasOverdueEvent) return "FOLLOW_UP_DUE";

    // Waiting reply (active follow-up stage)
    const activeStages = ["fup_d1", "fup_d3", "fup_d7", "fup_d14"];
    if (activeStages.includes(ritmoStage)) return "WAITING_REPLY";

    // Sent
    if (businessStatus === "sent") return "SENT";

    // Default
    return "DRAFT";
}

// ---------------------------------------------------------------------------
// Shared select shape for quotes with reply signals
// ---------------------------------------------------------------------------

const INBOUND_SELECT = {
    where: { status: "processed" as const },
    orderBy: { receivedAt: "asc" as const },
    take: 1,
    select: { receivedAt: true, status: true },
};

const CONTACT_SELECT = { select: { name: true } };

function cadenceSelect(statuses: CadenceEventStatus[]) {
    return {
        where: { status: { in: statuses } },
        orderBy: { scheduledFor: "asc" as const },
        take: 5,
        select: { scheduledFor: true, status: true },
    };
}

const BASE_FIELDS = {
    id: true,
    title: true,
    reference: true,
    businessStatus: true,
    ritmoStage: true,
    value: true,
    firstSentAt: true,
    updatedAt: true,
} as const;

export async function GET() {
    try {
        const session = await getApiSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const orgId = session.user.organizationId;
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const [entitlements, riskTodayQuotes, risk7dCount, recoveredCandidates, sentCount30d, waitingQuotes] = await Promise.all([
            getEntitlements(orgId),

            // riskToday: quotes with overdue scheduled cadence events
            prisma.quote.findMany({
                where: {
                    organizationId: orgId,
                    businessStatus: { notIn: ["won", "lost"] },
                    ritmoStage: { notIn: ["completed", "stopped", "paused"] },
                    cadenceEvents: {
                        some: {
                            scheduledFor: { lte: now },
                            status: "scheduled",
                        },
                    },
                },
                select: {
                    ...BASE_FIELDS,
                    contact: CONTACT_SELECT,
                    cadenceEvents: cadenceSelect([CadenceEventStatus.scheduled, CadenceEventStatus.sent, CadenceEventStatus.completed]),
                    inboundIngestions: INBOUND_SELECT,
                },
                orderBy: { updatedAt: "asc" },
                take: 10,
            }),

            // risk7d count: quotes with scheduled events in next 7 days
            prisma.quote.count({
                where: {
                    organizationId: orgId,
                    businessStatus: { notIn: ["won", "lost"] },
                    ritmoStage: { notIn: ["completed", "stopped", "paused"] },
                    cadenceEvents: {
                        some: {
                            scheduledFor: { gt: now, lte: sevenDaysFromNow },
                            status: "scheduled",
                        },
                    },
                },
            }),

            // recovered30d candidates: quotes with reply signal AND cadence follow-up
            // Fetch broadly, filter with isRecoveredV11 in JS for temporal check
            prisma.quote.findMany({
                where: {
                    organizationId: orgId,
                    updatedAt: { gte: thirtyDaysAgo },
                    // Must have at least one sent/completed cadence event
                    cadenceEvents: {
                        some: {
                            status: { in: ["sent", "completed"] },
                        },
                    },
                    // Must have a reply signal (inbound OR negotiation)
                    OR: [
                        { businessStatus: "negotiation" },
                        {
                            inboundIngestions: {
                                some: { status: "processed" },
                            },
                        },
                    ],
                },
                select: {
                    ...BASE_FIELDS,
                    contact: CONTACT_SELECT,
                    cadenceEvents: cadenceSelect([CadenceEventStatus.sent, CadenceEventStatus.completed]),
                    inboundIngestions: INBOUND_SELECT,
                },
                orderBy: { updatedAt: "desc" },
                take: 20, // Fetch more to account for filtering
            }),

            // sentCount30d
            prisma.quote.count({
                where: {
                    organizationId: orgId,
                    firstSentAt: { gte: thirtyDaysAgo },
                },
            }),

            // waitingList: active follow-up stages
            prisma.quote.findMany({
                where: {
                    organizationId: orgId,
                    businessStatus: "sent",
                    ritmoStage: { in: ["fup_d1", "fup_d3", "fup_d7", "fup_d14"] },
                },
                select: {
                    ...BASE_FIELDS,
                    contact: CONTACT_SELECT,
                    cadenceEvents: cadenceSelect([CadenceEventStatus.scheduled, CadenceEventStatus.sent, CadenceEventStatus.completed]),
                    inboundIngestions: INBOUND_SELECT,
                },
                orderBy: { updatedAt: "desc" },
                take: 10,
            }),
        ]);

        // Apply isRecoveredV11 temporal filter to candidates
        const recoveredQuotes = recoveredCandidates
            .filter(q => isRecoveredV11(
                q.businessStatus,
                q.updatedAt,
                q.cadenceEvents,
                q.inboundIngestions,
            ))
            .slice(0, 10);

        const riskTodayCount = riskTodayQuotes.length;
        const recovered30dCount = recoveredQuotes.length;

        // repliedCount30d: use same recovered definition for consistency
        // (recovered = replied with attribution to Ritmo follow-up)
        const repliedCount30d = recovered30dCount;

        // replyRate30d: null if sentCount < 10 (not enough history)
        const replyRate30d = sentCount30d >= 10
            ? Math.round((repliedCount30d / sentCount30d) * 100)
            : null;

        // Transform quotes to CockpitItem
        function toCockpitItem(
            quote: typeof riskTodayQuotes[number],
            forceStatus?: CockpitStatus
        ): CockpitItem {
            const scheduledEvents = quote.cadenceEvents.filter(e => e.status === "scheduled");
            const sentEvents = quote.cadenceEvents.filter(e => e.status === "sent" || e.status === "completed");

            const hasOverdueEvent = scheduledEvents.some(e => e.scheduledFor <= now);

            const replyAt = getReplySignalAt(
                quote.businessStatus,
                quote.updatedAt,
                quote.inboundIngestions,
            );
            const hasReplySignal = replyAt !== null;

            const nextFollowUp = scheduledEvents.length > 0 ? scheduledEvents[0].scheduledFor : null;
            const lastContact = sentEvents.length > 0
                ? sentEvents[0].scheduledFor
                : quote.firstSentAt;

            const ageDays = quote.firstSentAt
                ? Math.floor((now.getTime() - quote.firstSentAt.getTime()) / (1000 * 60 * 60 * 24))
                : null;

            const status = forceStatus ?? mapCockpitStatus(
                quote.businessStatus,
                quote.ritmoStage,
                hasOverdueEvent,
                hasReplySignal,
            );

            return {
                id: quote.id,
                title: quote.title,
                reference: quote.reference,
                customerName: quote.contact?.name ?? null,
                status,
                lastContactAt: lastContact?.toISOString() ?? null,
                nextFollowUpAt: nextFollowUp?.toISOString() ?? null,
                repliedAt: replyAt?.toISOString() ?? null,
                value: quote.value?.toNumber() ?? null,
                ageDays,
            };
        }

        // Build lists
        const todayList = riskTodayQuotes.slice(0, 5).map(q => toCockpitItem(q, "FOLLOW_UP_DUE"));
        const riskList = riskTodayQuotes.map(q => toCockpitItem(q, "FOLLOW_UP_DUE"));
        const waitingList = waitingQuotes.map(q => toCockpitItem(q, "WAITING_REPLY"));
        const recoveredList = recoveredQuotes.map(q => toCockpitItem(q, "REPLIED"));

        const tier = entitlements.tier;

        return NextResponse.json({
            tier,
            planName: entitlements.planName,
            counts: {
                riskToday: riskTodayCount,
                risk7d: risk7dCount,
                recovered30d: recovered30dCount,
                replyRate30d,
                sentCount30d,
            },
            lists: {
                today: todayList,
                risk: riskList,
                waiting: waitingList,
                recovered: recoveredList,
            },
            aha: {
                ahaFirstBccCaptureAt: entitlements.ahaFirstBccCaptureAt?.toISOString() ?? null,
                trialActive: entitlements.trialActive,
            },
        });
    } catch (error) {
        log.error({ error }, "Failed to fetch cockpit data");
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
