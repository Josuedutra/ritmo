/**
 * POST /api/tracking/mark-sent-clicked
 *
 * Track when user clicks the "Guardar e iniciar follow-up" button.
 * P0 Fix: Now accepts quoteId and source props.
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

        // Parse optional props from body
        let quoteId: string | undefined;
        let source: string | undefined;
        try {
            const body = await request.json();
            quoteId = body.quoteId;
            source = body.source;
        } catch {
            // No body or invalid JSON - track without props
        }

        await trackEvent(ProductEventNames.MARK_SENT_CLICKED, {
            organizationId: session.user.organizationId,
            userId: session.user.id,
            props: {
                quoteId,
                source,
            },
        });

        return new Response(null, { status: 204 });
    } catch {
        // Non-blocking - always return 204
        return new Response(null, { status: 204 });
    }
}
