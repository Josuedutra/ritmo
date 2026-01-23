import { NextResponse } from "next/server";
import { getApiSession, unauthorized } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/inbound/status
 *
 * Returns BCC inbound capture status for the authenticated user's organization.
 * Used by the "Verificar captura" modal in onboarding Step 4.
 *
 * Returns only metadata (no sensitive data):
 * - found: boolean
 * - receivedAt: timestamp (if found)
 * - subject: first 50 chars of subject (if found)
 *
 * Does NOT return:
 * - Raw email content
 * - Full subject
 * - Any PII
 */
export async function GET() {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const organizationId = session.user.organizationId;

        // Get organization to check entitlements
        const organization = await prisma.organization.findUnique({
            where: { id: organizationId },
            select: {
                trialEndsAt: true,
                trialBccCaptures: true,
                bccInboundEnabled: true,
            },
        });

        if (!organization) {
            return NextResponse.json(
                { error: "ORG_NOT_FOUND", message: "Organização não encontrada" },
                { status: 404 }
            );
        }

        // Check if trial has expired (if in trial)
        const now = new Date();
        const trialActive = organization.trialEndsAt && organization.trialEndsAt > now;
        const trialLimitReached = trialActive && organization.trialBccCaptures >= 1;

        // Find the most recent successful inbound capture
        const latestCapture = await prisma.inboundIngestion.findFirst({
            where: {
                organizationId,
                status: "processed",
            },
            orderBy: {
                receivedAt: "desc",
            },
            select: {
                id: true,
                receivedAt: true,
                rawSubject: true,
            },
        });

        if (!latestCapture) {
            // No capture found - return appropriate status
            return NextResponse.json({
                found: false,
                trialLimitReached,
                message: trialLimitReached
                    ? "Limite de captura atingido durante o trial"
                    : "Ainda não recebemos nenhum email BCC",
            });
        }

        // Capture found - return metadata only
        return NextResponse.json({
            found: true,
            receivedAt: latestCapture.receivedAt.toISOString(),
            // Truncate subject for privacy, remove sensitive content
            subject: latestCapture.rawSubject
                ? latestCapture.rawSubject.slice(0, 50) + (latestCapture.rawSubject.length > 50 ? "..." : "")
                : null,
            trialLimitReached,
        });
    } catch (error) {
        console.error("[inbound/status] Error:", error);
        return NextResponse.json(
            { error: "INTERNAL_ERROR", message: "Erro interno do servidor" },
            { status: 500 }
        );
    }
}
