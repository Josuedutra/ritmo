import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getApiSession, unauthorized, badRequest, serverError } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { createCheckoutSession, getPlanById, isPlanPublic } from "@/lib/stripe";
import { logger } from "@/lib/logger";

// Allow hidden plans checkout only if this env var is set (for admin/internal use)
const ALLOW_HIDDEN_PLANS_CHECKOUT = process.env.ALLOW_HIDDEN_PLANS_CHECKOUT === "true";

const checkoutSchema = z.object({
    planKey: z.string().min(1, "Plan key is required"),
});

/**
 * POST /api/billing/checkout
 *
 * Creates a Stripe Checkout session for a subscription plan.
 * Requires admin role.
 */
export async function POST(request: NextRequest) {
    const log = logger.child({ endpoint: "billing/checkout" });

    try {
        const session = await getApiSession();
        if (!session) {
            return unauthorized();
        }

        // Check admin role
        if (session.user.role !== "admin") {
            log.warn(
                { userId: session.user.id },
                "Non-admin attempted to create checkout session"
            );
            return NextResponse.json(
                { error: "Apenas administradores podem alterar o plano" },
                { status: 403 }
            );
        }

        // Parse and validate request body
        const body = await request.json();
        const parsed = checkoutSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(parsed.error.errors[0].message);
        }

        const { planKey } = parsed.data;

        // Validate plan exists and has a Stripe price
        const plan = await getPlanById(planKey);

        if (!plan) {
            log.warn({ planKey }, "Invalid plan key requested");
            return badRequest(`Plano inválido: ${planKey}`);
        }

        if (!plan.stripePriceId) {
            log.warn({ planKey }, "Plan has no Stripe price configured");
            return badRequest(`Plano "${plan.name}" não disponível para subscrição`);
        }

        // Check if plan is active in DB
        const dbPlan = await prisma.plan.findUnique({
            where: { id: planKey },
        });

        if (dbPlan && !dbPlan.isActive) {
            log.warn({ planKey }, "Plan is not active");
            return badRequest(`Plano "${plan.name}" não está disponível`);
        }

        // Block checkout for hidden plans (pro_plus, enterprise) unless env override is set
        const planIsPublic = await isPlanPublic(planKey);
        if (!planIsPublic && !ALLOW_HIDDEN_PLANS_CHECKOUT) {
            log.warn({ planKey }, "Attempted checkout for hidden plan");
            return NextResponse.json(
                {
                    error: "PLAN_NOT_PUBLIC",
                    message: `O plano "${plan.name}" não está disponível para subscrição pública. Contacte-nos para mais informações.`,
                },
                { status: 400 }
            );
        }

        // Build success and cancel URLs
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        const successUrl = `${baseUrl}/settings/billing?success=true&session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${baseUrl}/settings/billing?canceled=true`;

        const result = await createCheckoutSession(
            session.user.organizationId,
            planKey,
            successUrl,
            cancelUrl
        );

        if (result.error) {
            log.error(
                {
                    error: result.error,
                    organizationId: session.user.organizationId,
                    planKey,
                },
                "Failed to create checkout session"
            );

            if (result.error === "Stripe not configured") {
                return NextResponse.json(
                    { error: "Sistema de pagamentos não configurado" },
                    { status: 503 }
                );
            }

            return NextResponse.json(
                { error: "Erro ao criar sessão de checkout" },
                { status: 500 }
            );
        }

        log.info(
            { organizationId: session.user.organizationId, planKey },
            "Checkout session created"
        );

        return NextResponse.json({
            url: result.url,
            planName: plan.name,
            priceMonthly: plan.priceMonthly,
        });
    } catch (error) {
        return serverError(error, "POST /api/billing/checkout");
    }
}
