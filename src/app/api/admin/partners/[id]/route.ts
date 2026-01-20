/**
 * Admin Partner API - Single Partner
 *
 * GET /api/admin/partners/:id - Get partner details
 * PUT /api/admin/partners/:id - Update partner
 * DELETE /api/admin/partners/:id - Soft delete (pause) partner
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { unauthorized, notFound, serverError, success } from "@/lib/api-utils";

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await requireAdminSession();
        if (!session) return unauthorized();

        const { id } = await params;

        const partner = await prisma.partner.findUnique({
            where: { id },
            include: {
                referralLinks: {
                    orderBy: { createdAt: "desc" },
                },
                attributions: {
                    orderBy: { createdAt: "desc" },
                    take: 20,
                },
                boosterLedger: {
                    orderBy: { createdAt: "desc" },
                    take: 20,
                },
            },
        });

        if (!partner) {
            return notFound("Partner");
        }

        return success({ partner });
    } catch (error) {
        return serverError(error, "GET /api/admin/partners/:id");
    }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await requireAdminSession();
        if (!session) return unauthorized();

        const { id } = await params;
        const body = await request.json();

        const {
            name,
            type,
            contactName,
            contactEmail,
            website,
            status,
            defaultBoosterRateBps,
        } = body;

        const partner = await prisma.partner.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(type !== undefined && { type }),
                ...(contactName !== undefined && { contactName }),
                ...(contactEmail !== undefined && { contactEmail }),
                ...(website !== undefined && { website }),
                ...(status !== undefined && { status }),
                ...(defaultBoosterRateBps !== undefined && { defaultBoosterRateBps }),
            },
        });

        return success({ partner });
    } catch (error) {
        return serverError(error, "PUT /api/admin/partners/:id");
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await requireAdminSession();
        if (!session) return unauthorized();

        const { id } = await params;

        // Soft delete: just pause the partner
        const partner = await prisma.partner.update({
            where: { id },
            data: { status: "PAUSED" },
        });

        return success({ partner, message: "Partner paused" });
    } catch (error) {
        return serverError(error, "DELETE /api/admin/partners/:id");
    }
}
