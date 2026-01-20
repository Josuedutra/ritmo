import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
    let dbStatus: "ok" | "error" = "ok";
    let dbLatencyMs: number | undefined;

    try {
        const dbStart = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        dbLatencyMs = Date.now() - dbStart;
    } catch (e) {
        dbStatus = "error";
        // Log error with Pino - never expose raw error in response
        logger.error({ err: e, scope: "healthcheck" }, "DB healthcheck failed");
    }

    const status = dbStatus === "ok" ? "operational" : "degraded";

    const response = {
        status,
        db: {
            status: dbStatus,
            ...(dbLatencyMs !== undefined && { latencyMs: dbLatencyMs }),
        },
        version: process.env.APP_VERSION || "v0.1.0",
        commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local",
        timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, {
        status: dbStatus === "ok" ? 200 : 503,
    });
}
