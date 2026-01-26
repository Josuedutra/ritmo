import pino, { Logger } from "pino";

export type AppLogger = Logger;

// Note: pino-pretty transport is disabled because Turbopack/Next.js 16 doesn't support
// pino's transport system at build time. Logs will be JSON in all environments.
// For local dev, you can pipe output through pino-pretty: `pnpm dev | pnpm pino-pretty`
export const logger = pino({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "development" ? "debug" : "info"),
    base: {
        service: "ritmo",
        env: process.env.NODE_ENV,
    },
});
