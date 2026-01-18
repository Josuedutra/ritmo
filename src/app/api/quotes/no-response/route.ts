import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
    getApiSession,
    unauthorized,
    serverError,
    success,
} from "@/lib/api-utils";

/**
 * GET /api/quotes/no-response
 *
 * Get quotes that are "sent" but have no pending actions/events.
 * These are quotes where:
 * - businessStatus = "sent"
 * - ritmoStage = "completed" OR no pending cadence events
 *
 * These quotes need manual attention as the automatic cadence has finished
 * without receiving a response.
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = parseInt(searchParams.get("offset") || "0");

        // Find quotes that are sent but have no pending cadence events
        const quotes = await prisma.quote.findMany({
            where: {
                organizationId: session.user.organizationId,
                businessStatus: "sent",
                OR: [
                    // Cadence completed
                    { ritmoStage: "completed" },
                    // Or no scheduled events remaining
                    {
                        cadenceEvents: {
                            none: {
                                status: "scheduled",
                            },
                        },
                    },
                ],
            },
            include: {
                contact: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        company: true,
                        phone: true,
                    },
                },
                cadenceEvents: {
                    where: {
                        status: { in: ["sent", "completed", "skipped"] },
                    },
                    orderBy: { scheduledFor: "desc" },
                    take: 1,
                },
                _count: {
                    select: {
                        emailLogs: true,
                        tasks: true,
                    },
                },
            },
            orderBy: { sentAt: "desc" },
            take: limit,
            skip: offset,
        });

        const total = await prisma.quote.count({
            where: {
                organizationId: session.user.organizationId,
                businessStatus: "sent",
                OR: [
                    { ritmoStage: "completed" },
                    {
                        cadenceEvents: {
                            none: {
                                status: "scheduled",
                            },
                        },
                    },
                ],
            },
        });

        // Calculate days since sent for each quote
        const quotesWithDays = quotes.map((q) => {
            const daysSinceSent = q.sentAt
                ? Math.floor((Date.now() - q.sentAt.getTime()) / (1000 * 60 * 60 * 24))
                : null;

            return {
                ...q,
                daysSinceSent,
                lastAction: q.cadenceEvents[0] || null,
            };
        });

        return success({
            quotes: quotesWithDays,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + quotes.length < total,
            },
        });
    } catch (error) {
        return serverError(error, "GET /api/quotes/no-response");
    }
}
