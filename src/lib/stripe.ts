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

/**
 * FALLBACK plan definitions - used ONLY when DB is unavailable.
 * IMPORTANT: Only PUBLIC plans are included here.
 * Hidden plans (pro_plus, enterprise) must ONLY exist in the database.
 * This prevents "phantom plans" appearing when DB is down.
 */
// Seat add-on price ID (Starter only: +€15/mo per extra seat)
export const STRIPE_PRICE_SEAT_ADDON = process.env.STRIPE_PRICE_STARTER_SEAT_ADDON || null;

export const PLANS_FALLBACK = {
    free: {
        id: "free",
        name: "Gratuito",
        quotesLimit: 10,
        maxUsers: 1,
        priceMonthly: 0,
        stripePriceId: null,
        stripePriceIdAnnual: null,
        isPublic: true,
    },
    starter: {
        id: "starter",
        name: "Starter",
        quotesLimit: 80,
        maxUsers: 2,
        priceMonthly: 3900,
        stripePriceId: process.env.STRIPE_PRICE_STARTER || null,
        stripePriceIdAnnual: process.env.STRIPE_PRICE_STARTER_ANNUAL || null,
        isPublic: true,
    },
    pro: {
        id: "pro",
        name: "Pro",
        quotesLimit: 250,
        maxUsers: 5,
        priceMonthly: 9900,
        stripePriceId: process.env.STRIPE_PRICE_PRO || null,
        stripePriceIdAnnual: process.env.STRIPE_PRICE_PRO_ANNUAL || null,
        isPublic: true,
    },
    // NOTE: pro_plus and enterprise are intentionally NOT included here.
    // They must only exist in the database to prevent phantom plan issues.
} as const;

// Legacy alias for backwards compatibility
export const PLANS = PLANS_FALLBACK;

export type PlanId = keyof typeof PLANS_FALLBACK;

/**
 * Get plan from database (primary source of truth).
 * Falls back to PLANS_FALLBACK ONLY for public plans when DB is unavailable.
 * Hidden plans (pro_plus, enterprise) can ONLY come from DB.
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
                stripePriceIdAnnual: plan.stripePriceIdAnnual,
                isPublic: plan.isPublic,
                maxUsers: plan.maxUsers,
            };
        }
        // Plan not found in DB - only allow fallback for public plans
        const fallback = PLANS_FALLBACK[planId as PlanId];
        if (fallback && fallback.isPublic) {
            return fallback;
        }
        // Hidden plan not in DB = doesn't exist
        return null;
    } catch {
        // DB not available, use fallback ONLY for public plans
        const fallback = PLANS_FALLBACK[planId as PlanId];
        if (fallback && fallback.isPublic) {
            return fallback;
        }
        return null;
    }
}

/**
 * Get all active AND public plans from database (for UI display).
 * Hidden plans (pro_plus, enterprise) are excluded.
 * DB is the primary source; fallback only used if DB unavailable.
 */
export async function getActivePlans() {
    try {
        const plans = await prisma.plan.findMany({
            where: {
                isActive: true,
                isPublic: true, // Only public plans
            },
            orderBy: { priceMonthly: "asc" },
        });
        // If DB has plans, always use them
        if (plans.length > 0) {
            return plans.map((plan) => ({
                id: plan.id,
                name: plan.name,
                quotesLimit: plan.monthlyQuoteLimit,
                priceMonthly: plan.priceMonthly,
                stripePriceId: plan.stripePriceId,
                stripePriceIdAnnual: plan.stripePriceIdAnnual,
                isPublic: plan.isPublic,
                maxUsers: plan.maxUsers,
            }));
        }
        // DB empty (unlikely in production) - use fallback public plans
        return Object.values(PLANS_FALLBACK);
    } catch {
        // DB not available, use fallback (only public plans, already filtered)
        return Object.values(PLANS_FALLBACK);
    }
}

/**
 * Get ALL active plans including hidden ones (for admin/internal use).
 * IMPORTANT: This function ONLY returns plans from DB.
 * If DB is unavailable, returns empty array (no fallback for hidden plans).
 * This ensures hidden plans can only exist if properly seeded in DB.
 */
