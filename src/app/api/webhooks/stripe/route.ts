import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

/**
 * POST /api/webhooks/stripe
 *
 * Stripe webhook for subscription events.
 * Implements idempotency via stripe_events table.
 */
export async function POST(request: NextRequest) {
    const log = logger.child({ endpoint: "webhooks/stripe" });

    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
        log.warn("STRIPE_SECRET_KEY not configured - webhook disabled");
        return NextResponse.json(
            { error: "Stripe not configured" },
            { status: 501 }
        );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2025-02-24.acacia",
    });

    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
        log.warn("Missing Stripe signature");
        return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    if (!endpointSecret) {
        log.error("STRIPE_WEBHOOK_SECRET not configured");
        return NextResponse.json(
            { error: "Server configuration error" },
            { status: 500 }
        );
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        log.error({ error: message }, "Webhook signature verification failed");
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    log.info(
        { eventType: event.type, eventId: event.id },
        "Stripe event received"
    );

    // =========================================================================
    // IDEMPOTENCY CHECK
    // =========================================================================
    const existingEvent = await prisma.stripeEvent.findUnique({
        where: { stripeEventId: event.id },
    });

    if (existingEvent) {
        log.info(
            { eventId: event.id },
            "Event already processed - skipping (idempotent)"
        );
        return NextResponse.json({ received: true, duplicate: true });
    }

    // =========================================================================
    // EVENT HANDLERS
    // =========================================================================
    try {
        switch (event.type) {
            case "checkout.session.completed":
                await handleCheckoutCompleted(
                    event.data.object as Stripe.Checkout.Session,
                    log
                );
                break;

            case "customer.subscription.created":
                await handleSubscriptionCreated(
                    event.data.object as Stripe.Subscription,
                    log
                );
                break;

            case "customer.subscription.updated":
                await handleSubscriptionUpdated(
                    event.data.object as Stripe.Subscription,
                    log
                );
                break;

            case "customer.subscription.deleted":
                await handleSubscriptionDeleted(
                    event.data.object as Stripe.Subscription,
                    log
                );
                break;

            case "invoice.payment_succeeded":
                await handleInvoicePaymentSucceeded(
                    event.data.object as Stripe.Invoice,
                    log
                );
                break;

            case "invoice.payment_failed":
                await handleInvoicePaymentFailed(
                    event.data.object as Stripe.Invoice,
                    log
                );
                break;

            default:
                log.debug({ eventType: event.type }, "Unhandled event type");
        }

        // Record event as processed (idempotency)
        await prisma.stripeEvent.create({
            data: {
                stripeEventId: event.id,
                eventType: event.type,
                payload: {
                    // Store only non-PII data for debugging
                    livemode: event.livemode,
                    created: event.created,
                },
            },
        });

        return NextResponse.json({ received: true });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        log.error({ error: message, eventId: event.id }, "Error processing webhook");
        return NextResponse.json({ error: "Processing error" }, { status: 500 });
    }
}

// =============================================================================
// HANDLER: checkout.session.completed
// =============================================================================
async function handleCheckoutCompleted(
    session: Stripe.Checkout.Session,
    log: ReturnType<typeof logger.child>
) {
    const { organizationId, planId } = session.metadata || {};

    if (!organizationId) {
        log.warn(
            { sessionId: session.id },
            "Checkout session missing organizationId in metadata"
        );
        return;
    }

    const stripeCustomerId = session.customer as string;
    const stripeSubscriptionId = session.subscription as string;

    if (!stripeCustomerId || !stripeSubscriptionId) {
        log.warn(
            { sessionId: session.id },
            "Checkout session missing customer or subscription"
        );
        return;
    }

    // Get plan from DB or fallback to starter
    const plan = await prisma.plan.findUnique({
        where: { id: planId || "starter" },
    });

    const quotesLimit = plan?.monthlyQuoteLimit || 50;
    const finalPlanId = plan?.id || "starter";

    // Upsert subscription by organizationId
    await prisma.subscription.upsert({
        where: { organizationId },
        update: {
            stripeCustomerId,
            stripeSubscriptionId,
            planId: finalPlanId,
            quotesLimit,
            status: "active",
        },
        create: {
            organizationId,
            stripeCustomerId,
            stripeSubscriptionId,
            planId: finalPlanId,
            quotesLimit,
            status: "active",
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
    });

    log.info(
        { organizationId, planId: finalPlanId },
        "Subscription created from checkout"
    );
}

// =============================================================================
// HANDLER: customer.subscription.created
// =============================================================================
async function handleSubscriptionCreated(
    subscription: Stripe.Subscription,
    log: ReturnType<typeof logger.child>
) {
    // Find organization by stripeCustomerId
    const existingSubscription = await prisma.subscription.findFirst({
        where: { stripeCustomerId: subscription.customer as string },
    });

    if (!existingSubscription) {
        log.warn(
            { stripeCustomerId: subscription.customer },
            "No organization found for customer - may be created via checkout"
        );
        return;
    }

    // Extract plan from subscription items
    const planId = await getPlanIdFromSubscription(subscription);
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    const quotesLimit = plan?.monthlyQuoteLimit || 50;

    await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
            stripeSubscriptionId: subscription.id,
            planId,
            quotesLimit,
            status: mapStripeStatus(subscription.status),
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
    });

    log.info(
        { organizationId: existingSubscription.organizationId, planId },
        "Subscription created event processed"
    );
}

