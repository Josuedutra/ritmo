import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getApiSession, unauthorized } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// Lazy initialization to avoid build errors when STRIPE_SECRET_KEY is not set
let _stripe: Stripe | null = null;

function getStripe(): Stripe | null {
    if (!process.env.STRIPE_SECRET_KEY) {
        return null;
    }
    if (!_stripe) {
        _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
            apiVersion: "2025-02-24.acacia",
        });
    }
    return _stripe;
}

/**
 * GET /api/billing/verify?session_id=cs_xxx
 *
 * Verifies a Stripe checkout session and returns subscription details.
 * Used by /billing/success page to confirm payment.
 */
export async function GET(request: NextRequest) {
    const log = logger.child({ endpoint: "billing/verify" });

    try {
        const session = await getApiSession();
        if (!session) {
            return unauthorized();
        }

        const sessionId = request.nextUrl.searchParams.get("session_id");
        if (!sessionId) {
            return NextResponse.json(
                { success: false, message: "session_id é obrigatório" },
                { status: 400 }
            );
        }

        const stripe = getStripe();
        if (!stripe) {
            log.error("Stripe not configured");
            return NextResponse.json(
                { success: false, message: "Stripe não configurado" },
                { status: 500 }
            );
        }

        // Retrieve checkout session from Stripe
        const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ["subscription", "subscription.plan.product"],
        });

        // Verify the session belongs to this organization
        const organizationId = session.user.organizationId;
        const subscription = await prisma.subscription.findUnique({
            where: { organizationId },
            include: { plan: true },
        });

        if (!subscription) {
            log.warn({ organizationId, sessionId }, "No subscription found after checkout");
            return NextResponse.json({
                success: false,
                message: "Subscrição não encontrada. Pode demorar alguns segundos a processar.",
            });
        }

        // Format the response
        const stripeSubscription = checkoutSession.subscription as Stripe.Subscription | null;
        const nextBillingDate = stripeSubscription?.current_period_end
            ? new Date(stripeSubscription.current_period_end * 1000).toLocaleDateString("pt-PT", {
                day: "numeric",
                month: "long",
                year: "numeric",
            })
            : null;

        const isAnnual = subscription.billingInterval === "annual";
        const priceFormatted = subscription.plan
            ? isAnnual
                ? `€${Math.round((subscription.plan.priceMonthly * 10) / 12) / 10}/mês (anual)`
                : `€${subscription.plan.priceMonthly / 100}/mês`
            : "—";

        return NextResponse.json({
            success: true,
            planName: subscription.plan?.name || "Plano ativo",
            priceFormatted,
            nextBillingDate,
            status: subscription.status,
            billingInterval: subscription.billingInterval,
            extraSeats: subscription.extraSeats,
        });
    } catch (error) {
        log.error({ error }, "Error verifying checkout session");
        return NextResponse.json(
            { success: false, message: "Erro ao verificar sessão" },
            { status: 500 }
        );
    }
}
