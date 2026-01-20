import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
    getApiSession,
    unauthorized,
    forbidden,
    notFound,
    badRequest,
    serverError,
    success,
} from "@/lib/api-utils";

const updateTaskSchema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    dueAt: z.string().datetime().optional().nullable(),
    priority: z.enum(["HIGH", "LOW"]).optional(),
    status: z.enum(["pending", "completed", "skipped"]).optional(),
    assignedToId: z.string().uuid().optional().nullable(),
    notes: z.string().optional().nullable(),
});

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/tasks/:id
 * Get a single task
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const { id } = await params;

        const task = await prisma.task.findFirst({
            where: {
                id,
                organizationId: session.user.organizationId,
            },
            include: {
                quote: {
                    include: {
                        contact: true,
                    },
                },
                cadenceEvent: true,
                assignedTo: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        if (!task) {
            return notFound("Task");
        }

        return success(task);
    } catch (error) {
        return serverError(error, "GET /api/tasks/:id");
    }
}

/**
 * PUT /api/tasks/:id
 * Update a task
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const { id } = await params;
        const body = await request.json();
        const parsed = updateTaskSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(parsed.error.errors[0].message);
        }

        // Check task exists in org
        const existing = await prisma.task.findFirst({
            where: {
                id,
                organizationId: session.user.organizationId,
            },
            include: {
                quote: {
                    select: { ownerUserId: true },
                },
            },
        });

        if (!existing) {
            return notFound("Task");
        }

        // Members can only edit tasks assigned to them or from their own quotes
        if (session.user.role !== "admin") {
            const isAssignedToMe = existing.assignedToId === session.user.id;
            const isMyQuote = existing.quote?.ownerUserId === session.user.id;
            if (!isAssignedToMe && !isMyQuote) {
                return forbidden("Apenas pode editar tarefas atribuídas a si");
            }
        }

        const { dueAt, assignedToId, status, ...rest } = parsed.data;

        // Verify assignee belongs to organization if provided
        if (assignedToId) {
            const user = await prisma.user.findFirst({
                where: {
                    id: assignedToId,
                    organizationId: session.user.organizationId,
                },
            });
            if (!user) {
                return badRequest("Assigned user not found");
            }
        }

        const task = await prisma.task.update({
            where: { id },
            data: {
                ...rest,
                ...(dueAt !== undefined && { dueAt: dueAt ? new Date(dueAt) : null }),
                ...(assignedToId !== undefined && { assignedToId }),
                ...(status && {
                    status,
                    completedAt: status === "completed" ? new Date() : null,
                }),
            },
        });

        return success(task);
    } catch (error) {
        return serverError(error, "PUT /api/tasks/:id");
    }
}

/**
 * DELETE /api/tasks/:id
 * Delete a task
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const { id } = await params;

        // Check task exists in org
        const existing = await prisma.task.findFirst({
            where: {
                id,
                organizationId: session.user.organizationId,
            },
            include: {
                quote: {
                    select: { ownerUserId: true },
                },
            },
        });

        if (!existing) {
            return notFound("Task");
        }

        // Members can only delete tasks assigned to them or from their own quotes
        if (session.user.role !== "admin") {
            const isAssignedToMe = existing.assignedToId === session.user.id;
            const isMyQuote = existing.quote?.ownerUserId === session.user.id;
            if (!isAssignedToMe && !isMyQuote) {
                return forbidden("Apenas pode eliminar tarefas atribuídas a si");
            }
        }

        await prisma.task.delete({
            where: { id },
        });

        return success({ deleted: true });
    } catch (error) {
        return serverError(error, "DELETE /api/tasks/:id");
    }
}
