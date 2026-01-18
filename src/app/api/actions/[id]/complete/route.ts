import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import type { RitmoStage } from "@prisma/client";
import {
    getApiSession,
    unauthorized,
    notFound,
    badRequest,
    serverError,
    success,
} from "@/lib/api-utils";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// Map from event type to next ritmo stage
const NEXT_STAGE_MAP: Record<string, RitmoStage> = {
    email_d1: "fup_d3",
    email_d3: "fup_d7",
    call_d7: "fup_d14",
    email_d14: "completed",
};

/**
 * POST /api/actions/[id]/complete
 *
 * Mark a cadence event as completed.
 * This is called when the user manually completes an action (email sent, call made).
 *
 * Updates:
 * - CadenceEvent status to "completed"
 * - Quote ritmoStage to next stage (if applicable)
 * - Quote lastActivityAt
 * - Associated Task status to "completed" (if exists)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const { id } = await params;

        // Find the cadence event
        const event = await prisma.cadenceEvent.findUnique({
            where: { id },
            include: {
                quote: {
                    select: {
                        id: true,
                        organizationId: true,
                        businessStatus: true,
                        ritmoStage: true,
                    },
                },
                tasks: {
                    where: { status: "pending" },
                    select: { id: true },
                },
            },
        });

        if (!event) {
            return notFound("Ação");
        }

        // Verify organization access
        if (event.quote.organizationId !== session.user.organizationId) {
            return unauthorized();
        }

        // Check if already completed
        if (event.status === "completed") {
            return badRequest("Esta ação já foi concluída");
        }

        // Check if cancelled
        if (event.status === "cancelled") {
            return badRequest("Esta ação foi cancelada");
        }

        // Determine next ritmo stage
        const nextStage = NEXT_STAGE_MAP[event.eventType];

        // Update in transaction
        await prisma.$transaction(async (tx) => {
            // Mark event as completed
            await tx.cadenceEvent.update({
                where: { id },
                data: {
                    status: "completed",
                    processedAt: new Date(),
                },
            });

            // Mark any associated tasks as completed
            if (event.tasks.length > 0) {
                await tx.task.updateMany({
                    where: {
                        id: { in: event.tasks.map((t) => t.id) },
                    },
                    data: {
                        status: "completed",
                        completedAt: new Date(),
                    },
                });
            }

            // Update quote ritmo stage and last activity
            // Only update stage if quote is still in "sent" status
            const updateData: { lastActivityAt: Date; ritmoStage?: RitmoStage } = {
                lastActivityAt: new Date(),
            };

            if (event.quote.businessStatus === "sent" && nextStage) {
                updateData.ritmoStage = nextStage;
            }

            await tx.quote.update({
                where: { id: event.quoteId },
                data: updateData,
            });
        });

        return success({
            message: "Ação concluída com sucesso",
            eventId: id,
            nextStage,
        });
    } catch (error) {
        return serverError(error, "POST /api/actions/[id]/complete");
    }
}
