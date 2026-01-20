/**
 * POST /api/referrals/capture
 *
 * Captures a referral code and sets a cookie for attribution.
 * Called from /signup page when ref query param is present.
 *
 * Cookie payload: { code, capturedAt } (base64 encoded JSON)
 * Implements first-touch wins: does not overwrite existing valid cookie.
 *
 * Request body: { code: string }
 * Response: { success: true, partnerId, partnerName } or { success: false, error }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { trackEvent, ProductEventNames } from "@/lib/product-events";

// Cookie configuration
export const REFERRAL_COOKIE_NAME = "ritmo_ref";
export const REFERRAL_COOKIE_DAYS = parseInt(process.env.REFERRAL_COOKIE_DAYS || "30", 10);

// Cookie payload structure
export interface ReferralCookiePayload {
    code: string;
    capturedAt: string; // ISO date string
}

/**
 * Encode cookie payload to base64
 */
function encodeCookiePayload(payload: ReferralCookiePayload): string {
    return Buffer.from(JSON.stringify(payload)).toString("base64");
}

/**
 * Decode cookie payload from base64
 */
export function decodeCookiePayload(encoded: string): ReferralCookiePayload | null {
    try {
        const decoded = Buffer.from(encoded, "base64").toString("utf-8");
        const payload = JSON.parse(decoded);
        if (payload.code && payload.capturedAt) {
            return payload as ReferralCookiePayload;
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Check if cookie payload is still valid (within attribution window)
 */
export function isReferralCookieValid(payload: ReferralCookiePayload): boolean {
    const capturedAt = new Date(payload.capturedAt);
    const now = new Date();
    const daysSinceCapture = (now.getTime() - capturedAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceCapture <= REFERRAL_COOKIE_DAYS;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { code: incomingCode } = body;

        if (!incomingCode || typeof incomingCode !== "string") {
            return NextResponse.json(
                { success: false, error: "Missing or invalid code" },
                { status: 400 }
            );
        }

        // =========================================================================
        // FIRST-TOUCH WINS: Check if valid cookie already exists
        // =========================================================================
        const existingCookieValue = request.cookies.get(REFERRAL_COOKIE_NAME)?.value;
        if (existingCookieValue) {
            const existingPayload = decodeCookiePayload(existingCookieValue);
            if (existingPayload && isReferralCookieValid(existingPayload)) {
                // First-touch wins: do not overwrite existing valid cookie
                trackEvent(ProductEventNames.REFERRAL_COOKIE_REUSED, {
                    props: {
                        existingCode: existingPayload.code,
                        incomingCode,
                    },
                });

                // Return success with existing code info
                const existingLink = await prisma.referralLink.findUnique({
                    where: { code: existingPayload.code },
                    include: {
                        partner: {
                            select: { id: true, name: true },
                        },
                    },
                });

                return NextResponse.json({
                    success: true,
                    reused: true,
                    code: existingPayload.code,
                    partnerId: existingLink?.partnerId,
                    partnerName: existingLink?.partner?.name,
                });
            }
        }

        // =========================================================================
        // Validate referral link exists and partner is active
        // =========================================================================
        const referralLink = await prisma.referralLink.findUnique({
            where: { code: incomingCode },
            include: {
                partner: {
                    select: {
                        id: true,
                        name: true,
                        status: true,
                    },
                },
            },
        });

        if (!referralLink) {
            return NextResponse.json(
                { success: false, error: "Invalid referral code" },
                { status: 404 }
            );
        }

        if (referralLink.partner.status !== "ACTIVE") {
            return NextResponse.json(
                { success: false, error: "Partner is not active" },
                { status: 400 }
            );
        }

        // =========================================================================
        // Track first touch event
        // =========================================================================
        trackEvent(ProductEventNames.REFERRAL_FIRST_TOUCH, {
            props: {
                code: incomingCode,
                partnerId: referralLink.partnerId,
                partnerName: referralLink.partner.name,
            },
        });

        // =========================================================================
        // Create cookie payload with timestamp
        // =========================================================================
        const cookiePayload: ReferralCookiePayload = {
            code: incomingCode,
            capturedAt: new Date().toISOString(),
        };

        const encodedPayload = encodeCookiePayload(cookiePayload);

        // Create response with cookie
        const response = NextResponse.json({
            success: true,
            partnerId: referralLink.partnerId,
            partnerName: referralLink.partner.name,
        });

        // Set httpOnly cookie with referral payload
        const expiresDate = new Date();
        expiresDate.setDate(expiresDate.getDate() + REFERRAL_COOKIE_DAYS);

        response.cookies.set(REFERRAL_COOKIE_NAME, encodedPayload, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            expires: expiresDate,
            path: "/",
        });

        return response;
    } catch (error) {
        console.error("Error capturing referral:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/referrals/capture
 *
 * Check if a referral code is valid (for client-side validation).
 * Query param: ?code=XXX
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get("code");

        if (!code) {
            return NextResponse.json(
                { valid: false, error: "Missing code parameter" },
                { status: 400 }
            );
        }

        const referralLink = await prisma.referralLink.findUnique({
            where: { code },
            include: {
                partner: {
                    select: {
                        id: true,
                        name: true,
                        status: true,
                    },
                },
            },
        });

        if (!referralLink || referralLink.partner.status !== "ACTIVE") {
            return NextResponse.json({ valid: false });
        }

        return NextResponse.json({
            valid: true,
            partnerName: referralLink.partner.name,
        });
    } catch (error) {
        console.error("Error validating referral:", error);
        return NextResponse.json(
            { valid: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
