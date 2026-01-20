/**
 * Admin Partners API
 *
 * GET /api/admin/partners - List all partners
 * POST /api/admin/partners - Create a new partner
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { unauthorized, serverError, success } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
    try {
        const session = await requireAdminSession();
        if (!session) return unauthorized();

        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status") as "ACTIVE" | "PAUSED" | null;

        const partners = await prisma.partner.findMany({
            where: status ? { status } : undefined,
            include: {
                _count: {
                    select: {
                        referralLinks: true,
                        attributions: true,
                        boosterLedger: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        // Calculate total boosters per partner
        const partnersWithStats = await Promise.all(
            partners.map(async (partner) => {
                const boosterStats = await prisma.boosterLedger.aggregate({
                    where: { partnerId: partner.id },
                    _sum: { amountCents: true },
                    _count: true,
                });

                const pendingBoosters = await prisma.boosterLedger.aggregate({
                    where: { partnerId: partner.id, status: "PENDING" },
                    _sum: { amountCents: true },
                    _count: true,
                });

                return {
                    ...partner,
                    stats: {
                        linksCount: partner._count.referralLinks,
                        attributionsCount: partner._count.attributions,
                        boostersCount: partner._count.boosterLedger,
                        totalBoosterCents: boosterStats._sum.amountCents || 0,
                        pendingBoosterCents: pendingBoosters._sum.amountCents || 0,
                        pendingBoostersCount: pendingBoosters._count,
                    },
                };
            })
        );

        return success({ partners: partnersWithStats });
    } catch (error) {
        return serverError(error, "GET /api/admin/partners");
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await requireAdminSession();
        if (!session) return unauthorized();

        const body = await request.json();
        const {
            name,
            type = "OTHER",
            contactName,
            contactEmail,
            website,
            defaultBoosterRateBps = 1500,
        } = body;

        if (!name) {
            return NextResponse.json(
                { error: "Partner name is required" },
                { status: 400 }
            );
        }

        const partner = await prisma.partner.create({
            data: {
                name,
                type,
                contactName,
                contactEmail,
                website,
                defaultBoosterRateBps,
                status: "ACTIVE",
            },
        });

        return success({ partner }, 201);
    } catch (error) {
        return serverError(error, "POST /api/admin/partners");
    }
}
