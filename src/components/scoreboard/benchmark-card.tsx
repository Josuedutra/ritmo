"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, Button } from "@/components/ui";
import {
    BarChart3,
    Lock,
    ArrowRight,
    RefreshCw,
    TrendingUp,
    TrendingDown,
    Minus,
    AlertCircle,
} from "lucide-react";

// P1-UPGRADE-PROMPTS: Track benchmark locked event
async function trackBenchmarkLocked(): Promise<void> {
    try {
        await fetch("/api/tracking/upgrade-prompt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                event: "shown",
                reason: "benchmark_locked",
                location: "benchmark_card",
            }),
        });
    } catch {
        // Silently ignore
    }
}

async function trackBenchmarkClicked(): Promise<void> {
    try {
        await fetch("/api/tracking/upgrade-prompt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                event: "clicked",
                reason: "benchmark_locked",
                location: "benchmark_card",
            }),
        });
    } catch {
        // Silently ignore
    }
}

interface MetricPercentiles {
    value: number;
    p50: number;
    p75: number;
    p90: number;
}

interface BenchmarkMetrics {
    sentCount: MetricPercentiles;
    completedActions: MetricPercentiles;
    followUpRate: MetricPercentiles;
}

interface BenchmarkResponse {
    access: "full";
    hasData: boolean;
    sector?: string;
    sectorLabel?: string;
    sampleSize?: number;
    minRequired?: number;
    needsSector?: boolean;
    settingsUrl?: string;
    message?: string;
    metrics?: BenchmarkMetrics;
}

export function BenchmarkCard() {
    const [data, setData] = useState<BenchmarkResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [forbidden, setForbidden] = useState(false);

    // P1-UPGRADE-PROMPTS: Handle CTA click (must be before any conditional returns)
    const handleUpgradeClick = useCallback(() => {
        trackBenchmarkClicked();
    }, []);

    // Fetch benchmark data
    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch("/api/dashboard/benchmark");
                if (!res.ok) {
                    if (res.status === 403) {
                        setForbidden(true);
                        return;
                    }
                    throw new Error("Erro ao carregar benchmark");
                }
                const json = await res.json();
                setData(json);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Erro desconhecido");
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    // P1-UPGRADE-PROMPTS: Track when forbidden teaser is shown
    useEffect(() => {
        if (forbidden) {
            trackBenchmarkLocked();
        }
    }, [forbidden]);

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

    // Forbidden - show upgrade teaser
    if (forbidden) {
        return (
            <Card className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent" />
                <CardHeader className="relative">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <BarChart3 className="h-4 w-4" />
                        Benchmark
                        <span className="ml-auto rounded bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-500">
                            Pro
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                    <div className="flex flex-col items-center py-4 text-center">
                        <Lock className="mb-3 h-8 w-8 text-[var(--color-muted-foreground)]" />
                        <p className="mb-1 text-sm font-medium">
                            Compare o seu desempenho com o mercado
                        </p>
                        <p className="mb-4 text-xs text-[var(--color-muted-foreground)]">
                            Veja como está a performar vs. outras empresas do seu setor
                        </p>
                        <Link href="/settings/billing" onClick={handleUpgradeClick}>
                            <Button size="sm" variant="outline" className="gap-1">
                                Desbloquear Benchmark
                                <ArrowRight className="h-3 w-3" />
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!data) {
        return null;
    }

    // No sector selected
    if (data.needsSector) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <BarChart3 className="h-4 w-4" />
                        Benchmark
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center py-4 text-center">
                        <AlertCircle className="mb-3 h-8 w-8 text-[var(--color-muted-foreground)]" />
                        <p className="mb-3 text-sm text-[var(--color-muted-foreground)]">
                            {data.message}
                        </p>
                        <Link href={data.settingsUrl || "/settings"}>
                            <Button size="sm" variant="outline">
                                Configurar setor
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Not enough data
    if (!data.hasData) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <BarChart3 className="h-4 w-4" />
                        Benchmark - {data.sectorLabel}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center py-4 text-center">
                        <AlertCircle className="mb-3 h-8 w-8 text-orange-500/60" />
                        <p className="text-sm text-[var(--color-muted-foreground)]">
                            {data.message}
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Full benchmark data
    const metrics = data.metrics!;

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                        Benchmark - {data.sectorLabel}
                    </span>
                    <span className="text-xs font-normal text-[var(--color-muted-foreground)]">
                        vs. {data.sampleSize} empresas
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <BenchmarkMetric
                    label="Envios (30d)"
                    value={metrics.sentCount.value}
                    p50={metrics.sentCount.p50}
                    p75={metrics.sentCount.p75}
                    p90={metrics.sentCount.p90}
                />
                <BenchmarkMetric
                    label="Ações concluídas"
                    value={metrics.completedActions.value}
                    p50={metrics.completedActions.p50}
                    p75={metrics.completedActions.p75}
                    p90={metrics.completedActions.p90}
                />
                <BenchmarkMetric
                    label="Taxa follow-up"
                    value={metrics.followUpRate.value}
                    p50={metrics.followUpRate.p50}
                    p75={metrics.followUpRate.p75}
                    p90={metrics.followUpRate.p90}
                    suffix="%"
                />
            </CardContent>
        </Card>
    );
}

