import pino, { Logger } from "pino";

export type AppLogger = Logger;

export const logger = pino({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "development" ? "debug" : "info"),
    base: {
        service: "ritmo",
        env: process.env.NODE_ENV,
    },
    ...(process.env.NODE_ENV === "development" && {
        transport: {
            target: "pino-pretty",
            options: {
                colorize: true,
            },
        },
    }),
});
