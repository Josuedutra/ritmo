type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
    [key: string]: unknown;
}

interface Logger {
    debug: (msgOrContext: string | LogContext, msg?: string) => void;
    info: (msgOrContext: string | LogContext, msg?: string) => void;
    warn: (msgOrContext: string | LogContext, msg?: string) => void;
    error: (msgOrContext: string | LogContext, msg?: string) => void;
    child: (context: LogContext) => Logger;
}

function formatLog(level: LogLevel, context: LogContext, message?: string) {
    const timestamp = new Date().toISOString();
    const logObj = {
        timestamp,
        level,
        ...context,
        ...(message && { msg: message }),
    };
    return JSON.stringify(logObj);
}

function createLogger(baseContext: LogContext = {}): Logger {
    const log = (level: LogLevel, msgOrContext: string | LogContext, msg?: string) => {
        let context = { ...baseContext };
        let message: string | undefined;

        if (typeof msgOrContext === "string") {
            message = msgOrContext;
        } else {
            context = { ...context, ...msgOrContext };
            message = msg;
        }

        const output = formatLog(level, context, message);

        switch (level) {
            case "debug":
                if (process.env.NODE_ENV === "development") {
                    console.debug(output);
                }
                break;
            case "info":
                console.info(output);
                break;
            case "warn":
                console.warn(output);
                break;
            case "error":
                console.error(output);
                break;
        }
    };

    return {
        debug: (msgOrContext, msg) => log("debug", msgOrContext, msg),
        info: (msgOrContext, msg) => log("info", msgOrContext, msg),
        warn: (msgOrContext, msg) => log("warn", msgOrContext, msg),
        error: (msgOrContext, msg) => log("error", msgOrContext, msg),
        child: (context) => createLogger({ ...baseContext, ...context }),
    };
}

export const logger = createLogger({
    service: "ritmo",
    env: process.env.NODE_ENV,
});
