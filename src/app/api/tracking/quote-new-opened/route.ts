/**
 * POST /api/tracking/quote-new-opened
 *
 * Track when user opens the new quote form.
 * Patch F: Instrumentação for activation metrics.
 */

import { NextRequest } from "next/server";
import { getApiSession } from "@/lib/api-utils";
import { trackEvent, ProductEventNames } from "@/lib/product-events";

export async function POST(request: NextRequest) {
    try {
        const session = await getApiSession();
        if (!session) {
            return new Response(null, { status: 204 });
        }

        await trackEvent(ProductEventNames.QUOTE_NEW_OPENED, {
            organizationId: session.user.organizationId,
            userId: session.user.id,
        });

        return new Response(null, { status: 204 });
    } catch {
        // Non-blocking - always return 204
        return new Response(null, { status: 204 });
    }
}
