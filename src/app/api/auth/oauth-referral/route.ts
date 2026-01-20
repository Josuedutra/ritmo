/**
 * POST /api/auth/oauth-referral
 *
 * Called after OAuth signup to process referral attribution.
 * Reads the ritmo_ref cookie and creates attribution for the new organization.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { trackEvent, ProductEventNames } from "@/lib/product-events";
import {
    REFERRAL_COOKIE_NAME,
    REFERRAL_COOKIE_DAYS,
    decodeCookiePayload,
    isReferralCookieValid,
} from "@/app/api/referrals/capture/route";

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !session.user.organizationId) {
            return NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 }
            );
        }

        const { id: userId, organizationId, email } = session.user;

        // Read and parse referral cookie
        const cookieStore = await cookies();
        const referralCookieValue = cookieStore.get(REFERRAL_COOKIE_NAME)?.value;

        if (!referralCookieValue) {
            return NextResponse.json({ attributed: false, reason: "no_cookie" });
        }

        const payload = decodeCookiePayload(referralCookieValue);
        if (!payload) {
            return NextResponse.json({ attributed: false, reason: "invalid_cookie" });
        }

        // Validate attribution window
        if (!isReferralCookieValid(payload)) {
            trackEvent(ProductEventNames.REFERRAL_EXPIRED, {
                organizationId,
                userId,
                props: {
                    code: payload.code,
                    capturedAt: payload.capturedAt,
                    expiredDays: REFERRAL_COOKIE_DAYS,
                },
            });

            // Clear expired cookie
            const response = NextResponse.json({ attributed: false, reason: "expired" });
            response.cookies.delete(REFERRAL_COOKIE_NAME);
            return response;
        }

        // Find the referral link and partner
        const referralLink = await prisma.referralLink.findUnique({
            where: { code: payload.code },
            include: {
                partner: {
                    select: {
                        id: true,
                        name: true,
                        status: true,
                        contactEmail: true,
                    },
                },
            },
        });

        if (!referralLink || referralLink.partner.status !== "ACTIVE") {
            const response = NextResponse.json({ attributed: false, reason: "invalid_link" });
            response.cookies.delete(REFERRAL_COOKIE_NAME);
            return response;
        }

        // Check if org already has an attribution
        const existingAttribution = await prisma.referralAttribution.findUnique({
            where: { organizationId },
        });

        if (existingAttribution) {
            const response = NextResponse.json({
                attributed: true,
                existing: true,
                partnerId: existingAttribution.partnerId,
            });
            response.cookies.delete(REFERRAL_COOKIE_NAME);
            return response;
        }

        // Check for self-referral
        const partnerEmail = referralLink.partner.contactEmail?.toLowerCase();
        const signupEmail = email?.toLowerCase();
        const isSelfReferral = partnerEmail && signupEmail && partnerEmail === signupEmail;

        if (isSelfReferral) {
            // Create DISQUALIFIED attribution
            await prisma.referralAttribution.create({
                data: {
                    partnerId: referralLink.partnerId,
                    referralLinkId: referralLink.id,
                    organizationId,
                    invitedUserId: userId,
                    status: "DISQUALIFIED",
                    signupAt: new Date(),
                },
            });

            trackEvent(ProductEventNames.REFERRAL_DISQUALIFIED, {
                organizationId,
                userId,
                props: {
                    reason: "self_referral",
                    partnerId: referralLink.partnerId,
                    code: payload.code,
                    provider: "google",
                },
            });

            const response = NextResponse.json({
                attributed: true,
                status: "DISQUALIFIED",
                reason: "self_referral",
            });
            response.cookies.delete(REFERRAL_COOKIE_NAME);
            return response;
        }

        // Create valid attribution
        await prisma.referralAttribution.create({
            data: {
                partnerId: referralLink.partnerId,
                referralLinkId: referralLink.id,
                organizationId,
                invitedUserId: userId,
                status: "SIGNED_UP",
                signupAt: new Date(),
            },
        });

        trackEvent(ProductEventNames.REFERRAL_ATTRIBUTED, {
            organizationId,
            userId,
            props: {
                partnerId: referralLink.partnerId,
                partnerName: referralLink.partner.name,
                code: payload.code,
                capturedAt: payload.capturedAt,
                provider: "google",
            },
        });

        const response = NextResponse.json({
            attributed: true,
            status: "SIGNED_UP",
            partnerId: referralLink.partnerId,
            partnerName: referralLink.partner.name,
        });
        response.cookies.delete(REFERRAL_COOKIE_NAME);
        return response;
    } catch (error) {
        console.error("[OAuth Referral] Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
