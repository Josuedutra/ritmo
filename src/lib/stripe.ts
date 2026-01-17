import Stripe from "stripe";

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

// Plan definitions
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
        priceMonthly: 29,
        stripePriceId: process.env.STRIPE_PRICE_STARTER,
    },
    pro: {
        id: "pro",
        name: "Pro",
        quotesLimit: 150,
        priceMonthly: 79,
        stripePriceId: process.env.STRIPE_PRICE_PRO,
    },
    enterprise: {
        id: "enterprise",
        name: "Enterprise",
        quotesLimit: 500,
        priceMonthly: 199,
        stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE,
    },
} as const;

export type PlanId = keyof typeof PLANS;

/**
 * Create Stripe Checkout session
 * 
 * STUB for Sprint 0 - full implementation in Sprint 2
 */
export async function createCheckoutSession(
    organizationId: string,
    planId: PlanId,
    successUrl: string,
    cancelUrl: string
): Promise<{ url: string | null; error?: string }> {
    const plan = PLANS[planId];

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
