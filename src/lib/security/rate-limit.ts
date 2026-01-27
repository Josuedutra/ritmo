/**
 * Rate Limiting (P0 Security Hardening)
 *
 * Uses Upstash Redis when available, falls back to in-memory for dev.
 * Implements sliding window rate limiting.
 *
 * Environment:
 * - UPSTASH_REDIS_REST_URL: Redis REST URL
 * - UPSTASH_REDIS_REST_TOKEN: Redis REST token
 *
 * Usage:
 * ```ts
 * const result = await rateLimit({
 *   key: `signup:${ip}`,
 *   limit: 10,
 *   windowSec: 600, // 10 minutes
 * });
 *
 * if (!result.allowed) {
 *   return NextResponse.json(
 *     { error: "RATE_LIMITED", retryAfterSec: result.retryAfterSec },
 *     { status: 429 }
 *   );
 * }
 * ```
 */

import { logger } from "@/lib/logger";

const log = logger.child({ service: "rate-limit" });

// Environment
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// In-memory store for development (not for production!)
const memoryStore: Map<string, { count: number; resetAt: number }> = new Map();

interface RateLimitOptions {
    /** Unique key for the rate limit (e.g., `signup:${ip}`) */
    key: string;
    /** Maximum requests allowed in the window */
    limit: number;
    /** Window size in seconds */
    windowSec: number;
    /**
     * Behavior when Redis is unavailable:
     * - "fail-open": Allow request (default, for revenue-critical endpoints)
     * - "fail-closed": Block request (for anti-abuse endpoints like signup/inbound)
     */
    failMode?: "fail-open" | "fail-closed";
}

interface RateLimitResult {
    /** Whether the request is allowed */
    allowed: boolean;
    /** Current request count */
    current: number;
    /** Maximum requests allowed */
    limit: number;
    /** Seconds until the rate limit resets */
    retryAfterSec: number;
    /** Remaining requests in the window */
    remaining: number;
}

/**
 * Check rate limit for a key.
 */
export async function rateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
    const { key, limit, windowSec, failMode = "fail-open" } = options;

    // Use Redis if configured
    if (REDIS_URL && REDIS_TOKEN) {
        return redisRateLimit(key, limit, windowSec, failMode);
    }

    // Fallback to in-memory for development
    return memoryRateLimit(key, limit, windowSec);
}

/**
 * Redis-based rate limiting using Upstash.
 * Uses INCR with EXPIRE for atomic increment and expiry.
 */
async function redisRateLimit(
    key: string,
    limit: number,
    windowSec: number,
    failMode: "fail-open" | "fail-closed"
): Promise<RateLimitResult> {
    const redisKey = `ratelimit:${key}`;

    // Helper for error responses based on fail mode
    const errorResponse = (): RateLimitResult => {
        if (failMode === "fail-closed") {
            log.warn({ key, failMode }, "Rate limit Redis error - blocking request (fail-closed)");
            return {
                allowed: false,
                current: 0,
                limit,
                retryAfterSec: 60, // Retry after 1 minute on error
                remaining: 0,
            };
        }
        // fail-open: allow the request
        return {
            allowed: true,
            current: 0,
            limit,
            retryAfterSec: 0,
            remaining: limit,
        };
    };

    try {
        // Increment and get TTL in a pipeline
        const response = await fetch(`${REDIS_URL}/pipeline`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${REDIS_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify([
                ["INCR", redisKey],
                ["TTL", redisKey],
            ]),
        });

        if (!response.ok) {
            log.error({ status: response.status, key }, "Redis rate limit error");
            return errorResponse();
        }

        const results = await response.json();
        const count = results[0]?.result || 1;
        const ttl = results[1]?.result || -1;

        // Set expiry on first request
        if (ttl === -1) {
            await fetch(`${REDIS_URL}/EXPIRE/${redisKey}/${windowSec}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${REDIS_TOKEN}`,
                },
            });
        }

        const allowed = count <= limit;
        const remaining = Math.max(0, limit - count);
        const retryAfterSec = allowed ? 0 : Math.max(ttl, 1);

        if (!allowed) {
            log.warn(
                { key, count, limit, ttl },
                "Rate limit exceeded"
            );
        }

        return {
            allowed,
            current: count,
            limit,
            retryAfterSec,
            remaining,
        };
    } catch (error) {
        log.error({ error, key }, "Redis rate limit error");
        return errorResponse();
    }
}

