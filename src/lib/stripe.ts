import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

// Lazy initialization to avoid build errors when STRIPE_SECRET_KEY is not set
let _stripe: Stripe | null = null;

function getStripe(): Stripe | null {
    if (!process.env.STRIPE_SECRET_KEY) {
        return null;
    }
    if (!_stripe) {
        _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
            apiVersion: "2025-02-24.acacia",
            typescript: true,
        });
    }
    return _stripe;
}

// Fallback plan definitions (used when DB is not available)
export const PLANS = {
    free: {
        id: "free",
        name: "Gratuito",
        quotesLimit: 10,
        priceMonthly: 0,
        stripePriceId: null,
    },
    starter: {
        id: "starter",
        name: "Starter",
        quotesLimit: 50,
        priceMonthly: 2900,
        stripePriceId: process.env.STRIPE_PRICE_STARTER,
    },
    pro: {
        id: "pro",
        name: "Pro",
        quotesLimit: 150,
        priceMonthly: 7900,
        stripePriceId: process.env.STRIPE_PRICE_PRO,
    },
    enterprise: {
        id: "enterprise",
        name: "Enterprise",
        quotesLimit: 500,
        priceMonthly: 19900,
        stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE,
    },
} as const;

export type PlanId = keyof typeof PLANS;

/**
 * Get plan from database, with fallback to hardcoded PLANS
 */
export async function getPlanById(planId: string) {
    try {
        const plan = await prisma.plan.findUnique({
            where: { id: planId },
        });
        if (plan) {
            return {
                id: plan.id,
                name: plan.name,
                quotesLimit: plan.monthlyQuoteLimit,
                priceMonthly: plan.priceMonthly,
                stripePriceId: plan.stripePriceId,
            };
        }
    } catch {
        // DB not available, use fallback
    }
    return PLANS[planId as PlanId] || PLANS.free;
}

/**
 * Get all active plans from database
 */
export async function getActivePlans() {
    try {
        const plans = await prisma.plan.findMany({
            where: { isActive: true },
            orderBy: { priceMonthly: "asc" },
        });
        return plans.map((plan) => ({
            id: plan.id,
            name: plan.name,
            quotesLimit: plan.monthlyQuoteLimit,
            priceMonthly: plan.priceMonthly,
            stripePriceId: plan.stripePriceId,
        }));
    } catch {
        // DB not available, use fallback
        return Object.values(PLANS);
    }
}

/**
 * Create Stripe Checkout session for subscription
 */
export async function createCheckoutSession(
    organizationId: string,
    planId: string,
    successUrl: string,
    cancelUrl: string
): Promise<{ url: string | null; error?: string }> {
    const plan = await getPlanById(planId);

    if (!plan.stripePriceId) {
        return { url: null, error: "Plan has no Stripe price" };
    }

    const stripe = getStripe();
    if (!stripe) {
        return { url: null, error: "Stripe not configured" };
    }

    try {
        const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: [
                {
                    price: plan.stripePriceId,
                    quantity: 1,
                },
            ],
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                organizationId,
                planId,
            },
        });

        return { url: session.url };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return { url: null, error: message };
    }
}

/**
 * Create Stripe Customer Portal session for managing subscription
 */
export async function createCustomerPortalSession(
    stripeCustomerId: string,
    returnUrl: string
): Promise<{ url: string | null; error?: string }> {
    const stripe = getStripe();
    if (!stripe) {
        return { url: null, error: "Stripe not configured" };
    }

    try {
        const session = await stripe.billingPortal.sessions.create({
            customer: stripeCustomerId,
            return_url: returnUrl,
        });

        return { url: session.url };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return { url: null, error: message };
    }
}
