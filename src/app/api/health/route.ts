import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
    const startTime = Date.now();

    // Check database connection
    let dbStatus = "healthy";
    let dbLatencyMs = 0;

    try {
        const dbStart = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        dbLatencyMs = Date.now() - dbStart;
    } catch {
        dbStatus = "unhealthy";
    }

    const response = {
        status: dbStatus === "healthy" ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || "0.1.0",
        commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local",
        uptime: process.uptime(),
        checks: {
            database: {
                status: dbStatus,
                latencyMs: dbLatencyMs,
            },
        },
        meta: {
            environment: process.env.NODE_ENV,
            region: process.env.VERCEL_REGION || "local",
            responseTimeMs: Date.now() - startTime,
        },
    };

    return NextResponse.json(response, {
        status: dbStatus === "healthy" ? 200 : 503,
    });
}
