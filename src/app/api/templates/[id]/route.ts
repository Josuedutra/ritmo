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

const updateTemplateSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    subject: z.string().max(500).optional().nullable(),
    body: z.string().min(1).optional(),
    isActive: z.boolean().optional(),
});

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/templates/:id
 * Get a single template
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const { id } = await params;

        const template = await prisma.template.findFirst({
            where: {
                id,
                organizationId: session.user.organizationId,
            },
        });

        if (!template) {
            return notFound("Template");
        }

        return success(template);
    } catch (error) {
        return serverError(error, "GET /api/templates/:id");
    }
}

/**
 * PUT /api/templates/:id
 * Update a template (admin only)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        // Only admins can update templates
        if (session.user.role !== "admin") {
            return forbidden("Apenas administradores podem editar templates");
        }

        const { id } = await params;
        const body = await request.json();
        const parsed = updateTemplateSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(parsed.error.errors[0].message);
        }

        // Check ownership
        const existing = await prisma.template.findFirst({
            where: {
                id,
                organizationId: session.user.organizationId,
            },
        });

        if (!existing) {
            return notFound("Template");
        }

        const template = await prisma.template.update({
            where: { id },
            data: parsed.data,
        });

        return success(template);
    } catch (error) {
        return serverError(error, "PUT /api/templates/:id");
    }
}

/**
 * DELETE /api/templates/:id
 * Delete a template (admin only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        // Only admins can delete templates
        if (session.user.role !== "admin") {
            return forbidden("Apenas administradores podem eliminar templates");
        }

        const { id } = await params;

        // Check ownership
        const existing = await prisma.template.findFirst({
            where: {
                id,
                organizationId: session.user.organizationId,
            },
        });

        if (!existing) {
            return notFound("Template");
        }

        await prisma.template.delete({
            where: { id },
        });

        return success({ deleted: true });
    } catch (error) {
        return serverError(error, "DELETE /api/templates/:id");
    }
}
