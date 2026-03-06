/**
 * GET /api/partners/[partnerId]/referrals
 *
 * Lists referrals for a partner with pagination.
 * Each referral includes: date, referred user email, status, plan.
 *
 * Query params: page (default 1), per_page (default 20, max 100)
 *
 * Auth: partner themselves (contactEmail matches session) or admin.
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiSession, unauthorized, forbidden, notFound, serverError, success } from "@/lib/api-utils";
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

    // Get referrals with org details for email and plan
    const [referrals, total] = await Promise.all([
      prisma.referralAttribution.findMany({
        where: { partnerId },
        orderBy: { createdAt: "desc" },
        skip,
        take: perPage,
        select: {
          id: true,
          firstTouchAt: true,
          signupAt: true,
          convertedAt: true,
          status: true,
          organizationId: true,
        },
      }),
      prisma.referralAttribution.count({ where: { partnerId } }),
    ]);

    // Fetch org details (email of first user, subscription plan)
    const orgIds = referrals.map((r) => r.organizationId);
    const [orgs, subs] = await Promise.all([
      prisma.user.findMany({
        where: { organizationId: { in: orgIds } },
        select: { organizationId: true, email: true },
        distinct: ["organizationId"],
      }),
      prisma.subscription.findMany({
        where: { organizationId: { in: orgIds } },
        select: { organizationId: true, planId: true },
      }),
    ]);

    const emailByOrg = new Map(orgs.map((u) => [u.organizationId, u.email]));
    const planByOrg = new Map(subs.map((s) => [s.organizationId, s.planId]));

    const items = referrals.map((r) => ({
      id: r.id,
      date: r.firstTouchAt,
      signupAt: r.signupAt,
      convertedAt: r.convertedAt,
      referredEmail: emailByOrg.get(r.organizationId) ?? null,
      status: r.status,
      plan: planByOrg.get(r.organizationId) ?? "free",
    }));

    return success({
      referrals: items,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    return serverError(error, "GET /api/partners/[partnerId]/referrals");
  }
}
