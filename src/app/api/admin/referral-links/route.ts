/**
 * Admin Referral Links API
 *
 * GET /api/admin/referral-links - List all referral links
 * POST /api/admin/referral-links - Create a new referral link
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { unauthorized, serverError, success } from "@/lib/api-utils";
import { nanoid } from "nanoid";

export async function GET(request: NextRequest) {
    try {
        const session = await requireAdminSession();
        if (!session) return unauthorized();

        const { searchParams } = new URL(request.url);
        const partnerId = searchParams.get("partnerId");

        const links = await prisma.referralLink.findMany({
            where: partnerId ? { partnerId } : undefined,
            include: {
                partner: {
                    select: {
                        id: true,
                        name: true,
                        status: true,
                    },
                },
                _count: {
                    select: {
                        attributions: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        // Add full URL to each link
        const baseUrl = process.env.NEXTAUTH_URL || "https://ritmo.app";
        const linksWithUrls = links.map((link) => ({
            ...link,
            fullUrl: `${baseUrl}${link.landingPath}?ref=${link.code}`,
            attributionsCount: link._count.attributions,
        }));

        return success({ links: linksWithUrls });
    } catch (error) {
        return serverError(error, "GET /api/admin/referral-links");
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await requireAdminSession();
        if (!session) return unauthorized();

        const body = await request.json();
        const { partnerId, code, landingPath = "/signup" } = body;

        if (!partnerId) {
            return NextResponse.json(
                { error: "Partner ID is required" },
                { status: 400 }
            );
        }

        // Verify partner exists
        const partner = await prisma.partner.findUnique({
            where: { id: partnerId },
        });

        if (!partner) {
            return NextResponse.json(
                { error: "Partner not found" },
                { status: 404 }
            );
        }

        // Generate code if not provided
        const finalCode = code || generateReferralCode(partner.name);

        // Check if code already exists
        const existingLink = await prisma.referralLink.findUnique({
            where: { code: finalCode },
        });

        if (existingLink) {
            return NextResponse.json(
                { error: "Referral code already exists" },
                { status: 409 }
            );
        }

        const link = await prisma.referralLink.create({
            data: {
                partnerId,
                code: finalCode,
                landingPath,
            },
            include: {
                partner: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        const baseUrl = process.env.NEXTAUTH_URL || "https://ritmo.app";
        const fullUrl = `${baseUrl}${link.landingPath}?ref=${link.code}`;

        return success({ link: { ...link, fullUrl } }, 201);
    } catch (error) {
        return serverError(error, "POST /api/admin/referral-links");
    }
}

/**
 * Generate a referral code from partner name.
 * Format: lowercase-slug-XXXX (random suffix)
 */
function generateReferralCode(partnerName: string): string {
    const slug = partnerName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "")
        .slice(0, 8);
    const suffix = nanoid(4).toLowerCase();
    return `${slug}${suffix}`;
}
