import { NextRequest, NextResponse } from "next/server";
import { logger, AppLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { trackEvent, ProductEventNames } from "@/lib/product-events";
import { getStorageQuotaForPlan, PLAN_LIMITS } from "@/lib/entitlements";
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

        // P1-STRIPE-OBS-01: Track signature verification failure
        trackEvent(ProductEventNames.STRIPE_WEBHOOK_FAILED, {
            organizationId: null,
            userId: null,
            props: {
                stage: "signature_verification",
                reason: "invalid_signature",
                errorMessage: message.substring(0, 200), // Truncate for safety
            },
        });

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

        // P1-STRIPE-OBS-01: Track successful processing
        trackEvent(ProductEventNames.STRIPE_WEBHOOK_PROCESSED, {
            organizationId: null, // Could be resolved from event, but not critical
            userId: null,
            props: {
                eventType: event.type,
                stripeEventId: event.id,
            },
        });

        return NextResponse.json({ received: true });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        const errorCode = error instanceof Error && "code" in error ? (error as { code?: string }).code : undefined;
        log.error({ error: message, eventId: event.id }, "Error processing webhook");

        // P1-STRIPE-OBS-01: Track processing failure
        trackEvent(ProductEventNames.STRIPE_WEBHOOK_FAILED, {
            organizationId: null,
            userId: null,
            props: {
                stage: "processing",
                eventType: event.type,
                stripeEventId: event.id,
                errorMessage: message.substring(0, 200), // Truncate for safety, no PII
                errorCode: errorCode || null,
            },
        });

        return NextResponse.json({ error: "Processing error" }, { status: 500 });
    }
}

// =============================================================================
// HANDLER: checkout.session.completed
// =============================================================================
async function handleCheckoutCompleted(
    session: Stripe.Checkout.Session,
    log: AppLogger
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

    // P0-MC-01: Sync storage quota with new plan
    const storageQuotaBytes = getStorageQuotaForPlan(finalPlanId);
    await prisma.organization.update({
        where: { id: organizationId },
        data: { storageQuotaBytes: BigInt(storageQuotaBytes) },
    });

    log.info(
        { organizationId, planId: finalPlanId, storageQuotaBytes },
        "Subscription created from checkout - storage quota synced"
    );
}

// =============================================================================
// HANDLER: customer.subscription.created
// =============================================================================
async function handleSubscriptionCreated(
    subscription: Stripe.Subscription,
    log: AppLogger
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

    // P0-MC-01: Sync storage quota with new plan
    const storageQuotaBytes = getStorageQuotaForPlan(planId);
    await prisma.organization.update({
        where: { id: existingSubscription.organizationId },
        data: { storageQuotaBytes: BigInt(storageQuotaBytes) },
    });

    log.info(
        { organizationId: existingSubscription.organizationId, planId, storageQuotaBytes },
        "Subscription created event processed - storage quota synced"
    );
}

// =============================================================================
// HANDLER: customer.subscription.updated
// =============================================================================
async function handleSubscriptionUpdated(
    subscription: Stripe.Subscription,
    log: AppLogger
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

    // P0-MC-01: Sync storage quota with updated plan
    const storageQuotaBytes = getStorageQuotaForPlan(planId);
    await prisma.organization.update({
        where: { id: existingSubscription.organizationId },
        data: { storageQuotaBytes: BigInt(storageQuotaBytes) },
    });

    log.info(
        {
            organizationId: existingSubscription.organizationId,
            planId,
            status: subscription.status,
            storageQuotaBytes,
        },
        "Subscription updated - storage quota synced"
    );
}

// =============================================================================
// HANDLER: customer.subscription.deleted
// =============================================================================
async function handleSubscriptionDeleted(
    subscription: Stripe.Subscription,
    log: AppLogger
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
    const quotesLimit = freePlan?.monthlyQuoteLimit || 5;

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

    // P0-MC-01: Sync storage quota to free tier
    const storageQuotaBytes = PLAN_LIMITS.free.storageQuotaBytes;
    await prisma.organization.update({
        where: { id: existingSubscription.organizationId },
        data: { storageQuotaBytes: BigInt(storageQuotaBytes) },
    });

    log.info(
        { organizationId: existingSubscription.organizationId, storageQuotaBytes },
        "Subscription cancelled - downgraded to free, storage quota synced"
    );
}

