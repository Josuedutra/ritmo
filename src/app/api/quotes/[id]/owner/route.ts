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
import { canReassignOwner } from "@/lib/entitlements";

interface RouteParams {
    params: Promise<{ id: string }>;
}

const updateOwnerSchema = z.object({
    ownerUserId: z.string().uuid("ID de utilizador inválido"),
});

/**
 * PUT /api/quotes/[id]/owner
 * Update quote owner (Pro only, admin or current owner only)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const { id } = await params;

        // Check if org can reassign owners (Pro feature)
        const canReassign = await canReassignOwner(session.user.organizationId);
        if (!canReassign.allowed) {
            return forbidden(
                `Reatribuição de responsáveis disponível apenas no plano ${canReassign.planRequired}. Atualize para usar funcionalidades de equipa.`
            );
        }

        const body = await request.json();
        const parsed = updateOwnerSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(parsed.error.errors[0].message);
        }

        const { ownerUserId } = parsed.data;

        // Get quote
        const quote = await prisma.quote.findFirst({
            where: {
                id,
                organizationId: session.user.organizationId,
            },
            select: {
                id: true,
                ownerUserId: true,
            },
        });

        if (!quote) {
            return notFound("Orçamento");
        }

        // Only admin or current owner can reassign
        const isAdmin = session.user.role === "admin";
        const isOwner = quote.ownerUserId === session.user.id;

        if (!isAdmin && !isOwner) {
            return forbidden("Apenas administradores ou o responsável atual podem reatribuir");
        }

        // Verify new owner exists in org
        const newOwner = await prisma.user.findFirst({
            where: {
                id: ownerUserId,
                organizationId: session.user.organizationId,
            },
            select: {
                id: true,
                name: true,
                email: true,
            },
        });

        if (!newOwner) {
            return badRequest("Utilizador não encontrado nesta organização");
        }

        // Update quote owner
        const updatedQuote = await prisma.quote.update({
            where: { id },
            data: { ownerUserId },
            select: {
                id: true,
                title: true,
                ownerUserId: true,
                owner: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        return success({ quote: updatedQuote });
    } catch (error) {
        return serverError(error, "PUT /api/quotes/[id]/owner");
    }
}
