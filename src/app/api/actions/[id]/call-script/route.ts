import { NextRequest, NextResponse } from "next/server";
import { getApiSession, unauthorized, notFound, serverError } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { generateCallScript } from "@/lib/call-script";
import { logger } from "@/lib/logger";

const log = logger.child({ endpoint: "actions/[id]/call-script" });

/**
 * POST /api/actions/[id]/call-script
 *
 * Generate (or return cached) Claude call script for a D+7 call action.
 * Uses the org's Communication Profile for personalisation.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getApiSession();
    if (!session) return unauthorized();

    const { id } = await params;
    const orgId = session.user.organizationId;

    // Verify the event exists and belongs to this org
    const event = await prisma.cadenceEvent.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true, eventType: true },
    });

    if (!event) return notFound();
    if (event.eventType !== "call_d7") {
      return NextResponse.json({ error: "Apenas disponível para D+7" }, { status: 400 });
    }

    const script = await generateCallScript(id, orgId);

    log.info({ eventId: id, orgId }, "Call script request handled");
    return NextResponse.json({ script, cached: false });
  } catch (error) {
    return serverError(error, "POST /api/actions/[id]/call-script");
  }
}
