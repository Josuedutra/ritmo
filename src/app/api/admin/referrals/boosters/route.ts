/**
 * Admin Booster Ledger API
 *
 * GET /api/admin/referrals/boosters - List all boosters with filters
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { unauthorized, serverError, success } from "@/lib/api-utils";
import type { BoosterStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
    try {
        const session = await requireAdminSession();
        if (!session) return unauthorized();

        const { searchParams } = new URL(request.url);
        const partnerId = searchParams.get("partnerId");
        const status = searchParams.get("status") as BoosterStatus | null;
        const from = searchParams.get("from");
        const to = searchParams.get("to");
        const limit = parseInt(searchParams.get("limit") || "100", 10);
        const offset = parseInt(searchParams.get("offset") || "0", 10);

        // Build where clause
        const where: Record<string, unknown> = {};
        if (partnerId) where.partnerId = partnerId;
        if (status) where.status = status;
        if (from || to) {
            where.createdAt = {};
            if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from);
            if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to);
        }

        const [boosters, total] = await Promise.all([
            prisma.boosterLedger.findMany({
                where,
                include: {
                    partner: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
                take: limit,
                skip: offset,
            }),
            prisma.boosterLedger.count({ where }),
        ]);

        // Fetch organization details for each booster
        const boostersWithOrg = await Promise.all(
            boosters.map(async (booster) => {
                const org = await prisma.organization.findUnique({
                    where: { id: booster.organizationId },
                    select: {
                        id: true,
                        name: true,
                    },
                });

                return {
                    ...booster,
                    organization: org,
                };
            })
        );

        // Calculate summary stats
        const aggregates = await prisma.boosterLedger.groupBy({
            by: ["status"],
            _count: true,
            _sum: {
                amountCents: true,
            },
        });

        const statusStats = aggregates.reduce(
            (acc, s) => {
                acc[s.status] = {
                    count: s._count,
                    totalCents: s._sum.amountCents || 0,
                };
                return acc;
            },
            {} as Record<string, { count: number; totalCents: number }>
        );

        const totalPending = statusStats.PENDING?.totalCents || 0;
        const totalPaid = statusStats.PAID?.totalCents || 0;
        const totalVoid = statusStats.VOID?.totalCents || 0;

        return success({
            boosters: boostersWithOrg,
            total,
            stats: {
                total,
                pending: {
                    count: statusStats.PENDING?.count || 0,
                    totalCents: totalPending,
                },
                approved: {
                    count: statusStats.APPROVED?.count || 0,
                    totalCents: statusStats.APPROVED?.totalCents || 0,
                },
                paid: {
                    count: statusStats.PAID?.count || 0,
                    totalCents: totalPaid,
                },
                void: {
                    count: statusStats.VOID?.count || 0,
                    totalCents: totalVoid,
                },
            },
        });
    } catch (error) {
        return serverError(error, "GET /api/admin/referrals/boosters");
    }
}
