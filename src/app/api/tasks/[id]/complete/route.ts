import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
    getApiSession,
    unauthorized,
    notFound,
    badRequest,
    serverError,
    success,
} from "@/lib/api-utils";

const completeTaskSchema = z.object({
    notes: z.string().optional().nullable(),
});

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * POST /api/tasks/:id/complete
 * Mark a task as completed
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const { id } = await params;

        // Parse optional notes
        let notes: string | null = null;
        try {
            const body = await request.json();
            const parsed = completeTaskSchema.safeParse(body);
            if (parsed.success) {
                notes = parsed.data.notes || null;
            }
        } catch {
            // No body is fine
        }

        // Check ownership
        const existing = await prisma.task.findFirst({
            where: {
                id,
                organizationId: session.user.organizationId,
            },
        });

        if (!existing) {
            return notFound("Task");
        }

        if (existing.status === "completed") {
            return badRequest("Task is already completed");
        }

        const task = await prisma.task.update({
            where: { id },
            data: {
                status: "completed",
                completedAt: new Date(),
                ...(notes && { notes }),
            },
            include: {
                quote: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });

        return success({
            task,
            message: "Task marked as completed",
        });
    } catch (error) {
        return serverError(error, "POST /api/tasks/:id/complete");
    }
}
