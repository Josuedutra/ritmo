import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { processOnboardingDrip } from "@/lib/onboarding-drip";
import {
    rateLimit,
    getClientIp,
    RateLimitConfigs,
    rateLimitedResponse,
} from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/cron/process-onboarding-drip
 *
 * Cron endpoint for processing onboarding drip emails.
 * Protected by CRON_SECRET bearer token.
 *
 * Processes emails 2-5 for all orgs that signed up within the last 15 days.
 * Email 1 (welcome) is sent immediately at signup, not by this cron.
 *
 * Idempotency: Uses ProductEvent to track sent emails. Safe to run multiple times.
 */
export async function POST(request: NextRequest) {
    const log = logger.child({ endpoint: "cron/process-onboarding-drip" });
    const startTime = Date.now();

    // Rate limiting
    const ip = getClientIp(request);
    const rateLimitResult = await rateLimit({
        key: `cron-drip:${ip}`,
        ...RateLimitConfigs.cron,
    });

    if (!rateLimitResult.allowed) {
        log.warn({ ip }, "Cron rate limited");
        return rateLimitedResponse(rateLimitResult.retryAfterSec);
    }

    // Validate CRON_SECRET
    const authHeader = request.headers.get("authorization");
    const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

    if (!process.env.CRON_SECRET) {
        log.error("CRON_SECRET not configured");
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    if (authHeader !== expectedToken) {
        log.warn("Unauthorized cron attempt");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    log.info("Onboarding drip cron started");

    try {
        const result = await processOnboardingDrip();

        const durationMs = Date.now() - startTime;
        log.info({ ...result, durationMs }, "Onboarding drip cron completed");

        return NextResponse.json({
            success: true,
            ...result,
            durationMs,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        log.error({ error: message }, "Onboarding drip cron failed");

        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        );
    }
}
