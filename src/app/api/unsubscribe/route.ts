import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { verifyUnsubscribeToken } from "@/lib/tokens";

const log = logger.child({ route: "api/unsubscribe" });

// Mask email for privacy in logs
function maskEmail(email: string): string {
    const [local, domain] = email.split("@");
    if (!domain) return "***";
    const masked = local.length > 1 ? local[0] + "***" : "***";
    return `${masked}@${domain}`;
}

/**
 * POST /api/unsubscribe
 *
 * Process opt-out request from unsubscribe page.
 * Adds email to suppression_global table.
 * Token is HMAC-signed to prevent forgery.
 */
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const token = formData.get("token") as string;

        if (!token) {
            return NextResponse.redirect(new URL("/unsubscribe?error=invalid", request.url));
        }

        // Verify signed token (HMAC + expiry check)
        const tokenData = verifyUnsubscribeToken(token);
        if (!tokenData) {
            log.warn("Invalid or expired unsubscribe token");
            return NextResponse.redirect(new URL("/unsubscribe?error=invalid", request.url));
        }

        const { organizationId, email } = tokenData;

        // Verify organization exists
        const org = await prisma.organization.findUnique({
            where: { id: organizationId },
            select: { id: true },
        });

        if (!org) {
            log.warn({ organizationId }, "Organization not found for unsubscribe");
            return NextResponse.redirect(new URL("/unsubscribe?error=invalid", request.url));
        }

        // Add to suppression list (upsert to handle duplicates)
        await prisma.suppressionGlobal.upsert({
            where: {
                organizationId_email: { organizationId, email },
            },
            create: {
                organizationId,
                email,
                reason: "opt_out",
            },
            update: {
                reason: "opt_out",
            },
        });

        // Cancel any pending cadence events for this email
        const contacts = await prisma.contact.findMany({
            where: {
                organizationId,
                email,
            },
            select: { id: true },
        });

        if (contacts.length > 0) {
            const contactIds = contacts.map((c) => c.id);

            // Find quotes for these contacts
            const quotes = await prisma.quote.findMany({
                where: {
                    contactId: { in: contactIds },
                },
                select: { id: true },
            });

            if (quotes.length > 0) {
                const quoteIds = quotes.map((q) => q.id);

                // Cancel pending email events
                const cancelResult = await prisma.cadenceEvent.updateMany({
                    where: {
                        quoteId: { in: quoteIds },
                        status: "scheduled",
                        eventType: { startsWith: "email_" },
                    },
                    data: {
                        status: "cancelled",
                        cancelReason: "suppressed",
                    },
                });

                log.info({
                    email: maskEmail(email),
                    organizationId,
                    cancelledEvents: cancelResult.count,
                }, "Email suppressed and events cancelled");
            }
        }

        log.info({ email: maskEmail(email), organizationId }, "Email unsubscribed successfully");

        // Redirect to success page
        return NextResponse.redirect(new URL("/unsubscribe?success=true", request.url));
    } catch (error) {
        log.error({ error }, "Unsubscribe error");
        return NextResponse.redirect(new URL("/unsubscribe?error=server", request.url));
    }
}
