/**
 * Request ID Utilities
 *
 * Generates and manages request IDs for correlation across logs and Sentry.
 * Uses x-request-id header if present, otherwise generates a new one.
 *
 * P0 Observability requirement.
 */

import { headers } from "next/headers";
import * as Sentry from "@sentry/nextjs";

export const REQUEST_ID_HEADER = "x-request-id";

/**
 * Generate a new request ID
 * Format: rid_<timestamp>_<random>
 */
export function generateRequestId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `rid_${timestamp}_${random}`;
}

/**
 * Get or generate request ID from headers
 * Use in API routes and server components
 */
export async function getRequestId(): Promise<string> {
    try {
        const headersList = await headers();
        const existingId = headersList.get(REQUEST_ID_HEADER);
        return existingId || generateRequestId();
    } catch {
        // headers() not available (e.g., in build time)
        return generateRequestId();
    }
}

/**
 * Get request ID synchronously (for use in places where async isn't available)
 * Falls back to generating a new ID
 */
export function getRequestIdSync(headersList: Headers | null): string {
    if (headersList) {
        const existingId = headersList.get(REQUEST_ID_HEADER);
        if (existingId) return existingId;
    }
    return generateRequestId();
}

/**
 * Set request ID as Sentry tag for correlation
 */
export function setRequestIdOnSentry(requestId: string): void {
    Sentry.setTag("request_id", requestId);
}

/**
 * Create a correlation context with request ID
 * Useful for passing to async operations
 */
export interface CorrelationContext {
    requestId: string;
    timestamp: number;
}

export function createCorrelationContext(requestId?: string): CorrelationContext {
    return {
        requestId: requestId || generateRequestId(),
        timestamp: Date.now(),
    };
}