function BenchmarkMetric({
    label,
    value,
    p50,
    p75,
    p90,
    suffix = "",
}: {
    label: string;
    value: number;
    p50: number;
    p75: number;
    p90: number;
    suffix?: string;
}) {
    // Determine position relative to percentiles
    const getPosition = () => {
        if (value >= p90) return { label: "Top 10%", color: "text-green-500", icon: TrendingUp };
        if (value >= p75) return { label: "Top 25%", color: "text-green-500", icon: TrendingUp };
        if (value >= p50) return { label: "Acima da média", color: "text-[var(--color-info)]", icon: TrendingUp };
        if (value >= p50 * 0.8) return { label: "Média", color: "text-[var(--color-muted-foreground)]", icon: Minus };
        return { label: "Abaixo da média", color: "text-orange-500", icon: TrendingDown };
    };

    const position = getPosition();
    const Icon = position.icon;

    // Calculate position on the bar (0-100)
    const maxVal = Math.max(p90 * 1.2, value);
    const barPosition = Math.min(100, (value / maxVal) * 100);
    const p50Position = (p50 / maxVal) * 100;
    const p75Position = (p75 / maxVal) * 100;
    const p90Position = (p90 / maxVal) * 100;

    return (
        <div>
            <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm text-[var(--color-muted-foreground)]">{label}</span>
                <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold">
                        {value}{suffix}
                    </span>
                    <span className={`flex items-center gap-0.5 text-xs ${position.color}`}>
                        <Icon className="h-3 w-3" />
                        {position.label}
                    </span>
                </div>
            </div>
            <div className="relative h-2 rounded-full bg-[var(--color-muted)]">
                {/* Percentile markers */}
                <div
                    className="absolute top-0 h-full w-0.5 bg-[var(--color-border)]"
                    style={{ left: `${p50Position}%` }}
                    title={`P50: ${p50}${suffix}`}
                />
                <div
                    className="absolute top-0 h-full w-0.5 bg-[var(--color-border)]"
                    style={{ left: `${p75Position}%` }}
                    title={`P75: ${p75}${suffix}`}
                />
                <div
                    className="absolute top-0 h-full w-0.5 bg-[var(--color-border)]"
                    style={{ left: `${p90Position}%` }}
                    title={`P90: ${p90}${suffix}`}
                />
                {/* Value indicator */}
                <div
                    className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--color-primary)] shadow-sm"
                    style={{ left: `${barPosition}%` }}
                />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-[var(--color-muted-foreground)]">
                <span>P50: {p50}{suffix}</span>
                <span>P75: {p75}{suffix}</span>
                <span>P90: {p90}{suffix}</span>
            </div>
        </div>
    );
}
