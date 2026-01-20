"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, Button } from "@/components/ui";
import { RefreshCw, TrendingUp, TrendingDown, Minus, Clock, Users, Zap, Repeat } from "lucide-react";

interface Metrics {
    signupsCount: number;
    ahaCount: number;
    activationRate5m: number;
    activationRate24h: number;
    medianTimeToAhaSeconds: number | null;
    retention7dSecondSendRate: number;
}

interface Targets {
    medianTimeToAhaSeconds: number;
    clicksToAha: number;
    activationRate5m: number;
    activationRate24h: number;
    retention7dSecondSendRate: number;
}

interface DailyData {
    date: string;
    count: number;
}

interface MetricsResponse {
    range: string;
    startDate: string;
    endDate: string;
    metrics: Metrics;
    targets: Targets;
    series: {
        dailySignups: DailyData[];
        dailyAha: DailyData[];
    };
}

export function AdminMetricsClient() {
    const [data, setData] = useState<MetricsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [range, setRange] = useState<"7d" | "14d" | "30d">("7d");

    const fetchMetrics = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/admin/metrics?range=${range}`);
            if (!response.ok) {
                throw new Error("Failed to fetch metrics");
            }
            const json = await response.json();
            setData(json);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
    }, [range]);

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-[var(--color-muted-foreground)]" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-red-500">
                Error: {error}
            </div>
        );
    }

    if (!data) return null;

    const { metrics, targets, series } = data;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Product Metrics</h2>
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                        Activation & Retention Dashboard
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex rounded-md border border-[var(--color-border)]">
                        {(["7d", "14d", "30d"] as const).map((r) => (
                            <button
                                key={r}
                                onClick={() => setRange(r)}
                                className={`px-3 py-1.5 text-sm ${
                                    range === r
                                        ? "bg-[var(--color-primary)] text-white"
                                        : "hover:bg-[var(--color-muted)]"
                                }`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchMetrics}
                        disabled={loading}
                        className="gap-1.5"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    title="Signups"
                    value={metrics.signupsCount}
                    icon={<Users className="h-4 w-4" />}
                />
                <MetricCard
                    title="Aha (1st Sent)"
                    value={metrics.ahaCount}
                    icon={<Zap className="h-4 w-4" />}
                    subtitle={`${metrics.signupsCount > 0 ? Math.round((metrics.ahaCount / metrics.signupsCount) * 100) : 0}% of signups`}
                />
                <MetricCard
                    title="Time-to-Aha (median)"
                    value={
                        metrics.medianTimeToAhaSeconds
                            ? formatDuration(metrics.medianTimeToAhaSeconds)
                            : "N/A"
                    }
                    icon={<Clock className="h-4 w-4" />}
                    target={`Target: <${formatDuration(targets.medianTimeToAhaSeconds)}`}
                    status={
                        metrics.medianTimeToAhaSeconds
                            ? metrics.medianTimeToAhaSeconds <= targets.medianTimeToAhaSeconds
                                ? "good"
                                : "bad"
                            : "neutral"
                    }
                />
                <MetricCard
                    title="Retention 7d (2nd Send)"
                    value={`${metrics.retention7dSecondSendRate}%`}
                    icon={<Repeat className="h-4 w-4" />}
                    target={`Target: ${targets.retention7dSecondSendRate}%`}
                    status={
                        metrics.retention7dSecondSendRate >= targets.retention7dSecondSendRate
                            ? "good"
                            : metrics.retention7dSecondSendRate >= targets.retention7dSecondSendRate * 0.8
                                ? "warning"
                                : "bad"
                    }
                />
            </div>

            {/* Activation Rates */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Activation in 5 minutes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end justify-between">
                            <div>
                                <div className="text-3xl font-bold">{metrics.activationRate5m}%</div>
                                <p className="text-sm text-[var(--color-muted-foreground)]">
                                    Target: {targets.activationRate5m}%
                                </p>
                            </div>
                            <StatusIndicator
                                value={metrics.activationRate5m}
                                target={targets.activationRate5m}
                            />
                        </div>
                        <div className="mt-4 h-2 rounded-full bg-[var(--color-muted)]">
                            <div
                                className="h-full rounded-full bg-[var(--color-primary)]"
                                style={{ width: `${Math.min(100, metrics.activationRate5m)}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Activation in 24 hours</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end justify-between">
                            <div>
                                <div className="text-3xl font-bold">{metrics.activationRate24h}%</div>
                                <p className="text-sm text-[var(--color-muted-foreground)]">
                                    Target: {targets.activationRate24h}%
                                </p>
                            </div>
                            <StatusIndicator
                                value={metrics.activationRate24h}
                                target={targets.activationRate24h}
                            />
                        </div>
                        <div className="mt-4 h-2 rounded-full bg-[var(--color-muted)]">
                            <div
                                className="h-full rounded-full bg-[var(--color-primary)]"
                                style={{ width: `${Math.min(100, metrics.activationRate24h)}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Daily Charts */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Daily Signups</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <SimpleBarChart data={series.dailySignups} color="var(--color-primary)" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Daily Aha Events</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <SimpleBarChart data={series.dailyAha} color="oklch(0.7 0.15 150)" />
                    </CardContent>
                </Card>
            </div>

            {/* Raw Data */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Raw Data</CardTitle>
                </CardHeader>
                <CardContent>
                    <pre className="overflow-auto rounded bg-[var(--color-muted)] p-4 text-xs">
                        {JSON.stringify(data, null, 2)}
                    </pre>
                </CardContent>
            </Card>
        </div>
    );
}

// Helper components

function MetricCard({
    title,
    value,
    icon,
    subtitle,
    target,
    status,
}: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    subtitle?: string;
    target?: string;
    status?: "good" | "warning" | "bad" | "neutral";
}) {
    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--color-muted-foreground)]">{title}</span>
                    <span className="text-[var(--color-muted-foreground)]">{icon}</span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{value}</span>
                    {status && status !== "neutral" && (
                        <span
                            className={`text-xs ${
                                status === "good"
                                    ? "text-green-500"
                                    : status === "warning"
                                        ? "text-orange-500"
                                        : "text-red-500"
                            }`}
                        >
                            {status === "good" ? "On target" : status === "warning" ? "Close" : "Below target"}
                        </span>
                    )}
                </div>
                {subtitle && (
                    <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{subtitle}</p>
                )}
                {target && (
                    <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{target}</p>
                )}
            </CardContent>
        </Card>
    );
}

function StatusIndicator({ value, target }: { value: number; target: number }) {
    const ratio = value / target;

    if (ratio >= 1) {
        return (
            <div className="flex items-center gap-1 text-green-500">
                <TrendingUp className="h-5 w-5" />
            </div>
        );
    } else if (ratio >= 0.8) {
        return (
            <div className="flex items-center gap-1 text-orange-500">
                <Minus className="h-5 w-5" />
            </div>
        );
    } else {
        return (
            <div className="flex items-center gap-1 text-red-500">
                <TrendingDown className="h-5 w-5" />
            </div>
        );
    }
}

function SimpleBarChart({ data, color }: { data: DailyData[]; color: string }) {
    const maxValue = Math.max(...data.map((d) => d.count), 1);

    return (
        <div className="flex h-32 items-end gap-1">
            {data.map((d) => (
                <div key={d.date} className="group relative flex-1">
                    <div
                        className="w-full rounded-t"
                        style={{
                            height: `${Math.max(4, (d.count / maxValue) * 100)}%`,
                            backgroundColor: color,
                            minHeight: "4px",
                        }}
                    />
                    <div className="absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-[var(--color-foreground)] px-2 py-1 text-xs text-[var(--color-background)] group-hover:block">
                        {d.date}: {d.count}
                    </div>
                </div>
            ))}
        </div>
    );
}

function formatDuration(seconds: number): string {
    if (seconds < 60) {
        return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
    } else {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.round((seconds % 3600) / 60);
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
}
