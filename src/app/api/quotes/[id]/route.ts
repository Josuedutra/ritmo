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

const updateQuoteSchema = z.object({
    contactId: z.string().uuid().optional().nullable(),
    reference: z.string().optional().nullable(),
    title: z.string().min(1).optional(),
    serviceType: z.string().optional().nullable(),
    value: z.number().positive().optional().nullable(),
    currency: z.string().optional(),
    businessStatus: z.enum(["draft", "sent", "negotiation", "won", "lost"]).optional(),
    validUntil: z.string().datetime().optional().nullable(),
    proposalLink: z.string().url().optional().nullable(),
    notes: z.string().optional().nullable(),
    tags: z.array(z.string()).optional(),  // P1-03: Quick tags
    lossReason: z.string().optional().nullable(),  // P1-02: Loss reason
});

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/quotes/:id
 * Get a single quote with full details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const { id } = await params;

        const quote = await prisma.quote.findFirst({
            where: {
                id,
                organizationId: session.user.organizationId,
            },
            include: {
                contact: true,
                cadenceEvents: {
                    orderBy: { scheduledFor: "asc" },
                },
                tasks: {
                    orderBy: { dueAt: "asc" },
                },
                emailLogs: {
                    orderBy: { createdAt: "desc" },
                    take: 10,
                },
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        if (!quote) {
            return notFound("Quote");
        }

        return success(quote);
    } catch (error) {
        return serverError(error, "GET /api/quotes/:id");
    }
}

/**
 * PUT /api/quotes/:id
 * Update a quote
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const { id } = await params;
        const body = await request.json();
        const parsed = updateQuoteSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(parsed.error.errors[0].message);
        }

        // Check quote exists in org
        const existing = await prisma.quote.findFirst({
            where: {
                id,
                organizationId: session.user.organizationId,
            },
        });

        if (!existing) {
            return notFound("Quote");
        }

        // Members can only edit their own quotes
        if (session.user.role !== "admin" && existing.ownerUserId !== session.user.id) {
            return forbidden("Apenas pode editar os seus próprios orçamentos");
        }

        const { contactId, validUntil, ...rest } = parsed.data;

        // Verify contact belongs to organization if provided
        if (contactId) {
            const contact = await prisma.contact.findFirst({
                where: {
                    id: contactId,
                    organizationId: session.user.organizationId,
                },
            });
            if (!contact) {
                return badRequest("Contact not found");
            }
        }

        const quote = await prisma.quote.update({
            where: { id },
            data: {
                ...rest,
                ...(contactId !== undefined && { contactId }),
                ...(validUntil !== undefined && {
                    validUntil: validUntil ? new Date(validUntil) : null,
                }),
                lastActivityAt: new Date(),
            },
            include: {
                contact: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        company: true,
                    },
                },
            },
        });

        return success(quote);
    } catch (error) {
        return serverError(error, "PUT /api/quotes/:id");
    }
}

/**
 * DELETE /api/quotes/:id
 * Delete a quote and all related data
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const { id } = await params;

        // Check quote exists in org
        const existing = await prisma.quote.findFirst({
            where: {
                id,
                organizationId: session.user.organizationId,
            },
        });

        if (!existing) {
            return notFound("Quote");
        }

        // Members can only delete their own quotes
        if (session.user.role !== "admin" && existing.ownerUserId !== session.user.id) {
            return forbidden("Apenas pode eliminar os seus próprios orçamentos");
        }

        // Cascade delete handled by Prisma schema
        await prisma.quote.delete({
            where: { id },
        });

        return success({ deleted: true });
    } catch (error) {
        return serverError(error, "DELETE /api/quotes/:id");
    }
}