/**
 * In-memory rate limiting for development.
 * WARNING: Does not work with multiple instances.
 */
function memoryRateLimit(
    key: string,
    limit: number,
    windowSec: number
): RateLimitResult {
    const now = Date.now();
    const windowMs = windowSec * 1000;

    // Clean up expired entries periodically
    if (memoryStore.size > 1000) {
        for (const [k, v] of memoryStore) {
            if (v.resetAt < now) {
                memoryStore.delete(k);
            }
        }
    }

    const entry = memoryStore.get(key);

    if (!entry || entry.resetAt < now) {
        // First request or window expired
        memoryStore.set(key, {
            count: 1,
            resetAt: now + windowMs,
        });

        return {
            allowed: true,
            current: 1,
            limit,
            retryAfterSec: 0,
            remaining: limit - 1,
        };
    }

    // Increment count
    entry.count++;

    const allowed = entry.count <= limit;
    const remaining = Math.max(0, limit - entry.count);
    const retryAfterSec = allowed ? 0 : Math.ceil((entry.resetAt - now) / 1000);

    if (!allowed) {
        log.warn(
            { key, count: entry.count, limit },
            "Rate limit exceeded (memory)"
        );
    }

    return {
        allowed,
        current: entry.count,
        limit,
        retryAfterSec,
        remaining,
    };
}

/**
 * Get client IP from request headers.
 * Works with Vercel, Cloudflare, and standard proxies.
 */
export function getClientIp(request: Request): string {
    // Vercel
    const forwardedFor = request.headers.get("x-forwarded-for");
    if (forwardedFor) {
        return forwardedFor.split(",")[0].trim();
    }

    // Cloudflare
    const cfConnectingIp = request.headers.get("cf-connecting-ip");
    if (cfConnectingIp) {
        return cfConnectingIp;
    }

    // Real IP header
    const realIp = request.headers.get("x-real-ip");
    if (realIp) {
        return realIp;
    }

    // Fallback
    return "unknown";
}

/**
 * Rate limit configurations for common endpoints.
 *
 * Fail modes:
 * - "fail-closed": Block on Redis error (anti-abuse: signup, inbound)
 * - "fail-open": Allow on Redis error (revenue-critical: billing)
 */
export const RateLimitConfigs = {
    /** Signup: 10 requests per 10 minutes per IP - fail-closed for anti-abuse */
    signup: { limit: 10, windowSec: 600, failMode: "fail-closed" as const },

    /** Inbound webhook: 60 per 5 min per IP - fail-closed for anti-abuse */
    inboundPerIp: { limit: 60, windowSec: 300, failMode: "fail-closed" as const },
    /** Inbound per org: 200 per 60 min - fail-closed */
    inboundPerOrg: { limit: 200, windowSec: 3600, failMode: "fail-closed" as const },

    /** Cron endpoints: 60 per 10 minutes per IP - fail-open (internal, protected by secret) */
    cron: { limit: 60, windowSec: 600, failMode: "fail-open" as const },

    /** Billing checkout/portal: 20 per 10 minutes per org - fail-open (revenue-critical) */
    billing: { limit: 20, windowSec: 600, failMode: "fail-open" as const },

    /** Public tracking endpoints (roi-calculator): 60 per 5 min per IP - fail-open (non-critical) */
    publicTracking: { limit: 60, windowSec: 300, failMode: "fail-open" as const },
} as const;

/**
 * Standard 429 response
 */
export function rateLimitedResponse(retryAfterSec: number) {
    const { NextResponse } = require("next/server");
    return NextResponse.json(
        {
            error: "RATE_LIMITED",
            retryAfterSec,
            message: "Too many requests. Please try again later.",
        },
        {
            status: 429,
            headers: {
                "Retry-After": String(retryAfterSec),
            },
        }
    );
}
