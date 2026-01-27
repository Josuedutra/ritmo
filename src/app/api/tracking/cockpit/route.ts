/**
 * POST /api/tracking/cockpit
 *
 * Track cockpit dashboard events (viewed, CTA clicks, upgrade clicks).
 * Requires auth (dashboard is authenticated).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getApiSession } from "@/lib/api-utils";
import { trackEvent, ProductEventNames } from "@/lib/product-events";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "api/tracking/cockpit" });

const trackSchema = z.object({
    event: z.enum(["viewed", "followups_cta_clicked", "upgrade_clicked"]),
    tier: z.enum(["free", "trial", "paid"]).optional(),
    riskToday: z.number().int().min(0).max(9999).optional(),
});

const EVENT_MAP = {
    viewed: ProductEventNames.COCKPIT_VIEWED,
    followups_cta_clicked: ProductEventNames.COCKPIT_FOLLOWUPS_CTA_CLICKED,
    upgrade_clicked: ProductEventNames.COCKPIT_UPGRADE_CLICKED,
} as const;

export async function POST(request: NextRequest) {
    try {
        const session = await getApiSession();

        const body = await request.json();
        const parsed = trackSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }

        const { event, tier, riskToday } = parsed.data;

        await trackEvent(EVENT_MAP[event], {
            organizationId: session?.user?.organizationId ?? null,
            userId: session?.user?.id ?? null,
            props: {
                ...(tier && { tier }),
                ...(riskToday !== undefined && { riskToday }),
            },
        });

        log.debug(
            { event, tier, orgId: session?.user?.organizationId },
            "Cockpit event tracked"
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        log.error({ error }, "Failed to track cockpit event");
        return NextResponse.json({ success: true });
    }
}
