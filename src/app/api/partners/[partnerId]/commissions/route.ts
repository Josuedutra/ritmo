/**
 * GET /api/partners/[partnerId]/commissions
 *
 * Lists commissions for a partner.
 * Each entry: month, amount, status (PENDING/APPROVED/PAID/VOID).
 *
 * Query params: page (default 1), per_page (default 20, max 100)
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

    // Pagination
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get("per_page") || "20", 10)));
    const skip = (page - 1) * perPage;

    const [commissions, total] = await Promise.all([
      prisma.boosterLedger.findMany({
        where: { partnerId },
        orderBy: { createdAt: "desc" },
        skip,
        take: perPage,
        select: {
          id: true,
          amountCents: true,
          currency: true,
          rateBps: true,
          status: true,
          reason: true,
          createdAt: true,
        },
      }),
      prisma.boosterLedger.count({ where: { partnerId } }),
    ]);

    const items = commissions.map((c) => ({
      id: c.id,
      month: `${c.createdAt.getFullYear()}-${String(c.createdAt.getMonth() + 1).padStart(2, "0")}`,
      amountCents: c.amountCents,
      currency: c.currency,
      rateBps: c.rateBps,
      status: c.status,
      reason: c.reason,
      createdAt: c.createdAt,
    }));

    return success({
      commissions: items,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    return serverError(error, "GET /api/partners/[partnerId]/commissions");
  }
}
