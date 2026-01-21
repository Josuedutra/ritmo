import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { TRIAL_LIMIT, TRIAL_DURATION_DAYS, PLAN_LIMITS } from "@/lib/entitlements";
import { trackEvent, ProductEventNames } from "@/lib/product-events";
import {
    REFERRAL_COOKIE_NAME,
    REFERRAL_COOKIE_DAYS,
    decodeCookiePayload,
    isReferralCookieValid,
} from "@/app/api/referrals/capture/route";
import {
    rateLimit,
    getClientIp,
    RateLimitConfigs,
    rateLimitedResponse,
} from "@/lib/security/rate-limit";

/**
 * POST /api/auth/signup
 * Creates a new user and organization with trial defaults.
 * Also handles referral attribution if ritmo_ref cookie is present and valid.
 *
 * Hardening (P0-lite):
 * - Validates cookie expiry (30 days from capture)
 * - Blocks self-referral (partner.contactEmail === signup email)
 * - Creates DISQUALIFIED attribution for blocked referrals
 *
 * Security (P0 Security Hardening):
 * - Rate limited: 10 requests per 10 minutes per IP
 */
export async function POST(request: NextRequest) {
    // P0 Security: Rate limiting
    const ip = getClientIp(request);
    const rateLimitResult = await rateLimit({
        key: `signup:${ip}`,
        ...RateLimitConfigs.signup,
    });

    if (!rateLimitResult.allowed) {
        return rateLimitedResponse(rateLimitResult.retryAfterSec);
    }

    try {
        const body = await request.json();
        const { email, password, name, companyName } = body;

        // Read and parse referral cookie
        const cookieStore = await cookies();
        const referralCookieValue = cookieStore.get(REFERRAL_COOKIE_NAME)?.value;
        const referralPayload = referralCookieValue ? decodeCookiePayload(referralCookieValue) : null;

        // Validation
        if (!email || !password) {
            return NextResponse.json(
                { error: "Email e password são obrigatórios" },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: "Password deve ter pelo menos 6 caracteres" },
                { status: 400 }
            );
        }

        // Check if email already exists
        const existingUser = await prisma.user.findFirst({
            where: { email: email.toLowerCase() },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "Este email já está registado" },
                { status: 409 }
            );
        }

        // Generate unique slug from company name or email
        const baseSlug = (companyName || email.split("@")[0])
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");

        let slug = baseSlug;
        let counter = 1;
        while (await prisma.organization.findUnique({ where: { slug } })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        // Calculate trial end date
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DURATION_DAYS);

        // Create organization and user in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create organization with trial defaults
            // P0-MC-01: Trial gets Starter-level storage quota (5 GB)
            const organization = await tx.organization.create({
                data: {
                    name: companyName || `Empresa de ${name || email.split("@")[0]}`,
                    slug,
                    // Trial defaults (B requirement)
                    trialEndsAt,
                    trialSentLimit: TRIAL_LIMIT,
                    trialSentUsed: 0,
                    autoEmailEnabled: true,
                    bccInboundEnabled: true,
                    // P0-MC-01: Explicit storage quota for trial (Starter-level)
                    storageQuotaBytes: BigInt(PLAN_LIMITS.starter.storageQuotaBytes),
                    storageUsedBytes: BigInt(0),
                    // Onboarding not completed
                    onboardingCompleted: false,
                    onboardingState: {
                        templates: false,
                        smtp: false,
                        bcc: false,
                        firstQuote: false,
                    },
                },
            });

            // Create admin user
            // TODO: Use bcrypt for password hashing in production
            const user = await tx.user.create({
                data: {
                    email: email.toLowerCase(),
                    name: name || null,
                    passwordHash: password, // Plain text for dev - TODO: bcrypt
                    role: "admin",
                    organizationId: organization.id,
                },
            });

            return { organization, user };
        });

        // Track signup event (non-blocking)
        trackEvent(ProductEventNames.SIGNUP_COMPLETED, {
            organizationId: result.organization.id,
            userId: result.user.id,
            props: {
                hasCompanyName: !!companyName,
                trialDays: TRIAL_DURATION_DAYS,
                hasReferral: !!referralPayload,
            },
        });

        // Handle referral attribution (non-blocking)
        let referralAttribution = null;
        if (referralPayload) {
            try {
                referralAttribution = await handleReferralAttribution(
                    referralPayload,
                    email.toLowerCase(),
                    result.organization.id,
                    result.user.id
                );
            } catch (error) {
                // Log but don't fail signup
                console.error("[Signup] Referral attribution error:", error);
            }
        }

        // Create response
        const response = NextResponse.json({
            success: true,
            user: {
                id: result.user.id,
                email: result.user.email,
                name: result.user.name,
            },
            organization: {
                id: result.organization.id,
                name: result.organization.name,
                trialEndsAt: result.organization.trialEndsAt,
            },
            referral: referralAttribution ? {
                partnerId: referralAttribution.partnerId,
                partnerName: referralAttribution.partnerName,
                status: referralAttribution.status,
            } : null,
        });

        // Clear referral cookie after processing (regardless of outcome)
        if (referralPayload) {
            response.cookies.delete(REFERRAL_COOKIE_NAME);
        }

        return response;
    } catch (error) {
        console.error("[Signup] Error:", error);
        return NextResponse.json(
            { error: "Ocorreu um erro ao criar a conta" },
            { status: 500 }
        );
    }
}

