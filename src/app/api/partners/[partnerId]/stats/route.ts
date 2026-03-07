/**
 * GET /api/partners/[partnerId]/stats
 *
 * Returns partner dashboard stats:
 * - Total referrals, active referrals
 * - Accumulated commissions, pending commissions
 *
 * Auth: partner themselves (contactEmail matches session) or admin.
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getApiSession,
  unauthorized,
  forbidden,
  notFound,
  serverError,
  success,
} from "@/lib/api-utils";
import { isAdminEmail } from "@/lib/admin-auth";

interface RouteParams {
  params: Promise<{ partnerId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getApiSession();
    if (!session) return unauthorized();

    const { partnerId } = await params;

    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
    });

    if (!partner) return notFound("Partner");

    // Auth: only the partner themselves or admin
    const isAdmin = isAdminEmail(session.user.email);
    const isOwner = partner.contactEmail?.toLowerCase() === session.user.email.toLowerCase();
    if (!isAdmin && !isOwner) return forbidden();

    // Total referrals
    const totalReferrals = await prisma.referralAttribution.count({
      where: { partnerId },
    });

    // Active referrals (SIGNED_UP or CONVERTED)
    const activeReferrals = await prisma.referralAttribution.count({
      where: {
        partnerId,
        status: { in: ["SIGNED_UP", "CONVERTED"] },
      },
    });

    // Accumulated commissions (all statuses)
    const totalCommissions = await prisma.boosterLedger.aggregate({
      where: { partnerId },
      _sum: { amountCents: true },
    });

    // Pending commissions
    const pendingCommissions = await prisma.boosterLedger.aggregate({
      where: { partnerId, status: "PENDING" },
      _sum: { amountCents: true },
    });

    return success({
      partnerId,
      totalReferrals,
      activeReferrals,
      totalCommissionsCents: totalCommissions._sum.amountCents ?? 0,
      pendingCommissionsCents: pendingCommissions._sum.amountCents ?? 0,
    });
  } catch (error) {
    return serverError(error, "GET /api/partners/[partnerId]/stats");
  }
}
