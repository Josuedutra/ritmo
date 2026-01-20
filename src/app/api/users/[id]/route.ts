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

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/users/[id]
 * Get user details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const { id } = await params;

        const user = await prisma.user.findFirst({
            where: {
                id,
                organizationId: session.user.organizationId,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
            },
        });

        if (!user) {
            return notFound("Utilizador");
        }

        return success({ user });
    } catch (error) {
        return serverError(error, "GET /api/users/[id]");
    }
}

const updateUserSchema = z.object({
    name: z.string().optional(),
    role: z.enum(["admin", "member"]).optional(),
});

/**
 * PUT /api/users/[id]
 * Update user (admin only for role changes)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const { id } = await params;

        const body = await request.json();
        const parsed = updateUserSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(parsed.error.errors[0].message);
        }

        const { name, role } = parsed.data;

        // Check if user exists in this org
        const existingUser = await prisma.user.findFirst({
            where: {
                id,
                organizationId: session.user.organizationId,
            },
        });

        if (!existingUser) {
            return notFound("Utilizador");
        }

        // Only admins can change roles
        if (role && session.user.role !== "admin") {
            return forbidden("Apenas administradores podem alterar permissões");
        }

        // Can't demote yourself if you're the last admin
        if (role === "member" && existingUser.role === "admin" && id === session.user.id) {
            const adminCount = await prisma.user.count({
                where: {
                    organizationId: session.user.organizationId,
                    role: "admin",
                },
            });

            if (adminCount <= 1) {
                return badRequest("Não pode remover o único administrador da organização");
            }
        }

        const user = await prisma.user.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(role && { role }),
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
            },
        });

        return success({ user });
    } catch (error) {
        return serverError(error, "PUT /api/users/[id]");
    }
}

/**
 * DELETE /api/users/[id]
 * Remove user from organization (admin only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        // Only admins can delete users
        if (session.user.role !== "admin") {
            return forbidden("Apenas administradores podem remover utilizadores");
        }

        const { id } = await params;

        // Can't delete yourself
        if (id === session.user.id) {
            return badRequest("Não pode remover a sua própria conta");
        }

        // Check if user exists in this org
        const existingUser = await prisma.user.findFirst({
            where: {
                id,
                organizationId: session.user.organizationId,
            },
        });

        if (!existingUser) {
            return notFound("Utilizador");
        }

        // Delete user
        await prisma.user.delete({
            where: { id },
        });

        return success({ deleted: true });
    } catch (error) {
        return serverError(error, "DELETE /api/users/[id]");
    }
}
