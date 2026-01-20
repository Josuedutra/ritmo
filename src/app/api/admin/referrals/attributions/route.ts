/**
 * Admin Referral Attributions API
 *
 * GET /api/admin/referrals/attributions - List all attributions with filters
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { unauthorized, serverError, success } from "@/lib/api-utils";
import type { ReferralAttributionStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
    try {
        const session = await requireAdminSession();
        if (!session) return unauthorized();

        const { searchParams } = new URL(request.url);
        const partnerId = searchParams.get("partnerId");
        const status = searchParams.get("status") as ReferralAttributionStatus | null;
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

        const [attributions, total] = await Promise.all([
            prisma.referralAttribution.findMany({
                where,
                include: {
                    partner: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    referralLink: {
                        select: {
                            id: true,
                            code: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
                take: limit,
                skip: offset,
            }),
            prisma.referralAttribution.count({ where }),
        ]);

        // Fetch organization details for each attribution
        const attributionsWithOrg = await Promise.all(
            attributions.map(async (attr) => {
                const org = await prisma.organization.findUnique({
                    where: { id: attr.organizationId },
                    select: {
                        id: true,
                        name: true,
                        createdAt: true,
                        subscription: {
                            select: {
                                planId: true,
                                status: true,
                            },
                        },
                    },
                });

                return {
                    ...attr,
                    organization: org,
                };
            })
        );

        // Calculate summary stats
        const stats = await prisma.referralAttribution.groupBy({
            by: ["status"],
            _count: true,
        });

        const statusCounts = stats.reduce(
            (acc, s) => {
                acc[s.status] = s._count;
                return acc;
            },
            {} as Record<string, number>
        );

        return success({
            attributions: attributionsWithOrg,
            total,
            stats: {
                total,
                attributed: statusCounts.ATTRIBUTED || 0,
                signedUp: statusCounts.SIGNED_UP || 0,
                converted: statusCounts.CONVERTED || 0,
                disqualified: statusCounts.DISQUALIFIED || 0,
            },
        });
    } catch (error) {
        return serverError(error, "GET /api/admin/referrals/attributions");
    }
}
