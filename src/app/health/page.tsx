import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, Badge } from "@/components/ui";
import { CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand";

interface HealthResponse {
    status: "operational" | "degraded";
    db: {
        status: "ok" | "error";
        latencyMs?: number;
    };
    version: string;
    commit: string;
    timestamp: string;
}

async function getHealth(): Promise<HealthResponse> {
    try {
        // Use absolute URL for server-side fetch
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : "http://localhost:3000";

        const res = await fetch(`${baseUrl}/api/health`, {
            cache: "no-store",
        });

        if (!res.ok) {
            // Return degraded status if fetch fails but we got a response
            return await res.json();
        }

        return await res.json();
    } catch {
        // Return degraded status if fetch completely fails
        return {
            status: "degraded",
            db: { status: "error" },
            version: process.env.APP_VERSION || "v0.1.0",
            commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local",
            timestamp: new Date().toISOString(),
        };
    }
}

export default async function HealthPage() {
    const health = await getHealth();
    const isHealthy = health.status === "operational";

    return (
        <div className="min-h-screen bg-[var(--color-background)]">
            {/* Header */}
            <header className="border-b border-[var(--color-border)]">
                <div className="container-app flex h-14 items-center gap-4">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Voltar
                    </Link>
                    <Logo size="sm" />
                </div>
            </header>

            <main className="container-app py-8">
                <div className="mx-auto max-w-md">
                    <Card>
                        <CardHeader className="text-center">
                            <div className="mx-auto mb-3">
                                {isHealthy ? (
                                    <CheckCircle2 className="h-12 w-12 text-[var(--color-success)]" />
                                ) : (
                                    <XCircle className="h-12 w-12 text-[var(--color-destructive)]" />
                                )}
                            </div>
                            <CardTitle>Estado do Sistema</CardTitle>
                        </CardHeader>

                        <CardContent className="space-y-3">
                            {/* Overall Status */}
                            <div className="flex items-center justify-between rounded-md bg-[var(--color-muted)] p-3">
                                <span className="text-sm font-medium">Status</span>
                                <Badge variant={isHealthy ? "success" : "destructive"}>
                                    {isHealthy ? "Operacional" : "Degradado"}
                                </Badge>
                            </div>

                            {/* Database */}
                            <div className="flex items-center justify-between rounded-md bg-[var(--color-muted)] p-3">
                                <span className="text-sm font-medium">Base de dados</span>
                                <div className="flex items-center gap-2">
                                    {health.db.status === "ok" && health.db.latencyMs !== undefined && (
                                        <span className="text-xs text-[var(--color-muted-foreground)]">
                                            {health.db.latencyMs}ms
                                        </span>
                                    )}
                                    <Badge variant={health.db.status === "ok" ? "success" : "destructive"}>
                                        {health.db.status === "ok" ? "OK" : "Erro"}
                                    </Badge>
                                </div>
                            </div>

                            {/* Version */}
                            <div className="flex items-center justify-between rounded-md bg-[var(--color-muted)] p-3">
                                <span className="text-sm font-medium">Versão</span>
                                <span className="font-mono text-sm text-[var(--color-muted-foreground)]">
                                    {health.version}
                                </span>
                            </div>

                            {/* Commit */}
                            <div className="flex items-center justify-between rounded-md bg-[var(--color-muted)] p-3">
                                <span className="text-sm font-medium">Commit</span>
                                <span className="font-mono text-sm text-[var(--color-muted-foreground)]">
                                    {health.commit}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* API Link */}
                    <p className="mt-4 text-center text-sm text-[var(--color-muted-foreground)]">
                        <a
                            href="/api/health"
                            className="underline hover:text-[var(--color-foreground)]"
                        >
                            Ver resposta JSON →
                        </a>
                    </p>
                </div>
            </main>
        </div>
    );
}
