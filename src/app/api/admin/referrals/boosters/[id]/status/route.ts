/**
 * Admin Booster Status API
 *
 * POST /api/admin/referrals/boosters/:id/status - Update booster status
 *
 * Body: { status: "PAID" | "VOID" | "APPROVED" }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { unauthorized, notFound, serverError, success } from "@/lib/api-utils";
import type { BoosterStatus } from "@prisma/client";

interface RouteParams {
    params: Promise<{ id: string }>;
}

const VALID_STATUSES: BoosterStatus[] = ["PENDING", "APPROVED", "PAID", "VOID"];

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await requireAdminSession();
        if (!session) return unauthorized();

        const { id } = await params;
        const body = await request.json();
        const { status } = body;

        if (!status || !VALID_STATUSES.includes(status)) {
            return NextResponse.json(
                { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
                { status: 400 }
            );
        }

        const booster = await prisma.boosterLedger.findUnique({
            where: { id },
        });

        if (!booster) {
            return notFound("Booster");
        }

        const updatedBooster = await prisma.boosterLedger.update({
            where: { id },
            data: { status },
            include: {
                partner: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        return success({
            booster: updatedBooster,
            message: `Booster status updated to ${status}`,
        });
    } catch (error) {
        return serverError(error, "POST /api/admin/referrals/boosters/:id/status");
    }
}
