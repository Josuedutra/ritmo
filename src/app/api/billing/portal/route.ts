import { NextResponse } from "next/server";
import { getApiSession, unauthorized, serverError } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { createCustomerPortalSession } from "@/lib/stripe";
import { logger } from "@/lib/logger";
import {
    rateLimit,
    RateLimitConfigs,
    rateLimitedResponse,
} from "@/lib/security/rate-limit";

/**
 * POST /api/billing/portal
 *
 * Creates a Stripe Customer Portal session for the organization.
 * Requires admin role.
 *
 * Security (P0 Security Hardening):
 * - Rate limited: 20 requests per 10 minutes per org
 */
export async function POST() {
    const log = logger.child({ endpoint: "billing/portal" });

    try {
        const session = await getApiSession();
        if (!session) {
            return unauthorized();
        }

        // P0 Security: Rate limiting per org
        const rateLimitResult = await rateLimit({
            key: `billing:${session.user.organizationId}`,
            ...RateLimitConfigs.billing,
        });

        if (!rateLimitResult.allowed) {
            log.warn({ orgId: session.user.organizationId }, "Billing portal rate limited");
            return rateLimitedResponse(rateLimitResult.retryAfterSec);
        }

        // Check admin role
        if (session.user.role !== "admin") {
            log.warn(
                { userId: session.user.id },
                "Non-admin attempted to access billing portal"
            );
            return NextResponse.json(
                { error: "Apenas administradores podem gerir a subscrição" },
                { status: 403 }
            );
        }

        // Get organization's subscription
        const subscription = await prisma.subscription.findUnique({
            where: { organizationId: session.user.organizationId },
        });

        if (!subscription?.stripeCustomerId) {
            log.info(
                { organizationId: session.user.organizationId },
                "Organization has no Stripe customer - needs to choose a plan first"
            );
            return NextResponse.json(
                {
                    error: "Nenhuma subscrição ativa",
                    message: "Escolha um plano para começar",
                    action: "choose_plan",
                    redirectUrl: "/settings/billing",
                },
                { status: 400 }
            );
        }

        // Get the return URL from the request origin or use a default
        const returnUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/settings/billing`;

        const result = await createCustomerPortalSession(
            subscription.stripeCustomerId,
            returnUrl
        );

        if (result.error) {
            log.error(
                { error: result.error, organizationId: session.user.organizationId },
                "Failed to create portal session"
            );
            return NextResponse.json(
                { error: "Erro ao criar sessão do portal" },
                { status: 500 }
            );
        }

        log.info(
            { organizationId: session.user.organizationId },
            "Portal session created"
        );

        return NextResponse.json({ url: result.url });
    } catch (error) {
        return serverError(error, "POST /api/billing/portal");
    }
}
