/**
 * POST /api/admin/orgs/[orgId]/set-plan
 *
 * Manually set a plan for an organization (admin only).
 * Used for activating hidden plans like pro_plus for early access users.
 *
 * Protected by ADMIN_EMAILS environment variable.
 *
 * Body: { planKey: "pro_plus" | "pro" | "starter" | "free", reason?: string }
 *
 * GUARDRAILS:
 * - Cannot override active Stripe subscriptions (active/trialing/past_due)
 * - Plan must exist in DB (no phantom plans)
 * - Full audit trail with ProductEvent
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
    getApiSession,
    unauthorized,
    badRequest,
    notFound,
    serverError,
    success,
} from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { planExistsInDb } from "@/lib/stripe";

// SUPERADMIN emails from environment
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase());

// Stripe subscription statuses that block manual override
const ACTIVE_STRIPE_STATUSES = ["active", "trialing", "past_due"];

const setPlanSchema = z.object({
    planKey: z.string().min(1, "Plan key is required"),
    reason: z.string().optional().default("manual_early_access"),
});

interface RouteParams {
    params: Promise<{ orgId: string }>;
}

/**
 * Mask email for logging (GDPR-safe)
 */
function maskEmail(email: string): string {
    const [local, domain] = email.split("@");
    if (!domain) return "***@***";
    const maskedLocal = local.length > 2
        ? local[0] + "***" + local[local.length - 1]
        : "***";
    return `${maskedLocal}@${domain}`;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    const log = logger.child({ endpoint: "admin/orgs/[orgId]/set-plan" });

    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        // Check if user is SUPERADMIN
        const userEmail = session.user.email?.toLowerCase() || "";
        if (!userEmail || !ADMIN_EMAILS.includes(userEmail)) {
            log.warn({ userEmail: maskEmail(userEmail) }, "Non-admin attempted to set plan");
            return unauthorized();
        }

        const { orgId } = await params;

        // Parse and validate body
        const body = await request.json();
        const parsed = setPlanSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(parsed.error.errors[0].message);
        }

        const { planKey, reason } = parsed.data;

        // GUARDRAIL 1: Check plan exists in DB (no phantom plans)
        const planExists = await planExistsInDb(planKey);
        if (!planExists) {
            log.warn({ planKey, orgId }, "Attempted to set non-existent plan");
            return NextResponse.json(
                {
                    error: "PLAN_NOT_FOUND",
                    message: `O plano "${planKey}" não existe na base de dados.`,
                },
                { status: 404 }
            );
        }

        // Get plan details from DB
        const plan = await prisma.plan.findUnique({
            where: { id: planKey },
        });

        if (!plan) {
            return notFound("Plano");
        }

        // Check organization exists with subscription
        const organization = await prisma.organization.findUnique({
            where: { id: orgId },
            include: {
                subscription: {
                    include: { plan: true },
                },
            },
        });

        if (!organization) {
            return notFound("Organização");
        }

        const subscription = organization.subscription;

        // GUARDRAIL 2: Block override if active Stripe subscription exists
        if (subscription?.stripeSubscriptionId) {
            const status = subscription.status;
            if (ACTIVE_STRIPE_STATUSES.includes(status)) {
                log.warn(
                    {
                        orgId,
                        stripeStatus: status,
                        stripeSubscriptionId: subscription.stripeSubscriptionId,
                    },
                    "Blocked manual override due to active Stripe subscription"
                );
                return NextResponse.json(
                    {
                        error: "CANNOT_OVERRIDE_STRIPE_SUBSCRIPTION",
                        message: "Esta organização tem uma subscrição ativa no Stripe. Use o Customer Portal para mudar o plano.",
                        action: "open_portal",
                        redirectUrl: "/settings/billing",
                        currentStatus: status,
                    },
                    { status: 409 }
                );
            }
        }

        // Get current plan for audit
        const fromPlanKey = subscription?.planId || "none";
        const fromPlanId = subscription?.plan?.id || null;

        // Upsert subscription with new plan
        await prisma.subscription.upsert({
            where: { organizationId: orgId },
            update: {
                planId: planKey,
                quotesLimit: plan.monthlyQuoteLimit,
                status: "active",
                // Clear Stripe references for manual activation
                // (keeps stripeCustomerId if exists for future use)
            },
            create: {
                organizationId: orgId,
                planId: planKey,
                quotesLimit: plan.monthlyQuoteLimit,
                status: "active",
            },
        });

        // Enable features based on plan tier
        const isPaidPlan = ["starter", "pro", "pro_plus", "enterprise"].includes(planKey);

        await prisma.organization.update({
            where: { id: orgId },
            data: {
                autoEmailEnabled: isPaidPlan,
                bccInboundEnabled: isPaidPlan,
            },
        });

        // AUDIT TRAIL: Create comprehensive ProductEvent
        const timestampISO = new Date().toISOString();
        await prisma.productEvent.create({
            data: {
                organizationId: orgId,
                userId: session.user.id,
                name: "admin_plan_changed",
                props: {
                    // Plan change details
                    fromPlanKey,
                    toPlanKey: planKey,
                    fromPlanId,
                    toPlanId: plan.id,
                    // Who made the change
                    changedByUserId: session.user.id,
                    changedByEmail: maskEmail(userEmail), // Masked for GDPR
                    // Metadata
                    timestampISO,
                    reason,
                    // Plan details
                    newPlanName: plan.name,
                    newQuotesLimit: plan.monthlyQuoteLimit,
                    newMaxUsers: plan.maxUsers,
                    newIsPublic: plan.isPublic,
                },
            },
        });

        // Server-side log (masked for GDPR)
        log.info(
            {
                orgId,
                fromPlanKey,
                toPlanKey: planKey,
                adminEmail: maskEmail(userEmail),
                reason,
                timestampISO,
            },
            "Admin changed organization plan"
        );

        return success({
            organizationId: orgId,
            previousPlan: fromPlanKey,
            newPlan: planKey,
            planName: plan.name,
            quotesLimit: plan.monthlyQuoteLimit,
            maxUsers: plan.maxUsers,
            isPublic: plan.isPublic,
            reason,
            message: `Plano alterado de ${fromPlanKey} para ${planKey}`,
        });
    } catch (error) {
        return serverError(error, "POST /api/admin/orgs/[orgId]/set-plan");
    }
}
