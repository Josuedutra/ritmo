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
    const { timezone, sendWindowStart, sendWindowEnd, sector, bccSubjectKeywords } = body;

    // Basic validation
    if (!timezone) {
      return NextResponse.json({ error: "Fuso horário obrigatório" }, { status: 400 });
    }

    if (sendWindowStart < 0 || sendWindowStart > 23 || sendWindowEnd < 0 || sendWindowEnd > 23) {
      return NextResponse.json({ error: "Janela de envio inválida (0-23)" }, { status: 400 });
    }

    const startHour = parseInt(sendWindowStart);
    const endHour = parseInt(sendWindowEnd);

    // Validate sector if provided
    const validSectors = ["AVAC", "MAINTENANCE", "IT", "FACILITIES", "OTHER"];
    const sectorValue = sector && validSectors.includes(sector) ? sector : undefined;

    // Validate and serialize bccSubjectKeywords if provided
    let bccKeywordsValue: string | null | undefined = undefined;
    if (bccSubjectKeywords !== undefined) {
      if (!Array.isArray(bccSubjectKeywords)) {
        return NextResponse.json(
          { error: "bccSubjectKeywords deve ser um array" },
          { status: 400 }
        );
      }
      const keywords = bccSubjectKeywords.filter(
        (k: unknown) => typeof k === "string" && k.trim().length > 0
      );
      bccKeywordsValue = keywords.length > 0 ? JSON.stringify(keywords) : null;
    }

    await prisma.organization.update({
      where: { id: session.user.organizationId },
      data: {
        timezone,
        sendWindowStart: `${String(startHour).padStart(2, "0")}:00`,
        sendWindowEnd: `${String(endHour).padStart(2, "0")}:00`,
        ...(sectorValue && { sector: sectorValue }),
        ...(bccKeywordsValue !== undefined && { bccSubjectKeywords: bccKeywordsValue }),
      },
    });

    log.info(
      { organizationId: session.user.organizationId, timezone },
      "Organization settings updated"
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError(error, "PUT /api/settings/organization");
  }
}
