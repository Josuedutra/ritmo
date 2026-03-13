import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { setSentryRequestContext } from "@/lib/observability/sentry-context";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/cron/calculate-commissions
 *
 * Cron endpoint for calculating monthly partner commissions.
 * Protected by CRON_SECRET bearer token.
 *
 * Should run once monthly (e.g., 1st of each month at 03:00 UTC).
 * For each ReferralAttribution with status=CONVERTED and an active subscription,
 * creates a PartnerCommission (CALCULATED) if one doesn't already exist for the
 * current period. Also creates a BoosterLedger entry for each new commission.
 *
 * Query params:
 * - period: YYYY-MM (optional, defaults to current month)
 */
export async function POST(request: NextRequest) {
  const log = logger.child({ endpoint: "cron/calculate-commissions" });
  setSentryRequestContext(request);

  // Validate CRON_SECRET
  if (!process.env.CRON_SECRET) {
    log.error("CRON_SECRET not configured");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

  if (authHeader !== expectedToken) {
    log.warn("Unauthorized cron attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Determine target period (YYYY-MM)
  const { searchParams } = new URL(request.url);
  const periodParam = searchParams.get("period");

  let period: string;
  if (periodParam) {
    if (!/^\d{4}-\d{2}$/.test(periodParam)) {
      return NextResponse.json({ error: "Invalid period format. Use YYYY-MM" }, { status: 400 });
    }
    period = periodParam;
  } else {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    period = `${year}-${month}`;
  }

  log.info({ period }, "Starting commission calculation");

  try {
    // Find all CONVERTED attributions with active subscriptions
    const attributions = await prisma.referralAttribution.findMany({
      where: {
        status: "CONVERTED",
        organization: {
          subscription: {
            status: "active",
          },
        },
      },
      include: {
        partner: true,
        organization: {
          select: {
            id: true,
            name: true,
            users: {
              take: 1,
              orderBy: { createdAt: "asc" },
              select: { id: true },
            },
            subscription: {
              include: {
                plan: true,
              },
            },
          },
        },
      },
    });

    log.info({ period, attributionCount: attributions.length }, "Found converted attributions");

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const attribution of attributions) {
      const { organization, partner } = attribution;

      // Guard: org must have a subscription with a plan
      const subscription = organization.subscription;
      if (!subscription || !subscription.plan) {
        log.warn({ organizationId: organization.id }, "No active subscription/plan — skipping");
        skipped++;
        continue;
      }

      // Guard: org must have at least one user for clientId
      const primaryUser = organization.users[0];
      if (!primaryUser) {
        log.warn({ organizationId: organization.id }, "No users found — skipping");
        skipped++;
        continue;
      }

      const clientId = primaryUser.id;
      const partnerId = attribution.partnerId;

      // Check idempotency: skip if commission already exists for this period
      const existing = await prisma.partnerCommission.findUnique({
        where: {
          partnerId_clientId_period: {
            partnerId,
            clientId,
            period,
          },
        },
      });

      if (existing) {
        log.debug({ partnerId, clientId, period }, "Commission already exists — skipping");
        skipped++;
        continue;
      }

      // Calculate commission: 20% of plan monthly price (in cents → convert to float euros)
      const subscriptionAmount = subscription.plan.priceMonthly / 100; // cents to euros
      const commissionRate = 0.2;
      const commissionAmount = Math.round(subscriptionAmount * commissionRate * 100) / 100;

      const orgName = organization.name;
      const [year, month] = period.split("-");

      try {
        // Create commission + ledger entry in a transaction
        await prisma.$transaction(async (tx) => {
          await tx.partnerCommission.create({
            data: {
              partnerId,
              clientId,
              period,
              subscriptionAmount,
              commissionRate,
              commissionAmount,
              status: "CALCULATED",
            },
          });

          await tx.boosterLedger.create({
            data: {
              partnerId,
              organizationId: organization.id,
              subscriptionId: subscription.id,
              amountCents: Math.round(commissionAmount * 100),
              currency: "eur",
              rateBps: Math.round(commissionRate * 10000),
              status: "PENDING",
              reason: `commission_monthly:${orgName} — ${month}/${year}`,
            },
          });
        });

        log.info({ partnerId, clientId, period, commissionAmount }, "Commission created");
        created++;
      } catch (err) {
        const msg = `Failed for partner=${partnerId} org=${organization.id}: ${err instanceof Error ? err.message : String(err)}`;
        log.error(
          { err, partnerId, organizationId: organization.id },
          "Commission creation failed"
        );
        errors.push(msg);
      }
    }

    log.info(
      { period, created, skipped, errors: errors.length },
      "Commission calculation completed"
    );

    return NextResponse.json({
      success: true,
      period,
      created,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    log.error({ error }, "Commission calculation failed");
    return NextResponse.json(
      {
        error: "Commission calculation failed",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    );
  }
}
