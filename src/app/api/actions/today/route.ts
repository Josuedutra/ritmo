import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { startOfDay, endOfDay } from "date-fns";
import {
    getApiSession,
    unauthorized,
    serverError,
    success,
} from "@/lib/api-utils";

// Map event types to template codes
const EVENT_TO_TEMPLATE: Record<string, string> = {
    email_d1: "T2",
    email_d3: "T3",
    email_d14: "T5",
    call_d7: "CALL_SCRIPT",
};

/**
 * GET /api/actions/today
 *
 * Get all actions scheduled for today:
 * - Cadence events (emails, calls) scheduled for today
 * - Tasks due today
 *
 * Returns actions grouped by type with quote details and templates
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const orgId = session.user.organizationId;

        // Get organization timezone
        const org = await prisma.organization.findUnique({
            where: { id: orgId },
            select: { timezone: true },
        });

        const timezone = org?.timezone || "Europe/Lisbon";

        // Calculate today's boundaries in org timezone
        const nowInTz = toZonedTime(new Date(), timezone);
        const todayStart = fromZonedTime(startOfDay(nowInTz), timezone);
        const todayEnd = fromZonedTime(endOfDay(nowInTz), timezone);

        // Get cadence events and templates in parallel
        const [cadenceEvents, templates] = await Promise.all([
            prisma.cadenceEvent.findMany({
                where: {
                    organizationId: orgId,
                    scheduledFor: {
                        gte: todayStart,
                        lte: todayEnd,
                    },
                    status: { in: ["scheduled", "claimed"] },
                },
                select: {
                    id: true,
                    eventType: true,
                    scheduledFor: true,
                    status: true,
                    priority: true,
                    quote: {
                        select: {
                            id: true,
                            title: true,
                            reference: true,
                            value: true,
                            businessStatus: true,
                            firstSentAt: true,
                            proposalLink: true,
                            contact: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                    company: true,
                                    phone: true,
                                },
                            },
                        },
                    },
                },
                orderBy: [{ priority: "desc" }, { scheduledFor: "asc" }],
            }),
            prisma.template.findMany({
                where: {
                    organizationId: orgId,
                    isActive: true,
                    code: { in: Object.values(EVENT_TO_TEMPLATE) },
                },
                select: {
                    code: true,
                    name: true,
                    subject: true,
                    body: true,
                },
            }),
        ]);

        // Create template lookup map
        const templateMap = new Map(templates.map((t) => [t.code, t]));

        // Get tasks due today
        const tasks = await prisma.task.findMany({
            where: {
                organizationId: orgId,
                dueAt: {
                    gte: todayStart,
                    lte: todayEnd,
                },
                status: "pending",
            },
            select: {
                id: true,
                type: true,
                title: true,
                description: true,
                dueAt: true,
                priority: true,
                status: true,
                quote: {
                    select: {
                        id: true,
                        title: true,
                        reference: true,
                        value: true,
                        contact: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                company: true,
                                phone: true,
                            },
                        },
                    },
                },
                assignedTo: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: [{ priority: "desc" }, { dueAt: "asc" }],
        });

        // Separate by type
        const emailEvents = cadenceEvents.filter((e) => e.eventType.startsWith("email_"));
        const callEvents = cadenceEvents.filter((e) => e.eventType === "call_d7");

        // Build summary
        const summary = {
            total: cadenceEvents.length + tasks.length,
            emails: emailEvents.length,
            calls: callEvents.length,
            tasks: tasks.length,
            highPriority: cadenceEvents.filter((e) => e.priority === "HIGH").length,
        };

        // Helper to get template for an event
        const getTemplate = (eventType: string) => {
            const code = EVENT_TO_TEMPLATE[eventType];
            return code ? templateMap.get(code) || null : null;
        };

        return success({
            summary,
            actions: {
                emails: emailEvents.map((e) => ({
                    id: e.id,
                    type: "email" as const,
                    eventType: e.eventType,
                    scheduledFor: e.scheduledFor,
                    status: e.status,
                    quote: {
                        ...e.quote,
                        value: e.quote.value?.toNumber() ?? null,
                    },
                    template: getTemplate(e.eventType),
                })),
                calls: callEvents.map((e) => ({
                    id: e.id,
                    type: "call" as const,
                    eventType: e.eventType,
                    scheduledFor: e.scheduledFor,
                    status: e.status,
                    priority: e.priority,
                    quote: {
                        ...e.quote,
                        value: e.quote.value?.toNumber() ?? null,
                    },
                    template: getTemplate(e.eventType),
                })),
                tasks: tasks.map((t) => ({
                    id: t.id,
                    type: "task" as const,
                    taskType: t.type,
                    title: t.title,
                    description: t.description,
                    dueAt: t.dueAt,
                    priority: t.priority,
                    status: t.status,
                    quote: {
                        ...t.quote,
                        value: t.quote.value?.toNumber() ?? null,
                    },
                    assignedTo: t.assignedTo,
                })),
            },
        });
    } catch (error) {
        return serverError(error, "GET /api/actions/today");
    }
}
