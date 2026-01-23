/**
 * GET /api/entitlements
 *
 * Returns the current organization's entitlements.
 * Used by frontend for:
 * - Trial banners (days remaining)
 * - Free tier messaging
 * - Feature gating
 */

import {
    getApiSession,
    unauthorized,
    serverError,
    success,
} from "@/lib/api-utils";
import { getEntitlements } from "@/lib/entitlements";

export async function GET() {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const entitlements = await getEntitlements(session.user.organizationId);

        return success({
            tier: entitlements.tier,
            planName: entitlements.planName,
            trialActive: entitlements.trialActive,
            trialEndsAt: entitlements.trialEndsAt?.toISOString() ?? null,
            trialDaysRemaining: entitlements.trialDaysRemaining,
            quotesUsed: entitlements.quotesUsed,
            quotesLimit: entitlements.effectivePlanLimit,
            quotesRemaining: entitlements.quotesRemaining,
            autoEmailEnabled: entitlements.autoEmailEnabled,
            bccInboundEnabled: entitlements.bccInboundEnabled,
            subscriptionStatus: entitlements.subscriptionStatus,
            // Trial BCC captures tracking
            trialBccCapturesUsed: entitlements.trialBccCapturesUsed,
            trialBccCaptureLimit: entitlements.trialBccCaptureLimit,
            trialBccCapturesRemaining: entitlements.trialBccCapturesRemaining,
            ahaFirstBccCapture: entitlements.ahaFirstBccCapture,
            ahaFirstBccCaptureAt: entitlements.ahaFirstBccCaptureAt?.toISOString() ?? null,
        });
    } catch (error) {
        return serverError(error, "GET /api/entitlements");
    }
}