// =============================================================================
// HANDLER: invoice.payment_succeeded
// =============================================================================
async function handleInvoicePaymentSucceeded(
    invoice: Stripe.Invoice,
    log: AppLogger
) {
    if (!invoice.subscription) {
        log.debug("Invoice not related to subscription - skipping");
        return;
    }

    // =========================================================================
    // GUARDRAIL 1: Skip zero-amount invoices (e.g., trial without card)
    // =========================================================================
    if (!invoice.amount_paid || invoice.amount_paid === 0) {
        log.debug("Invoice amount is 0 - skipping booster calculation");
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

    const organizationId = existingSubscription.organizationId;

    // Ensure status is active after successful payment
    if (existingSubscription.status !== "active") {
        await prisma.subscription.update({
            where: { id: existingSubscription.id },
            data: { status: "active" },
        });

        log.info(
            { organizationId },
            "Subscription reactivated after payment"
        );
    }

    // =========================================================================
    // REFERRAL BOOSTER: Check if this org has a referral attribution
    // Only for first payment (subscription_create)
    // =========================================================================
    try {
        await handleReferralBooster(
            organizationId,
            existingSubscription.id,
            invoice,
            log
        );
    } catch (error) {
        // Log but don't fail the webhook
        const message = error instanceof Error ? error.message : "Unknown error";
        log.error({ error: message, organizationId }, "Error processing referral booster");
    }
}

/**
 * Handle referral booster creation for first payment.
 * Creates BoosterLedger entry if org has referral attribution.
 *
 * P0-lite Hardening:
 * - Only converts on billing_reason=subscription_create (first payment)
 * - Validates attribution status is ATTRIBUTED or SIGNED_UP (not DISQUALIFIED/CONVERTED)
 * - Idempotency via unique stripeInvoiceId constraint
 * - One-time booster per org (attribution marked CONVERTED)
 */
async function handleReferralBooster(
    organizationId: string,
    subscriptionId: string,
    invoice: Stripe.Invoice,
    log: AppLogger
) {
    // =========================================================================
    // GUARDRAIL 2: Only process first payment (subscription_create)
    // =========================================================================
    const validBillingReasons = ["subscription_create"];
    const billingReason = invoice.billing_reason;

    if (billingReason && !validBillingReasons.includes(billingReason)) {
        log.debug(
            { billingReason, invoiceId: invoice.id },
            "Not a first payment (billing_reason) - skipping booster"
        );
        return;
    }

    // =========================================================================
    // GUARDRAIL 3: Check attribution exists and is eligible
    // =========================================================================
    const attribution = await prisma.referralAttribution.findUnique({
        where: { organizationId },
        include: {
            partner: {
                select: {
                    id: true,
                    name: true,
                    status: true,
                    defaultBoosterRateBps: true,
                },
            },
        },
    });

    if (!attribution) {
        log.debug({ organizationId }, "No referral attribution for this org");
        return;
    }

    // =========================================================================
    // GUARDRAIL 4: Attribution must be ATTRIBUTED or SIGNED_UP
    // CONVERTED/DISQUALIFIED = already processed or blocked
    // =========================================================================
    const eligibleStatuses = ["ATTRIBUTED", "SIGNED_UP"];
    if (!eligibleStatuses.includes(attribution.status)) {
        log.debug(
            { organizationId, status: attribution.status },
            "Attribution not eligible for conversion"
        );
        return;
    }

    // =========================================================================
    // GUARDRAIL 5: Partner must be ACTIVE
    // =========================================================================
    if (attribution.partner.status !== "ACTIVE") {
        log.warn(
            { organizationId, partnerId: attribution.partnerId },
            "Partner is not active - skipping booster"
        );
        return;
    }

    // =========================================================================
    // GUARDRAIL 6: Idempotency - booster already exists for this invoice
    // =========================================================================
    const existingBooster = await prisma.boosterLedger.findUnique({
        where: { stripeInvoiceId: invoice.id },
    });

    if (existingBooster) {
        log.debug(
            { invoiceId: invoice.id },
            "Booster already exists for this invoice - skipping"
        );
        return;
    }

    // =========================================================================
    // GUARDRAIL 7: Check if org already has ANY booster (one-time only)
    // =========================================================================
    const existingOrgBooster = await prisma.boosterLedger.findFirst({
        where: { organizationId },
    });

    if (existingOrgBooster) {
        log.debug(
            { organizationId, existingBoosterId: existingOrgBooster.id },
            "Org already has a booster - skipping (one-time rule)"
        );
        return;
    }

    // =========================================================================
    // Calculate and create booster
    // =========================================================================
    const rateBps = attribution.partner.defaultBoosterRateBps;
    const amountCents = Math.round((invoice.amount_paid * rateBps) / 10000);
    const currency = invoice.currency || "eur";

    // Create booster ledger entry
    await prisma.boosterLedger.create({
        data: {
            partnerId: attribution.partnerId,
            organizationId,
            subscriptionId,
            stripeInvoiceId: invoice.id,
            amountCents,
            currency,
            rateBps,
            status: "PENDING",
            reason: "referral_booster",
        },
    });

    // Update attribution to CONVERTED
    await prisma.referralAttribution.update({
        where: { id: attribution.id },
        data: {
            status: "CONVERTED",
            convertedAt: new Date(),
        },
    });

    // Track conversion event
    trackEvent(ProductEventNames.REFERRAL_CONVERTED, {
        organizationId,
        props: {
            partnerId: attribution.partnerId,
            partnerName: attribution.partner.name,
            amountCents,
            rateBps,
            currency,
            stripeInvoiceId: invoice.id,
            billingReason,
        },
    });

    log.info(
        {
            organizationId,
            partnerId: attribution.partnerId,
            amountCents,
            rateBps,
            currency,
            stripeInvoiceId: invoice.id,
        },
        "Referral booster created"
    );
}

// =============================================================================
// HANDLER: invoice.payment_failed
// =============================================================================
async function handleInvoicePaymentFailed(
    invoice: Stripe.Invoice,
    log: AppLogger
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
