import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateCadenceEvents } from "@/lib/cadence";
import {
    getApiSession,
    unauthorized,
    notFound,
    badRequest,
    serverError,
    success,
} from "@/lib/api-utils";

interface RouteParams {
    params: Promise<{ id: string }>;
}

type UsageCheckResult =
    | { allowed: true; limit: number; used: number }
    | {
          allowed: false;
          reason: "LIMIT_EXCEEDED" | "PAYMENT_REQUIRED" | "SUBSCRIPTION_CANCELLED";
          limit: number;
          used: number;
          message: string;
      };

/**
 * Check if organization can send quotes based on subscription status and limits.
 *
 * Rules:
 * - cancelled: Block with SUBSCRIPTION_CANCELLED
 * - past_due: Block with PAYMENT_REQUIRED (give grace period via webhook)
 * - active/trialing: Check against plan's monthly_quote_limit
 * - No subscription: Use free tier defaults (10 quotes)
 */
async function checkUsageLimit(organizationId: string): Promise<UsageCheckResult> {
    const now = new Date();

    const [subscription, usage] = await Promise.all([
        prisma.subscription.findUnique({
            where: { organizationId },
            include: {
                plan: {
                    select: {
                        monthlyQuoteLimit: true,
                        name: true,
                    },
                },
            },
        }),
        prisma.usageCounter.findFirst({
            where: {
                organizationId,
                periodStart: { lte: now },
                periodEnd: { gte: now },
            },
            select: { quotesSent: true },
        }),
    ]);

    // Get limit from plan (via subscription) or use free tier default
    const limit = subscription?.plan?.monthlyQuoteLimit ?? subscription?.quotesLimit ?? 10;
    const used = usage?.quotesSent ?? 0;

    // Check subscription status first
    if (subscription) {
        // Cancelled subscriptions cannot send quotes
        if (subscription.status === "cancelled") {
            return {
                allowed: false,
                reason: "SUBSCRIPTION_CANCELLED",
                limit,
                used,
                message:
                    "A sua subscrição foi cancelada. Reative o plano para continuar a enviar orçamentos.",
            };
        }

        // Past due subscriptions are blocked until payment is updated
        if (subscription.status === "past_due") {
            return {
                allowed: false,
                reason: "PAYMENT_REQUIRED",
                limit,
                used,
                message:
                    "O seu pagamento está em atraso. Atualize o método de pagamento para continuar.",
            };
        }
    }

    // Check quota limit for active/trialing subscriptions
    if (used >= limit) {
        const planName = subscription?.plan?.name || "Gratuito";
        return {
            allowed: false,
            reason: "LIMIT_EXCEEDED",
            limit,
            used,
            message: `Atingiu o limite de ${limit} orçamentos do plano ${planName}. Atualize o seu plano para continuar.`,
        };
    }

    return {
        allowed: true,
        limit,
        used,
    };
}

/**
 * POST /api/quotes/:id/mark-sent
 *
 * Mark a quote as sent and generate cadence events.
 *
 * Behavior:
 * - Sets businessStatus to "sent"
 * - Sets sentAt to now
 * - Sets firstSentAt if not already set (immutable for billing)
 * - Increments cadenceRunId
 * - Creates 4 cadence events (D+1, D+3, D+7, D+14)
 * - If resending: cancels previous pending events
 *
 * Query params:
 * - force=true: Allow resending even if already sent
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const force = searchParams.get("force") === "true";

        // Get quote with organization
        const quote = await prisma.quote.findFirst({
            where: {
                id,
                organizationId: session.user.organizationId,
            },
            include: {
                contact: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                    },
                },
                organization: {
                    select: {
                        timezone: true,
                    },
                },
            },
        });

        if (!quote) {
            return notFound("Quote");
        }

        // Check if already sent (unless force=true)
        if (quote.businessStatus === "sent" && !force) {
            return badRequest(
                "Quote already marked as sent. Use ?force=true to resend and reset cadence."
            );
        }

        // Check if in terminal state
        if (quote.businessStatus === "won" || quote.businessStatus === "lost") {
            return badRequest(`Cannot mark ${quote.businessStatus} quote as sent.`);
        }

        const now = new Date();
        const isFirstSend = !quote.firstSentAt;

        // Check usage limit only on first send (resends don't count)
        if (isFirstSend) {
            const usageCheck = await checkUsageLimit(session.user.organizationId);
            if (!usageCheck.allowed) {
                // Determine appropriate status code and action based on reason
                const statusCode = usageCheck.reason === "SUBSCRIPTION_CANCELLED" ? 403 : 402;
                const action =
                    usageCheck.reason === "PAYMENT_REQUIRED"
                        ? "update_payment"
                        : usageCheck.reason === "SUBSCRIPTION_CANCELLED"
                          ? "reactivate_subscription"
                          : "upgrade_plan";

                return NextResponse.json(
                    {
                        error: usageCheck.reason,
                        message: usageCheck.message,
                        limit: usageCheck.limit,
                        used: usageCheck.used,
                        action,
                        redirectUrl: "/settings/billing",
                    },
                    { status: statusCode }
                );
            }
        }
        const timezone = quote.organization.timezone;

        // Update quote status
        const updatedQuote = await prisma.quote.update({
            where: { id },
            data: {
                businessStatus: "sent",
                sentAt: now,
                // Only set firstSentAt on first send (immutable for billing)
                ...(isFirstSend && { firstSentAt: now }),
                lastActivityAt: now,
            },
        });

        // Generate cadence events
        const cadenceResult = await generateCadenceEvents({
            quoteId: id,
            organizationId: session.user.organizationId,
            sentAt: now,
            quoteValue: quote.value,
            timezone,
        });

        // Increment usage counter if first send
        if (isFirstSend) {
            await incrementQuotesSent(session.user.organizationId);
        }

        return success({
            quote: updatedQuote,
            cadence: cadenceResult,
            isResend: !isFirstSend,
            message: isFirstSend
                ? "Quote marked as sent. Cadence started."
                : "Quote resent. Previous cadence cancelled, new cadence started.",
        });
    } catch (error) {
        return serverError(error, "POST /api/quotes/:id/mark-sent");
    }
}

/**
 * Increment quotes_sent usage counter for billing
 */
async function incrementQuotesSent(organizationId: string) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    await prisma.usageCounter.upsert({
        where: {
            organizationId_periodStart: {
                organizationId,
                periodStart,
            },
        },
        create: {
            organizationId,
            periodStart,
            periodEnd,
            quotesSent: 1,
            emailsSent: 0,
        },
        update: {
            quotesSent: { increment: 1 },
        },
    });
}