export async function getAllPlansForAdmin(): Promise<{
    plans: Array<{
        id: string;
        name: string;
        quotesLimit: number;
        priceMonthly: number;
        maxUsers: number;
        stripePriceId: string | null;
        stripePriceIdAnnual: string | null;
        isPublic: boolean;
    }>;
    dbAvailable: boolean;
}> {
    try {
        const plans = await prisma.plan.findMany({
            where: { isActive: true },
            orderBy: { priceMonthly: "asc" },
        });
        return {
            plans: plans.map((plan) => ({
                id: plan.id,
                name: plan.name,
                quotesLimit: plan.monthlyQuoteLimit,
                priceMonthly: plan.priceMonthly,
                maxUsers: plan.maxUsers,
                stripePriceId: plan.stripePriceId,
                stripePriceIdAnnual: plan.stripePriceIdAnnual,
                isPublic: plan.isPublic,
            })),
            dbAvailable: true,
        };
    } catch (error) {
        // DB not available - return empty array, no fallback for admin view
        // This prevents phantom hidden plans from appearing
        // Log for visibility (no PII)
        console.error("[DB_UNAVAILABLE_ADMIN_PLANS] Failed to fetch plans from database:",
            error instanceof Error ? error.message : "Unknown error"
        );
        return {
            plans: [],
            dbAvailable: false,
        };
    }
}

/**
 * Check if a plan is publicly available for checkout.
 * Only checks DB - hidden plans must exist in DB to be recognized.
 */
export async function isPlanPublic(planId: string): Promise<boolean> {
    try {
        const plan = await prisma.plan.findUnique({
            where: { id: planId },
            select: { isPublic: true },
        });
        return plan?.isPublic ?? false;
    } catch {
        // Fallback - only public plans in fallback, so check there
        const fallback = PLANS_FALLBACK[planId as PlanId];
        // Only return true if it's a known public fallback plan
        return fallback?.isPublic ?? false;
    }
}

/**
 * Check if a plan exists in the database.
 * Used for validation before admin operations.
 */
export async function planExistsInDb(planId: string): Promise<boolean> {
    try {
        const plan = await prisma.plan.findUnique({
            where: { id: planId },
            select: { id: true },
        });
        return plan !== null;
    } catch {
        return false;
    }
}

/**
 * Create Stripe Checkout session for subscription
 */
export async function createCheckoutSession(
    organizationId: string,
    planId: string,
    successUrl: string,
    cancelUrl: string,
    options?: {
        billingInterval?: "monthly" | "annual";
        extraSeats?: number;
    }
): Promise<{ url: string | null; error?: string }> {
    const plan = await getPlanById(planId);

    if (!plan) {
        return { url: null, error: "Plan not found" };
    }

    const billingInterval = options?.billingInterval ?? "monthly";
    const extraSeats = options?.extraSeats ?? 0;

    // Select price ID based on billing interval
    const priceId = billingInterval === "annual"
        ? plan.stripePriceIdAnnual
        : plan.stripePriceId;

    if (!priceId) {
        if (billingInterval === "annual") {
            return { url: null, error: "ANNUAL_NOT_AVAILABLE" };
        }
        return { url: null, error: "Plan has no Stripe price" };
    }

    const stripe = getStripe();
    if (!stripe) {
        return { url: null, error: "Stripe not configured" };
    }

    try {
        // Build line items: base plan + optional seat add-on
        const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
            {
                price: priceId,
                quantity: 1,
            },
        ];

        // Add seat add-on if extra seats requested (Starter only)
        if (extraSeats > 0 && planId === "starter" && STRIPE_PRICE_SEAT_ADDON) {
            lineItems.push({
                price: STRIPE_PRICE_SEAT_ADDON,
                quantity: extraSeats,
            });
        }

        const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: lineItems,
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                organizationId,
                planId,
                billingInterval,
                extraSeats: String(extraSeats),
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
