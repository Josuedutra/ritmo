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

/**
 * Check if organization has reached their quote limit
 * Returns { allowed: true } or { allowed: false, limit, used }
 */
async function checkUsageLimit(organizationId: string): Promise<{
    allowed: boolean;
    limit: number;
    used: number;
}> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [subscription, usage] = await Promise.all([
        prisma.subscription.findUnique({
            where: { organizationId },
            select: { quotesLimit: true },
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

    const limit = subscription?.quotesLimit ?? 10; // Default free tier
    const used = usage?.quotesSent ?? 0;

    return {
        allowed: used < limit,
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
                return NextResponse.json(
                    {
                        error: "LIMIT_EXCEEDED",
                        message: `Atingiu o limite de ${usageCheck.limit} orçamentos este mês. Atualize o seu plano para continuar.`,
                        limit: usageCheck.limit,
                        used: usageCheck.used,
                    },
                    { status: 402 } // Payment Required
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
