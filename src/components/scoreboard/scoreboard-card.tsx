"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, Button } from "@/components/ui";
import {
    TrendingUp,
    Send,
    CheckCircle,
    Target,
    Clock,
    Lock,
    ArrowRight,
    RefreshCw,
} from "lucide-react";
import { useAhaCelebration } from "@/hooks/use-aha-celebration";

interface DailyMetric {
    date: string;
    sentCount: number;
    completedActions: number;
    followUpRate: number;
}

interface ScoreboardData {
    sentCount: number;
    completedActions: number;
    followUpRate: number;
    noResponseCount: number;
    dailyMetrics: DailyMetric[];
}

interface ScoreboardResponse {
    access: "full" | "teaser";
    tier: "paid" | "trial" | "free";
    organizationId?: string;
    data?: ScoreboardData;
    message?: string;
    upgradeUrl?: string;
    preview?: {
        sentCount: string;
        completedActions: string;
        followUpRate: string;
        noResponseCount: string;
    };
}

interface EntitlementsResponse {
    tier: string;
    ahaFirstBccCaptureAt: string | null;
}

export function ScoreboardCard() {
    const [data, setData] = useState<ScoreboardResponse | null>(null);
    const [entitlements, setEntitlements] = useState<EntitlementsResponse | null>(null);
    const [organizationId, setOrganizationId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // AHA celebration hook
    const { isHighlighted } = useAhaCelebration({
        organizationId,
        ahaFirstBccCaptureAt: entitlements?.ahaFirstBccCaptureAt ?? null,
    });

    useEffect(() => {
        async function fetchData() {
            try {
                // Fetch scoreboard and entitlements in parallel
                const [scoreboardRes, entitlementsRes] = await Promise.all([
                    fetch("/api/dashboard/scoreboard"),
                    fetch("/api/entitlements"),
                ]);

                if (!scoreboardRes.ok) {
                    if (scoreboardRes.status === 403) {
                        // Free tier - no access
                        setData(null);
                        return;
                    }
                    throw new Error("Erro ao carregar scoreboard");
                }

                const scoreboardJson = await scoreboardRes.json();
                setData(scoreboardJson);

                // Extract org ID from scoreboard response if available
                if (scoreboardJson.organizationId) {
                    setOrganizationId(scoreboardJson.organizationId);
                }

                // Parse entitlements for AHA celebration
                if (entitlementsRes.ok) {
                    const entitlementsJson = await entitlementsRes.json();
                    setEntitlements(entitlementsJson.data);
                    // Get org ID from session context (stored in response)
                    if (entitlementsJson.data) {
                        // Org ID will be fetched from another source
                    }
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Erro desconhecido");
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-8">
                    <RefreshCw className="h-5 w-5 animate-spin text-[var(--color-muted-foreground)]" />
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardContent className="py-8 text-center text-sm text-[var(--color-muted-foreground)]">
                    {error}
                </CardContent>
            </Card>
        );
    }

    // Free tier - don't show anything
    if (!data) {
        return null;
    }

    // Trial teaser
    if (data.access === "teaser") {
        return (
            <Card className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/5 to-transparent" />
                <CardHeader className="relative">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <TrendingUp className="h-4 w-4" />
                        Scoreboard
                        <span className="ml-auto rounded bg-[var(--color-primary)]/10 px-2 py-0.5 text-xs font-medium text-[var(--color-primary)]">
                            Pro
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                    <div className="grid grid-cols-2 gap-4 opacity-40 blur-sm">
                        <MetricBox label="Envios" value="—" icon={<Send className="h-4 w-4" />} />
                        <MetricBox label="Concluídas" value="—" icon={<CheckCircle className="h-4 w-4" />} />
                        <MetricBox label="Taxa" value="—" icon={<Target className="h-4 w-4" />} />
                        <MetricBox label="Aging" value="—" icon={<Clock className="h-4 w-4" />} />
                    </div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <Lock className="mb-2 h-6 w-6 text-[var(--color-muted-foreground)]" />
                        <p className="mb-3 text-center text-sm text-[var(--color-muted-foreground)]">
                            {data.message}
                        </p>
                        <Link href={data.upgradeUrl || "/settings/billing"}>
                            <Button size="sm" className="gap-1">
                                Ver planos
                                <ArrowRight className="h-3 w-3" />
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Full access
    const metrics = data.data!;

    // Premium highlight classes for AHA celebration
    // Uses brand token for consistent Ritmo styling
    const highlightClasses = isHighlighted
        ? "ring-2 ring-brand/30 shadow-md shadow-brand/10 transition-all duration-300 ease-out"
        : "transition-all duration-300 ease-out";

    return (
        <Card className={highlightClasses}>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                        Scoreboard (30 dias)
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-4">
                    <MetricBox
                        label="Envios"
                        value={metrics.sentCount.toString()}
                        icon={<Send className="h-4 w-4 text-[var(--color-info)]" />}
                    />
                    <MetricBox
                        label="Ações concluídas"
                        value={metrics.completedActions.toString()}
                        icon={<CheckCircle className="h-4 w-4 text-green-500" />}
                    />
                    <MetricBox
                        label="Taxa follow-up"
                        value={`${metrics.followUpRate}%`}
                        icon={<Target className="h-4 w-4 text-purple-500" />}
                        highlight={metrics.followUpRate >= 80}
                    />
                    <MetricBox
                        label="Sem resposta >24h"
                        value={metrics.noResponseCount.toString()}
                        icon={<Clock className="h-4 w-4 text-orange-500" />}
                        warning={metrics.noResponseCount > 5}
                    />
                </div>

                {/* Mini sparkline chart */}
                {metrics.dailyMetrics.length > 0 && (
                    <div className="mt-4">
                        <p className="mb-2 text-xs text-[var(--color-muted-foreground)]">
                            Envios diários
                        </p>
                        <MiniChart data={metrics.dailyMetrics.map((d) => d.sentCount)} />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function MetricBox({
    label,
    value,
    icon,
    highlight,
    warning,
}: {
    label: string;
    value: string;
    icon: React.ReactNode;
    highlight?: boolean;
    warning?: boolean;
}) {
    return (
        <div
            className={`rounded-lg border p-3 ${
                highlight
                    ? "border-green-500/30 bg-green-500/5"
                    : warning
                        ? "border-orange-500/30 bg-orange-500/5"
                        : "border-[var(--color-border)] bg-[var(--color-card)]"
            }`}
        >
            <div className="mb-1 flex items-center gap-1.5 text-[var(--color-muted-foreground)]">
                {icon}
                <span className="text-xs">{label}</span>
            </div>
            <div className="text-xl font-semibold">{value}</div>
        </div>
    );
}

function MiniChart({ data }: { data: number[] }) {
    const max = Math.max(...data, 1);
    const last7 = data.slice(-7);

    return (
        <div className="flex h-8 items-end gap-0.5">
            {last7.map((value, i) => (
                <div
                    key={i}
                    className="flex-1 rounded-t bg-[var(--color-primary)]/60"
                    style={{
                        height: `${Math.max(8, (value / max) * 100)}%`,
                    }}
                />
            ))}
        </div>
    );
}
