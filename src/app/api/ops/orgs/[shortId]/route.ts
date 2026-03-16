/**
 * GET/PATCH /api/ops/orgs/[shortId]
 *
 * Admin endpoint for org inspection and trial counter management.
 * Protected by OPS_TOKEN header (x-ops-token).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOpsToken } from "@/lib/observability/ops-auth";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ shortId: string }> };

/** GET /api/ops/orgs/[shortId] — inspect org trial counters */
export async function GET(request: NextRequest, { params }: Params) {
  const authError = validateOpsToken(request);
  if (authError) return authError;

  const { shortId } = await params;

  const org = await prisma.organization.findUnique({
    where: { shortId },
    select: {
      id: true,
      name: true,
      shortId: true,
      trialBccCaptures: true,
      trialSentUsed: true,
      trialSentLimit: true,
      trialEndsAt: true,
    },
  });

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  return NextResponse.json({ org });
}

/** PATCH /api/ops/orgs/[shortId] — update trial counters */
export async function PATCH(request: NextRequest, { params }: Params) {
  const authError = validateOpsToken(request);
  if (authError) return authError;

  const { shortId } = await params;

  const body = await request.json().catch(() => ({}));
  const { resetTrialBccCaptures, resetTrialSentUsed } = body as {
    resetTrialBccCaptures?: boolean;
    resetTrialSentUsed?: boolean;
  };

  const update: Record<string, unknown> = {};
  if (resetTrialBccCaptures) update.trialBccCaptures = 0;
  if (resetTrialSentUsed) update.trialSentUsed = 0;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No update fields provided" }, { status: 400 });
  }

  const org = await prisma.organization.update({
    where: { shortId },
    data: update,
    select: {
      id: true,
      name: true,
      shortId: true,
      trialBccCaptures: true,
      trialSentUsed: true,
    },
  });

  return NextResponse.json({ org, updated: Object.keys(update) });
}
