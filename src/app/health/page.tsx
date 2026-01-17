import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, Badge } from "@/components/ui";
import { CheckCircle2, XCircle, ArrowLeft } from "lucide-react";

export default async function HealthPage() {
    let dbStatus = "healthy";
    let dbLatency = 0;
    let dbError: string | null = null;

    try {
        const start = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        dbLatency = Date.now() - start;
    } catch (e) {
        dbStatus = "unhealthy";
        dbError = e instanceof Error ? e.message : "Unknown error";
    }

    const isHealthy = dbStatus === "healthy";

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
                    <span className="text-xl font-bold text-gradient">Ritmo</span>
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
                            <div className="flex items-center justify-between rounded-md bg-[var(--color-background)] p-3">
                                <span className="text-sm font-medium">Status</span>
                                <Badge variant={isHealthy ? "success" : "destructive"}>
                                    {isHealthy ? "Operacional" : "Degradado"}
                                </Badge>
                            </div>

                            {/* Database */}
                            <div className="flex items-center justify-between rounded-md bg-[var(--color-background)] p-3">
                                <span className="text-sm font-medium">Base de dados</span>
                                <div className="flex items-center gap-2">
                                    {dbStatus === "healthy" && (
                                        <span className="text-xs text-[var(--color-muted-foreground)]">
                                            {dbLatency}ms
                                        </span>
                                    )}
                                    <Badge variant={dbStatus === "healthy" ? "success" : "destructive"}>
                                        {dbStatus === "healthy" ? "OK" : "Erro"}
                                    </Badge>
                                </div>
                            </div>

                            {/* Version */}
                            <div className="flex items-center justify-between rounded-md bg-[var(--color-background)] p-3">
                                <span className="text-sm font-medium">Versão</span>
                                <span className="font-mono text-sm text-[var(--color-muted-foreground)]">
                                    v0.1.0
                                </span>
                            </div>

                            {/* Commit */}
                            <div className="flex items-center justify-between rounded-md bg-[var(--color-background)] p-3">
                                <span className="text-sm font-medium">Commit</span>
                                <span className="font-mono text-sm text-[var(--color-muted-foreground)]">
                                    {process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local"}
                                </span>
                            </div>

                            {/* Error Message */}
                            {dbError && (
                                <div className="rounded-md border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/10 p-3">
                                    <p className="text-xs text-[var(--color-destructive)]">
                                        <strong>Erro:</strong> {dbError}
                                    </p>
                                </div>
                            )}
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
