/**
 * POST /api/partners/[partnerId]/referral-codes
 *
 * Generates a unique referral code for a partner.
 * Admin-only endpoint (requires admin session).
 *
 * Optional body: { landingPath?: string }
 * Defaults: landingPath = "/signup"
 *
 * Response: { link: { id, code, partnerId, landingPath, fullUrl, createdAt } }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { generateUniqueReferralCode, isValidReferralCode } from "@/lib/referral-codes";
import { APP_ORIGIN } from "@/lib/config";
import { logger } from "@/lib/logger";

const log = logger.child({ service: "referral-codes" });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ partnerId: string }> }
) {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { partnerId } = await params;

    // Verify partner exists
    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
    });

    if (!partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    // Parse optional body
    let landingPath = "/signup";
    try {
      const body = await request.json();
      if (body.landingPath && typeof body.landingPath === "string") {
        landingPath = body.landingPath;
      }
      // Allow custom code if provided
      if (body.code && typeof body.code === "string") {
        if (!isValidReferralCode(body.code)) {
          return NextResponse.json(
            { error: "Invalid code format. Must be 4-14 lowercase alphanumeric characters." },
            { status: 400 }
          );
        }

        // Check uniqueness for custom code
        const existing = await prisma.referralLink.findUnique({
          where: { code: body.code },
        });
        if (existing) {
          return NextResponse.json({ error: "Referral code already exists" }, { status: 409 });
        }

        const link = await prisma.referralLink.create({
          data: {
            partnerId,
            code: body.code,
            landingPath,
          },
        });

        const fullUrl = `${APP_ORIGIN}${link.landingPath}?ref=${link.code}`;
        log.info({ partnerId, code: link.code }, "Referral code created (custom)");

        return NextResponse.json({ link: { ...link, fullUrl } }, { status: 201 });
      }
    } catch {
      // Empty body is fine — we'll auto-generate
    }

    // Generate unique code
    const code = await generateUniqueReferralCode(partner.name);

    const link = await prisma.referralLink.create({
      data: {
        partnerId,
        code,
        landingPath,
      },
    });

    const fullUrl = `${APP_ORIGIN}${link.landingPath}?ref=${link.code}`;
    log.info({ partnerId, code: link.code }, "Referral code created (auto)");

    return NextResponse.json({ link: { ...link, fullUrl } }, { status: 201 });
  } catch (error) {
    log.error({ error }, "Error generating referral code");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/partners/[partnerId]/referral-codes
 *
 * List all referral codes for a partner.
 * Admin-only endpoint.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ partnerId: string }> }
) {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { partnerId } = await params;

    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
    });

    if (!partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    const links = await prisma.referralLink.findMany({
      where: { partnerId },
      include: {
        _count: {
          select: { attributions: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const linksWithUrls = links.map((link) => ({
      ...link,
      fullUrl: `${APP_ORIGIN}${link.landingPath}?ref=${link.code}`,
      attributionsCount: link._count.attributions,
    }));

    return NextResponse.json({ links: linksWithUrls });
  } catch (error) {
    log.error({ error }, "Error listing referral codes");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
