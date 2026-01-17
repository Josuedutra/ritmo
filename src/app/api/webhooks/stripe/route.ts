import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

/**
 * POST /api/webhooks/stripe
 * 
 * Stripe webhook for subscription events.
 */
export async function POST(request: NextRequest) {
    const log = logger.child({ endpoint: "webhooks/stripe" });

    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
        log.warn("STRIPE_SECRET_KEY not configured - webhook disabled");
        return NextResponse.json({ error: "Stripe not configured" }, { status: 501 });
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
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        log.error({ error: message }, "Webhook signature verification failed");
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    log.info({ eventType: event.type, eventId: event.id }, "Stripe event received");

    // =========================================================================
    // STUB: Sprint 2 will implement handlers for:
    // - checkout.session.completed → create/update subscription
    // - invoice.paid → update subscription status
    // - invoice.payment_failed → mark past_due
    // - customer.subscription.updated → sync plan changes
    // - customer.subscription.deleted → mark cancelled
    // =========================================================================

    switch (event.type) {
        case "checkout.session.completed":
            log.info("TODO: Handle checkout.session.completed");
            break;
        case "invoice.paid":
            log.info("TODO: Handle invoice.paid");
            break;
        case "invoice.payment_failed":
            log.info("TODO: Handle invoice.payment_failed");
            break;
        case "customer.subscription.updated":
            log.info("TODO: Handle customer.subscription.updated");
            break;
        case "customer.subscription.deleted":
            log.info("TODO: Handle customer.subscription.deleted");
            break;
        default:
            log.debug({ eventType: event.type }, "Unhandled event type");
    }

    return NextResponse.json({ received: true });
}