/**
 * Handle referral attribution for a new organization.
 * Creates ReferralAttribution record linking org to partner.
 *
 * P0-lite Hardening:
 * - Validates cookie expiry (30 days from capture)
 * - Blocks self-referral (partner.contactEmail === signup email)
 * - Creates DISQUALIFIED attribution for blocked referrals
 */
async function handleReferralAttribution(
    payload: { code: string; capturedAt: string },
    signupEmail: string,
    organizationId: string,
    userId: string
): Promise<{ partnerId: string; partnerName: string; status: string } | null> {
    // =========================================================================
    // 1. Validate attribution window (30 days)
    // =========================================================================
    if (!isReferralCookieValid(payload)) {
        // Cookie expired - track and skip
        trackEvent(ProductEventNames.REFERRAL_EXPIRED, {
            organizationId,
            userId,
            props: {
                code: payload.code,
                capturedAt: payload.capturedAt,
                expiredDays: REFERRAL_COOKIE_DAYS,
            },
        });
        console.log(`[Signup] Referral cookie expired: ${payload.code}`);
        return null;
    }

    // =========================================================================
    // 2. Find the referral link and partner
    // =========================================================================
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
        return null;
    }

    // =========================================================================
    // 3. Check for self-referral (anti-abuse)
    // =========================================================================
    const partnerEmail = referralLink.partner.contactEmail?.toLowerCase();
    const isSelfReferral = partnerEmail && partnerEmail === signupEmail;

    if (isSelfReferral) {
        // Create DISQUALIFIED attribution for audit trail
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

        // Track disqualification event
        trackEvent(ProductEventNames.REFERRAL_DISQUALIFIED, {
            organizationId,
            userId,
            props: {
                reason: "self_referral",
                partnerId: referralLink.partnerId,
                partnerName: referralLink.partner.name,
                code: payload.code,
            },
        });

        console.log(`[Signup] Self-referral blocked: ${signupEmail} is partner contact`);

        return {
            partnerId: referralLink.partnerId,
            partnerName: referralLink.partner.name,
            status: "DISQUALIFIED",
        };
    }

    // =========================================================================
    // 4. Check if org already has an attribution (shouldn't happen, but be safe)
    // =========================================================================
    const existingAttribution = await prisma.referralAttribution.findUnique({
        where: { organizationId },
    });

    if (existingAttribution) {
        // Already attributed, return existing
        return {
            partnerId: existingAttribution.partnerId,
            partnerName: referralLink.partner.name,
            status: existingAttribution.status,
        };
    }

    // =========================================================================
    // 5. Create new valid attribution
    // =========================================================================
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

    // Track attribution event
    trackEvent(ProductEventNames.REFERRAL_ATTRIBUTED, {
        organizationId,
        userId,
        props: {
            partnerId: referralLink.partnerId,
            partnerName: referralLink.partner.name,
            code: payload.code,
            capturedAt: payload.capturedAt,
        },
    });

    return {
        partnerId: referralLink.partnerId,
        partnerName: referralLink.partner.name,
        status: "SIGNED_UP",
    };
}
