import { prisma } from "@/lib/prisma";

export default async function HealthPage() {
    let dbStatus = "🟢 Healthy";
    let dbError = null;

    try {
        await prisma.$queryRaw`SELECT 1`;
    } catch (e) {
        dbStatus = "🔴 Unhealthy";
        dbError = e instanceof Error ? e.message : "Unknown error";
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-8">
            <div className="w-full max-w-md rounded-xl bg-[var(--color-card)] p-8">
                <h1 className="mb-6 text-2xl font-bold">System Health</h1>

                <div className="space-y-4">
                    {/* Overall Status */}
                    <div className="flex items-center justify-between rounded-lg bg-[var(--color-background)] p-4">
                        <span className="font-medium">Status</span>
                        <span className={dbError ? "text-red-400" : "text-green-400"}>
                            {dbError ? "🔴 Degraded" : "🟢 Healthy"}
                        </span>
                    </div>

                    {/* Database */}
                    <div className="flex items-center justify-between rounded-lg bg-[var(--color-background)] p-4">
                        <span className="font-medium">Database</span>
                        <span className={dbError ? "text-red-400" : "text-green-400"}>
                            {dbStatus}
                        </span>
                    </div>

                    {/* Version */}
                    <div className="flex items-center justify-between rounded-lg bg-[var(--color-background)] p-4">
                        <span className="font-medium">Version</span>
                        <span className="font-mono text-sm text-[var(--color-muted-foreground)]">
                            v0.1.0
                        </span>
                    </div>

                    {/* Commit */}
                    <div className="flex items-center justify-between rounded-lg bg-[var(--color-background)] p-4">
                        <span className="font-medium">Commit</span>
                        <span className="font-mono text-sm text-[var(--color-muted-foreground)]">
                            {process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local"}
                        </span>
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center justify-between rounded-lg bg-[var(--color-background)] p-4">
                        <span className="font-medium">Checked</span>
                        <span className="font-mono text-sm text-[var(--color-muted-foreground)]">
                            {new Date().toISOString()}
                        </span>
                    </div>
                </div>

                {dbError && (
                    <div className="mt-4 rounded-lg bg-red-500/10 p-4 text-sm text-red-400">
                        <strong>Error:</strong> {dbError}
                    </div>
                )}

                <div className="mt-6 text-center">
                    <a
                        href="/api/health"
                        className="text-sm text-[var(--color-primary)] hover:underline"
                    >
                        View JSON →
                    </a>
                </div>
            </div>
        </div>
    );
}
