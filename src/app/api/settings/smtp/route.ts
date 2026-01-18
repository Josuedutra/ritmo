import { NextRequest, NextResponse } from "next/server";
import { getApiSession, unauthorized, serverError } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * PUT /api/settings/smtp
 *
 * Update SMTP configuration for the organization.
 * Requires admin role.
 */
export async function PUT(request: NextRequest) {
    const log = logger.child({ endpoint: "settings/smtp" });

    try {
        const session = await getApiSession();
        if (!session) {
            return unauthorized();
        }

        // Check admin role
        if (session.user.role !== "admin") {
            log.warn(
                { userId: session.user.id },
                "Non-admin attempted to update SMTP settings"
            );
            return NextResponse.json(
                { error: "Apenas administradores podem alterar configurações" },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { mode, host, port, user, pass, from } = body;

        const organizationId = session.user.organizationId;

        if (mode === "ritmo") {
            // Clear SMTP settings, use Ritmo
            await prisma.organization.update({
                where: { id: organizationId },
                data: {
                    smtpHost: null,
                    smtpPort: null,
                    smtpUser: null,
                    smtpPassEncrypted: null,
                    smtpFrom: null,
                },
            });

            log.info({ organizationId }, "SMTP settings cleared - using Ritmo");
            return NextResponse.json({ success: true, mode: "ritmo" });
        }

        if (mode === "smtp") {
            // Validate required fields
            if (!host || !port || !user || !from) {
                return NextResponse.json(
                    { error: "Campos obrigatórios em falta: host, port, user, from" },
                    { status: 400 }
                );
            }

            // Build update data
            const updateData: Record<string, any> = {
                smtpHost: host,
                smtpPort: parseInt(port),
                smtpUser: user,
                smtpFrom: from,
            };

            // Only update password if provided (allow keeping existing)
            if (pass) {
                // In production, encrypt the password before storing
                // For MVP, store as-is (should use encryption in production)
                updateData.smtpPassEncrypted = pass;
            }

            await prisma.organization.update({
                where: { id: organizationId },
                data: updateData,
            });

            log.info({ organizationId, host, port }, "SMTP settings updated");
            return NextResponse.json({ success: true, mode: "smtp" });
        }

        return NextResponse.json(
            { error: "Mode inválido. Use 'smtp' ou 'ritmo'" },
            { status: 400 }
        );
    } catch (error) {
        return serverError(error, "PUT /api/settings/smtp");
    }
}
