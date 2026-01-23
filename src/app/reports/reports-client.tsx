"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import {
    Send,
    CheckCircle,
    Target,
    Clock,
    RefreshCw,
    TrendingUp,
    TrendingDown,
} from "lucide-react";

interface DailyData {
    date: string;
    count: number;
}

interface ReportsData {
    period: {
        start: string;
        end: string;
        days: number;
    };
    kpis: {
        sentCount: number;
        completedActions: number;
        followUpRate: number;
        noResponseCount: number;
    };
    breakdown: {
        cadenceEventsCompleted: number;
        cadenceEventsTotal: number;
        tasksCompleted: number;
        tasksTotal: number;
    };
    series: {
        dailySent: DailyData[];
        dailyCompleted: DailyData[];
    };
}

export function ReportsClient() {
    const [data, setData] = useState<ReportsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch("/api/reports");
                if (!res.ok) {
                    throw new Error("Erro ao carregar relatórios");
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

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-[var(--color-muted-foreground)]" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-red-500">
                {error}
            </div>
        );
    }

    if (!data) return null;

    const { kpis, breakdown, series } = data;

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KPICard
                    title="Envios"
                    value={kpis.sentCount}
                    icon={<Send className="h-5 w-5" />}
                    subtitle="Orçamentos enviados"
                    color="blue"
                />
                <KPICard
                    title="Ações Concluídas"
                    value={kpis.completedActions}
                    icon={<CheckCircle className="h-5 w-5" />}
                    subtitle={`${breakdown.cadenceEventsCompleted} emails + ${breakdown.tasksCompleted} tarefas`}
                    color="green"
                />
                <KPICard
                    title="Taxa de Follow-up"
                    value={`${kpis.followUpRate}%`}
                    icon={<Target className="h-5 w-5" />}
                    subtitle="Ações concluídas vs. agendadas"
                    color="purple"
                    trend={kpis.followUpRate >= 80 ? "up" : kpis.followUpRate >= 50 ? "neutral" : "down"}
                />
                <KPICard
                    title="Sem Resposta >24h"
                    value={kpis.noResponseCount}
                    icon={<Clock className="h-5 w-5" />}
                    subtitle="Orçamentos a aguardar"
                    color="orange"
                    warning={kpis.noResponseCount > 5}
                />
            </div>

            {/* Charts */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Envios Diários</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <BarChart data={series.dailySent} color="var(--color-primary)" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Ações Concluídas Diárias</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <BarChart data={series.dailyCompleted} color="oklch(0.7 0.15 150)" />
                    </CardContent>
                </Card>
            </div>

            {/* Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Detalhe de Ações</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                        <BreakdownItem
                            label="Eventos de Cadência"
                            completed={breakdown.cadenceEventsCompleted}
                            total={breakdown.cadenceEventsTotal}
                        />
                        <BreakdownItem
                            label="Tarefas Manuais"
                            completed={breakdown.tasksCompleted}
                            total={breakdown.tasksTotal}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function KPICard({
    title,
    value,
    icon,
    subtitle,
    color,
    trend,
    warning,
}: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    subtitle?: string;
    color: "blue" | "green" | "purple" | "orange";
    trend?: "up" | "down" | "neutral";
    warning?: boolean;
}) {
    const colorClasses = {
        blue: "text-[var(--color-info)] bg-[var(--color-info-muted)]",
        green: "text-green-500 bg-green-500/10",
        purple: "text-purple-500 bg-purple-500/10",
        orange: "text-orange-500 bg-orange-500/10",
    };

    return (
        <Card className={warning ? "border-orange-500/30" : ""}>
            <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                    <div className={`rounded-lg p-2 ${colorClasses[color]}`}>
                        {icon}
                    </div>
                    {trend && (
                        <span className={trend === "up" ? "text-green-500" : trend === "down" ? "text-orange-500" : "text-[var(--color-muted-foreground)]"}>
                            {trend === "up" ? <TrendingUp className="h-4 w-4" /> : trend === "down" ? <TrendingDown className="h-4 w-4" /> : null}
                        </span>
                    )}
                </div>
                <div className="mt-4">
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-sm text-[var(--color-muted-foreground)]">{title}</p>
                    {subtitle && (
                        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{subtitle}</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function BarChart({ data, color }: { data: DailyData[]; color: string }) {
    if (data.length === 0) {
        return (
            <div className="flex h-32 items-center justify-center text-sm text-[var(--color-muted-foreground)]">
                Sem dados para o período
            </div>
        );
    }

    const maxValue = Math.max(...data.map((d) => d.count), 1);

    return (
        <div className="flex h-32 items-end gap-0.5">
            {data.map((d) => (
                <div key={d.date} className="group relative flex-1">
                    <div
                        className="w-full rounded-t transition-all hover:opacity-80"
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

function BreakdownItem({
    label,
    completed,
    total,
}: {
    label: string;
    completed: number;
    total: number;
}) {
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return (
        <div className="rounded-lg border border-[var(--color-border)] p-4">
            <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">{label}</span>
                <span className="text-sm text-[var(--color-muted-foreground)]">
                    {completed}/{total}
                </span>
            </div>
            <div className="h-2 w-full rounded-full bg-[var(--color-muted)]">
                <div
                    className="h-full rounded-full bg-[var(--color-primary)]"
                    style={{ width: `${rate}%` }}
                />
            </div>
            <p className="mt-1 text-right text-xs text-[var(--color-muted-foreground)]">
                {rate}% concluído
            </p>
        </div>
    );
}
