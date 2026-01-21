/**
 * POST /api/tracking/upgrade-prompt
 *
 * Track upgrade prompt events (shown/clicked).
 * P1-UPGRADE-PROMPTS
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getApiSession } from "@/lib/api-utils";
import { trackEvent, ProductEventNames } from "@/lib/product-events";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "api/tracking/upgrade-prompt" });

const trackSchema = z.object({
    event: z.enum(["shown", "clicked"]),
    reason: z.enum([
        "send_limit",
        "storage_quota",
        "retention_expired",
        "seat_limit",
        "benchmark_locked",
    ]),
    location: z.string().max(100),
});

export async function POST(request: NextRequest) {
    try {
        const session = await getApiSession();

        const body = await request.json();
        const parsed = trackSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }

        const { event, reason, location } = parsed.data;

        // Track the event
        const eventName = event === "shown"
            ? ProductEventNames.UPGRADE_PROMPT_SHOWN
            : ProductEventNames.UPGRADE_PROMPT_CLICKED;

        await trackEvent(eventName, {
            organizationId: session?.user?.organizationId ?? null,
            userId: session?.user?.id ?? null,
            props: {
                reason,
                location,
            },
        });

        log.debug(
            { event, reason, location, orgId: session?.user?.organizationId },
            "Upgrade prompt event tracked"
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        // Non-blocking - don't fail the request
        log.error({ error }, "Failed to track upgrade prompt event");
        return NextResponse.json({ success: true });
    }
}
