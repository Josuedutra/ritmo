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
import {
    getEntitlements,
    incrementTrialUsage,
    MAX_RESENDS_PER_MONTH,
} from "@/lib/entitlements";

interface RouteParams {
    params: Promise<{ id: string }>;
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
 * Usage counting:
 * - First send: counts against quota (trial or plan limit)
 * - Resend: does NOT count against quota
 * - Resends limited to 2 per quote per month (anti-abuse)
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
        const isResend = !isFirstSend;

        // Get entitlements (single source of truth)
        const entitlements = await getEntitlements(session.user.organizationId);

        // Check usage limit only on first send (resends don't count against quota)
        if (isFirstSend) {
            if (!entitlements.canMarkSent.allowed) {
                const statusCode =
                    entitlements.canMarkSent.reason === "SUBSCRIPTION_CANCELLED" ? 403 : 402;

                return NextResponse.json(
                    {
                        error: entitlements.canMarkSent.reason,
                        message: entitlements.canMarkSent.message,
                        limit: entitlements.effectivePlanLimit,
                        used: entitlements.quotesUsed,
                        action: entitlements.canMarkSent.ctaAction,
                        redirectUrl: entitlements.canMarkSent.ctaUrl || "/settings/billing",
                    },
                    { status: statusCode }
                );
            }
        }

        // P1: Check resend limit (2 per quote per month)
        if (isResend) {
            const resendCheck = checkResendLimit(quote, now);
            if (!resendCheck.allowed) {
                return NextResponse.json(
                    {
                        error: "RESEND_LIMIT_EXCEEDED",
                        message: resendCheck.message,
                        resendsUsed: resendCheck.resendsUsed,
                        resendsLimit: MAX_RESENDS_PER_MONTH,
                    },
                    { status: 429 }
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
                // Update resend tracking
                ...(isResend && {
                    resendCount: getUpdatedResendCount(quote, now),
                    resendResetAt: getResendResetAt(quote, now),
                }),
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
            // For trial, increment trial counter
            if (entitlements.tier === "trial") {
                await incrementTrialUsage(session.user.organizationId);
            }
            // Always increment period usage counter (for billing tracking)
            await incrementQuotesSent(session.user.organizationId);
        }

        return success({
            quote: updatedQuote,
            cadence: cadenceResult,
            isResend,
            tier: entitlements.tier,
            quotesRemaining: isFirstSend
                ? entitlements.quotesRemaining - 1
                : entitlements.quotesRemaining,
            message: isFirstSend
                ? "Quote marked as sent. Cadence started."
                : "Quote resent. Previous cadence cancelled, new cadence started.",
        });
    } catch (error) {
        return serverError(error, "POST /api/quotes/:id/mark-sent");
    }
}

/**
 * Check if resend is allowed (max 2 per quote per month)
 */
function checkResendLimit(
    quote: { resendCount: number; resendResetAt: Date | null },
    now: Date
): { allowed: boolean; message?: string; resendsUsed: number } {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Check if counter should be reset (new month)
    const shouldReset = !quote.resendResetAt || quote.resendResetAt < monthStart;
    const currentResendCount = shouldReset ? 0 : quote.resendCount;

    if (currentResendCount >= MAX_RESENDS_PER_MONTH) {
        return {
            allowed: false,
            message: `Atingiu o limite de ${MAX_RESENDS_PER_MONTH} reenvios por mês para este orçamento. Aguarde até ao próximo mês.`,
            resendsUsed: currentResendCount,
        };
    }

    return {
        allowed: true,
        resendsUsed: currentResendCount,
    };
}

/**
 * Calculate updated resend count (reset if new month)
 */
function getUpdatedResendCount(
    quote: { resendCount: number; resendResetAt: Date | null },
    now: Date
): number {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const shouldReset = !quote.resendResetAt || quote.resendResetAt < monthStart;

    return shouldReset ? 1 : quote.resendCount + 1;
}

/**
 * Get reset timestamp (set to now when resending)
 */
function getResendResetAt(
    quote: { resendResetAt: Date | null },
    now: Date
): Date {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const shouldReset = !quote.resendResetAt || quote.resendResetAt < monthStart;

    return shouldReset ? now : quote.resendResetAt!;
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
