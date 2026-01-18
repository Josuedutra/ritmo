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

const updateContactSchema = z.object({
    email: z.string().email().optional().nullable(),
    name: z.string().min(1).optional().nullable(),
    company: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
});

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/contacts/:id
 * Get a single contact
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const { id } = await params;

        const contact = await prisma.contact.findFirst({
            where: {
                id,
                organizationId: session.user.organizationId,
            },
            include: {
                quotes: {
                    orderBy: { createdAt: "desc" },
                    take: 10,
                },
            },
        });

        if (!contact) {
            return notFound("Contact");
        }

        return success(contact);
    } catch (error) {
        return serverError(error, "GET /api/contacts/:id");
    }
}

/**
 * PUT /api/contacts/:id
 * Update a contact
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const { id } = await params;
        const body = await request.json();
        const parsed = updateContactSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(parsed.error.errors[0].message);
        }

        // Check ownership
        const existing = await prisma.contact.findFirst({
            where: {
                id,
                organizationId: session.user.organizationId,
            },
        });

        if (!existing) {
            return notFound("Contact");
        }

        const contact = await prisma.contact.update({
            where: { id },
            data: parsed.data,
        });

        return success(contact);
    } catch (error) {
        return serverError(error, "PUT /api/contacts/:id");
    }
}

/**
 * DELETE /api/contacts/:id
 * Delete a contact
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const { id } = await params;

        // Check ownership
        const existing = await prisma.contact.findFirst({
            where: {
                id,
                organizationId: session.user.organizationId,
            },
        });

        if (!existing) {
            return notFound("Contact");
        }

        await prisma.contact.delete({
            where: { id },
        });

        return success({ deleted: true });
    } catch (error) {
        return serverError(error, "DELETE /api/contacts/:id");
    }
}
