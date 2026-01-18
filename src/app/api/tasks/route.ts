import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
    getApiSession,
    unauthorized,
    badRequest,
    serverError,
    success,
} from "@/lib/api-utils";

const createTaskSchema = z.object({
    quoteId: z.string().uuid(),
    type: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional().nullable(),
    dueAt: z.string().datetime().optional().nullable(),
    priority: z.enum(["HIGH", "LOW"]).default("LOW"),
    assignedToId: z.string().uuid().optional().nullable(),
});

/**
 * GET /api/tasks
 * List all tasks for the organization
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status"); // pending, completed, skipped
        const type = searchParams.get("type"); // email, call, custom
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = parseInt(searchParams.get("offset") || "0");

        const where = {
            organizationId: session.user.organizationId,
            ...(status && { status: status as never }),
            ...(type && { type }),
        };

        const [tasks, total] = await Promise.all([
            prisma.task.findMany({
                where,
                orderBy: [{ priority: "desc" }, { dueAt: "asc" }],
                take: limit,
                skip: offset,
                include: {
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
            }),
            prisma.task.count({ where }),
        ]);

        return success({
            tasks,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + tasks.length < total,
            },
        });
    } catch (error) {
        return serverError(error, "GET /api/tasks");
    }
}

/**
 * POST /api/tasks
 * Create a new task manually
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const body = await request.json();
        const parsed = createTaskSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(parsed.error.errors[0].message);
        }

        const { quoteId, dueAt, assignedToId, ...rest } = parsed.data;

        // Verify quote belongs to organization
        const quote = await prisma.quote.findFirst({
            where: {
                id: quoteId,
                organizationId: session.user.organizationId,
            },
        });

        if (!quote) {
            return badRequest("Quote not found");
        }

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

        const task = await prisma.task.create({
            data: {
                ...rest,
                quoteId,
                organizationId: session.user.organizationId,
                dueAt: dueAt ? new Date(dueAt) : null,
                assignedToId,
            },
            include: {
                quote: {
                    select: {
                        id: true,
                        title: true,
                        reference: true,
                    },
                },
            },
        });

        return success(task, 201);
    } catch (error) {
        return serverError(error, "POST /api/tasks");
    }
}
