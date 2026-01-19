import { NextRequest, NextResponse } from "next/server";
import { getApiSession, unauthorized, serverError } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * PUT /api/settings/organization
 *
 * Update organization general settings.
 * Requires admin role.
 */
export async function PUT(request: NextRequest) {
    const log = logger.child({ endpoint: "settings/organization" });

    try {
        const session = await getApiSession();
        if (!session) {
            return unauthorized();
        }

        // Check admin role
        if (session.user.role !== "admin") {
            return NextResponse.json(
                { error: "Apenas administradores podem alterar configurações" },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { timezone, sendWindowStart, sendWindowEnd } = body;

        // Basic validation
        if (!timezone) {
            return NextResponse.json(
                { error: "Fuso horário obrigatório" },
                { status: 400 }
            );
        }

        if (sendWindowStart < 0 || sendWindowStart > 23 || sendWindowEnd < 0 || sendWindowEnd > 23) {
            return NextResponse.json(
                { error: "Janela de envio inválida (0-23)" },
                { status: 400 }
            );
        }

        const startHour = parseInt(sendWindowStart);
        const endHour = parseInt(sendWindowEnd);

        await prisma.organization.update({
            where: { id: session.user.organizationId },
            data: {
                timezone,
                sendWindowStart: `${String(startHour).padStart(2, '0')}:00`,
                sendWindowEnd: `${String(endHour).padStart(2, '0')}:00`,
            },
        });

        log.info({ organizationId: session.user.organizationId, timezone }, "Organization settings updated");

        return NextResponse.json({ success: true });
    } catch (error) {
        return serverError(error, "PUT /api/settings/organization");
    }
}
