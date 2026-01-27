/**
 * POST /api/tracking/roi-calculator
 *
 * Track ROI calculator events on the landing page.
 * No auth required (public page). Stores bucketed values only for privacy.
 * Rate limited by IP (60 req / 5 min).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { trackEvent, ProductEventNames } from "@/lib/product-events";
import { logger } from "@/lib/logger";
import {
    rateLimit,
    RateLimitConfigs,
    rateLimitedResponse,
} from "@/lib/security/rate-limit";

const log = logger.child({ route: "api/tracking/roi-calculator" });

// Allowed ticket bucket labels (must match client-side TICKET_BUCKETS + "custom")
const VALID_TICKET_BUCKETS = [
    "\u20AC500\u2013\u20AC1.000",
    "\u20AC1.000\u2013\u20AC2.500",
    "\u20AC2.500\u2013\u20AC5.000",
    "\u20AC5.000\u2013\u20AC10.000",
    "\u20AC10.000+",
    "custom",
] as const;

// Allowed field names for "changed" events
const VALID_FIELDS = ["plan", "ticket", "margin", "recovered"] as const;

const trackSchema = z.object({
    event: z.enum(["viewed", "changed", "cta_clicked", "positive_balance"]),
    field: z.enum(VALID_FIELDS).optional(),
    ticketBucket: z.enum(VALID_TICKET_BUCKETS).optional(),
    marginBucket: z.number().int().min(0).max(50).optional(),
    recoveredCount: z.number().int().min(1).max(10).optional(),
    plan: z.enum(["starter", "pro"]).optional(),
    interval: z.enum(["monthly", "annual"]).optional(),
    balanceBucket: z.enum(["negative", "break_even", "positive"]).optional(),
});

const EVENT_MAP = {
    viewed: ProductEventNames.ROI_CALCULATOR_VIEWED,
    changed: ProductEventNames.ROI_CALCULATOR_CHANGED,
    cta_clicked: ProductEventNames.ROI_CALCULATOR_CTA_CLICKED,
    positive_balance: ProductEventNames.ROI_CALCULATOR_POSITIVE_BALANCE,
} as const;

export async function POST(request: NextRequest) {
    try {
        // Rate limit by IP
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
            ?? request.headers.get("x-real-ip")
            ?? "unknown";

        const rateLimitResult = await rateLimit({
            key: `tracking:roi:${ip}`,
            ...RateLimitConfigs.publicTracking,
        });

        if (!rateLimitResult.allowed) {
            return rateLimitedResponse(rateLimitResult.retryAfterSec);
        }

        const body = await request.json();
        const parsed = trackSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }

        const { event, field, ticketBucket, marginBucket, recoveredCount, plan, interval, balanceBucket } = parsed.data;

        const eventName = EVENT_MAP[event];

        await trackEvent(eventName, {
            props: {
                ...(field && { field }),
                ...(ticketBucket && { ticketBucket }),
                ...(marginBucket !== undefined && { marginBucket }),
                ...(recoveredCount !== undefined && { recoveredCount }),
                ...(plan && { plan }),
                ...(interval && { interval }),
                ...(balanceBucket && { balanceBucket }),
            },
        });

        log.debug({ event, field }, "ROI calculator event tracked");

        return NextResponse.json({ success: true });
    } catch (error) {
        log.error({ error }, "Failed to track ROI calculator event");
        return NextResponse.json({ success: true });
    }
}