// =============================================================================
// HANDLER: customer.subscription.updated
// =============================================================================
async function handleSubscriptionUpdated(
    subscription: Stripe.Subscription,
    log: ReturnType<typeof logger.child>
) {
    // Find subscription by stripeSubscriptionId
    let existingSubscription = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId: subscription.id },
    });

    // Try finding by customer ID as fallback
    if (!existingSubscription) {
        existingSubscription = await prisma.subscription.findFirst({
            where: { stripeCustomerId: subscription.customer as string },
        });
    }

    if (!existingSubscription) {
        log.warn(
            { stripeSubscriptionId: subscription.id },
            "No subscription found for update"
        );
        return;
    }

    const planId = await getPlanIdFromSubscription(subscription);
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    const quotesLimit = plan?.monthlyQuoteLimit || 50;

    await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
            stripeSubscriptionId: subscription.id,
            planId,
            quotesLimit,
            status: mapStripeStatus(subscription.status),
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
    });

    log.info(
        {
            organizationId: existingSubscription.organizationId,
            planId,
            status: subscription.status,
        },
        "Subscription updated"
    );
}

// =============================================================================
// HANDLER: customer.subscription.deleted
// =============================================================================
async function handleSubscriptionDeleted(
    subscription: Stripe.Subscription,
    log: ReturnType<typeof logger.child>
) {
    const existingSubscription = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId: subscription.id },
    });

    if (!existingSubscription) {
        log.warn(
            { stripeSubscriptionId: subscription.id },
            "No subscription found for deletion"
        );
        return;
    }

    // Get free plan limits
    const freePlan = await prisma.plan.findUnique({ where: { id: "free" } });
    const quotesLimit = freePlan?.monthlyQuoteLimit || 10;

    // Downgrade to free plan instead of deleting
    await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
            planId: "free",
            quotesLimit,
            status: "cancelled",
            stripeSubscriptionId: null, // Clear the subscription ID
            cancelAtPeriodEnd: false,
        },
    });

    log.info(
        { organizationId: existingSubscription.organizationId },
        "Subscription cancelled - downgraded to free"
    );
}

// =============================================================================
// HANDLER: invoice.payment_succeeded
// =============================================================================
async function handleInvoicePaymentSucceeded(
    invoice: Stripe.Invoice,
    log: ReturnType<typeof logger.child>
) {
    if (!invoice.subscription) {
        log.debug("Invoice not related to subscription - skipping");
        return;
    }

    const existingSubscription = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId: invoice.subscription as string },
    });

    if (!existingSubscription) {
        log.warn(
            { stripeSubscriptionId: invoice.subscription },
            "No subscription found for invoice"
        );
        return;
    }

    // Ensure status is active after successful payment
    if (existingSubscription.status !== "active") {
        await prisma.subscription.update({
            where: { id: existingSubscription.id },
            data: { status: "active" },
        });

        log.info(
            { organizationId: existingSubscription.organizationId },
            "Subscription reactivated after payment"
        );
    }
}

// =============================================================================
// HANDLER: invoice.payment_failed
// =============================================================================
async function handleInvoicePaymentFailed(
    invoice: Stripe.Invoice,
    log: ReturnType<typeof logger.child>
) {
    if (!invoice.subscription) {
        log.debug("Invoice not related to subscription - skipping");
        return;
    }

    const existingSubscription = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId: invoice.subscription as string },
    });

    if (!existingSubscription) {
        log.warn(
            { stripeSubscriptionId: invoice.subscription },
            "No subscription found for failed invoice"
        );
        return;
    }

    // Mark as past_due
    await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: { status: "past_due" },
    });

    log.info(
        { organizationId: existingSubscription.organizationId },
        "Subscription marked as past_due due to payment failure"
    );
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Map Stripe subscription status to our SubscriptionStatus enum
 */
function mapStripeStatus(
    stripeStatus: Stripe.Subscription.Status
): "active" | "past_due" | "cancelled" | "trialing" {
    switch (stripeStatus) {
        case "active":
            return "active";
        case "past_due":
            return "past_due";
        case "canceled":
        case "unpaid":
        case "incomplete_expired":
            return "cancelled";
        case "trialing":
            return "trialing";
        case "incomplete":
        case "paused":
        default:
            return "active"; // Default to active for edge cases
    }
}

/**
 * Extract plan ID from Stripe subscription items
 * Matches price ID to our plan definitions in DB
 */
async function getPlanIdFromSubscription(
    subscription: Stripe.Subscription
): Promise<string> {
    const priceId = subscription.items.data[0]?.price?.id;

    if (!priceId) {
        return "free";
    }

    // Find plan by stripe_price_id
    const plan = await prisma.plan.findFirst({
        where: { stripePriceId: priceId },
    });

    if (plan) {
        return plan.id;
    }

    // Default to starter if no match found
    return "starter";
}
