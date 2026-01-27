"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    Button,
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
    StatusBadge,
} from "@/components/ui";
import type { StatusBadgeStatus } from "@/components/ui";
import {
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
    Clock,
    Lock,
    Mail,
    RefreshCw,
    Shield,
    TrendingUp,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CockpitStatus = "DRAFT" | "SENT" | "FOLLOW_UP_DUE" | "WAITING_REPLY" | "REPLIED" | "ARCHIVED";

interface CockpitItem {
    id: string;
    title: string;
    reference: string | null;
    customerName: string | null;
    status: CockpitStatus;
    lastContactAt: string | null;
    nextFollowUpAt: string | null;
    repliedAt: string | null;
    value: number | null;
    ageDays: number | null;
}

interface CockpitCounts {
    riskToday: number;
    risk7d: number;
    recovered30d: number;
    replyRate30d: number | null;
    sentCount30d: number;
}

interface CockpitLists {
    today: CockpitItem[];
    risk: CockpitItem[];
    waiting: CockpitItem[];
    recovered: CockpitItem[];
}

interface CockpitAha {
    ahaFirstBccCaptureAt: string | null;
    trialActive: boolean;
}

export interface CockpitData {
    tier: "free" | "trial" | "paid";
    planName: string;
    counts: CockpitCounts;
    lists: CockpitLists;
    aha: CockpitAha;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-PT", { day: "numeric", month: "short" });
}

function mapStatusToBadge(status: CockpitStatus): { status: StatusBadgeStatus; label: string } {
    switch (status) {
        case "FOLLOW_UP_DUE":
            return { status: "warning", label: "Follow-up pendente" };
        case "WAITING_REPLY":
            return { status: "pending", label: "Aguardando resposta" };
        case "REPLIED":
            return { status: "verified", label: "Respondido" };
        case "SENT":
            return { status: "active", label: "Enviado" };
        case "DRAFT":
            return { status: "info", label: "Rascunho" };
        case "ARCHIVED":
            return { status: "disabled", label: "Arquivado" };
        default:
            return { status: "info", label: status };
    }
}

function trackCockpitEvent(
    event: "viewed" | "followups_cta_clicked" | "upgrade_clicked",
    props?: Record<string, unknown>
): void {
    fetch("/api/tracking/cockpit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, ...props }),
    }).catch(() => {
        // Non-blocking
    });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CockpitItemRow({ item }: { item: CockpitItem }) {
    const badge = mapStatusToBadge(item.status);

    return (
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] py-3 last:border-0">
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{item.title}</span>
                    {item.reference && (
                        <span className="shrink-0 text-xs text-[var(--color-muted-foreground)]">
                            {item.reference}
                        </span>
                    )}
                </div>
                {item.customerName && (
                    <span className="text-xs text-[var(--color-muted-foreground)]">
                        {item.customerName}
                    </span>
                )}
                <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
                    {item.lastContactAt && (
                        <span>Contacto: {formatDate(item.lastContactAt)}</span>
                    )}
                    {item.nextFollowUpAt && (
                        <>
                            <span aria-hidden="true">&middot;</span>
                            <span>Seguinte: {formatDate(item.nextFollowUpAt)}</span>
                        </>
                    )}
                    {item.ageDays !== null && item.ageDays > 0 && (
                        <>
                            <span aria-hidden="true">&middot;</span>
                            <span>{item.ageDays}d</span>
                        </>
                    )}
                </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
                <StatusBadge status={badge.status} label={badge.label} />
                <Link href={`/quotes/${item.id}`}>
                    <Button size="sm" variant="outline">
                        Abrir
                    </Button>
                </Link>
            </div>
        </div>
    );
}

function TeaserOverlay({ onUpgradeClick }: { onUpgradeClick: () => void }) {
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-[var(--color-card)]/80 backdrop-blur-[2px]">
            <Lock className="mb-1.5 h-4 w-4 text-[var(--color-muted-foreground)]" />
            <p className="mb-2 text-xs text-[var(--color-muted-foreground)]">
                Disponivel no Starter
            </p>
            <Link href="/settings/billing" onClick={onUpgradeClick}>
                <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
                    Ativar Starter
                    <ArrowRight className="h-3 w-3" />
                </Button>
            </Link>
        </div>
    );
}

function MetricCard({
    label,
    value,
    icon,
    teaser,
    onUpgradeClick,
}: {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    teaser?: boolean;
    onUpgradeClick?: () => void;
}) {
    return (
        <div className="relative rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
            <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-muted-foreground)]">{label}</span>
                <span className="text-[var(--color-muted-foreground)]">{icon}</span>
            </div>
            <div className={`mt-2 text-2xl font-semibold ${teaser ? "blur-sm opacity-40" : ""}`}>
                {value}
            </div>
            {teaser && onUpgradeClick && <TeaserOverlay onUpgradeClick={onUpgradeClick} />}
        </div>
    );
}

// ---------------------------------------------------------------------------
// AHA Banner
// ---------------------------------------------------------------------------

function AhaBanner({ aha }: { aha: CockpitAha }) {
    if (aha.ahaFirstBccCaptureAt) {
        return (
            <div className="mb-6 rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-3">
                <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-green-500" />
                    <div>
                        <p className="text-sm font-medium text-green-600">
                            Captura BCC concluida. O Ritmo ja esta a trabalhar por si.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (aha.trialActive) {
        return (
            <div className="mb-6 rounded-lg border border-[var(--color-info)]/30 bg-[var(--color-info)]/5 px-4 py-3">
                <div className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-5 w-5 text-[var(--color-info)]" />
                    <div>
                        <p className="text-sm font-medium text-[var(--color-info)]">
                            Ative a captura BCC para receber propostas automaticamente.
                        </p>
                        <Link
                            href="/settings"
                            className="mt-1 inline-flex items-center text-sm font-medium text-[var(--color-info)] hover:underline"
                        >
                            Configurar BCC →
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function CockpitView({ data }: { data: CockpitData }) {
    const hasTrackedView = useRef(false);

    // Track cockpit view (once per mount)
    useEffect(() => {
        if (hasTrackedView.current) return;
        hasTrackedView.current = true;
        trackCockpitEvent("viewed", {
            tier: data.tier,
            riskToday: data.counts.riskToday,
        });
    }, [data.tier, data.counts.riskToday]);

    const handleFollowupsCta = () => {
        trackCockpitEvent("followups_cta_clicked", { tier: data.tier });
    };

    const handleUpgradeClick = () => {
        trackCockpitEvent("upgrade_clicked", { tier: data.tier });
    };

    const isFree = data.tier === "free";

    return (
        <>
            {/* AHA Banner */}
            <AhaBanner aha={data.aha} />

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Left column: Hoje + Pipeline */}
                <div className="space-y-6 lg:col-span-2">
                    {/* Card "Hoje" */}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" />
                                    Em risco hoje
                                </CardTitle>
                                <span className="text-3xl font-bold tabular-nums">
                                    {data.counts.riskToday}
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {data.lists.today.length > 0 ? (
                                <div>
                                    <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
                                        Lista de Hoje
                                    </p>
                                    {data.lists.today.map((item) => (
                                        <CockpitItemRow key={item.id} item={item} />
                                    ))}
                                    {data.counts.riskToday > 5 && (
                                        <p className="mt-2 text-center text-xs text-[var(--color-muted-foreground)]">
                                            +{data.counts.riskToday - 5} mais
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="py-6 text-center">
                                    <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-green-500/60" />
                                    <p className="text-sm font-medium">
                                        Hoje esta controlado.
                                    </p>
                                    <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                                        O Ritmo continua a monitorizar os proximos follow-ups.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Pipeline Tabs */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Pipeline</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="risk">
                                <TabsList className="w-full">
                                    <TabsTrigger value="risk" className="flex-1">
                                        Em risco ({data.lists.risk.length})
                                    </TabsTrigger>
                                    <TabsTrigger value="waiting" className="flex-1">
                                        Aguardando ({data.lists.waiting.length})
                                    </TabsTrigger>
                                    <TabsTrigger value="recovered" className="flex-1">
                                        Recuperados ({isFree ? Math.min(data.lists.recovered.length, 3) : data.lists.recovered.length})
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="risk">
                                    {data.lists.risk.length > 0 ? (
                                        data.lists.risk.map((item) => (
                                            <CockpitItemRow key={item.id} item={item} />
                                        ))
                                    ) : (
                                        <EmptyTab message="Sem orcamentos em risco." />
                                    )}
                                </TabsContent>

                                <TabsContent value="waiting">
                                    {data.lists.waiting.length > 0 ? (
                                        data.lists.waiting.map((item) => (
                                            <CockpitItemRow key={item.id} item={item} />
                                        ))
                                    ) : (
                                        <EmptyTab message="Sem orcamentos aguardando resposta." />
                                    )}
                                </TabsContent>

                                <TabsContent value="recovered">
                                    {data.lists.recovered.length > 0 ? (
                                        <div className="relative">
                                            {(isFree ? data.lists.recovered.slice(0, 3) : data.lists.recovered).map(
                                                (item) => (
                                                    <CockpitItemRow key={item.id} item={item} />
                                                )
                                            )}
                                            {isFree && data.lists.recovered.length > 3 && (
                                                <div className="relative mt-2 rounded-lg border border-dashed border-[var(--color-border)] p-4 text-center">
                                                    <Lock className="mx-auto mb-1 h-4 w-4 text-[var(--color-muted-foreground)]" />
                                                    <p className="text-xs text-[var(--color-muted-foreground)]">
                                                        +{data.lists.recovered.length - 3} mais no Starter
                                                    </p>
                                                    <Link href="/settings/billing" onClick={handleUpgradeClick}>
                                                        <Button size="sm" variant="outline" className="mt-2 h-7 text-xs">
                                                            Ativar Starter
                                                        </Button>
                                                    </Link>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <EmptyTab message="Sem recuperações registadas ainda." />
                                    )}
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>

                {/* Right column: Metrics + existing widgets */}
                <div className="space-y-4">
                    {/* Metricas rapidas */}
                    <MetricCard
                        label="Em risco (7 dias)"
                        value={data.counts.risk7d}
                        icon={<Clock className="h-4 w-4" />}
                    />
                    <MetricCard
                        label="Recuperados (30 dias)"
                        value={data.counts.recovered30d}
                        icon={<TrendingUp className="h-4 w-4" />}
                        teaser={isFree}
                        onUpgradeClick={handleUpgradeClick}
                    />
                    <MetricCard
                        label="Taxa de resposta (30 dias)"
                        value={
                            data.counts.replyRate30d !== null
                                ? `${data.counts.replyRate30d}%`
                                : "\u2014"
                        }
                        icon={<CheckCircle2 className="h-4 w-4" />}
                        teaser={isFree}
                        onUpgradeClick={handleUpgradeClick}
                    />
                    {data.counts.replyRate30d === null && !isFree && (
                        <p className="text-center text-xs text-[var(--color-muted-foreground)]">
                            Aparece com mais historico (min. 10 envios).
                        </p>
                    )}

                    {/* CTA: Enviar follow-ups */}
                    {data.counts.riskToday > 0 && (
                        <Link href="/dashboard" onClick={handleFollowupsCta}>
                            <Button className="w-full gap-2">
                                <Mail className="h-4 w-4" />
                                Enviar follow-ups
                            </Button>
                        </Link>
                    )}
                </div>
            </div>
        </>
    );
}

function EmptyTab({ message }: { message: string }) {
    return (
        <div className="py-8 text-center">
            <p className="text-sm text-[var(--color-muted-foreground)]">{message}</p>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Self-fetching wrapper (fetches /api/dashboard/cockpit on mount)
// ---------------------------------------------------------------------------

export function CockpitLoader() {
    const [data, setData] = useState<CockpitData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchCockpit() {
            try {
                const res = await fetch("/api/dashboard/cockpit");
                if (!res.ok) throw new Error("Erro ao carregar cockpit");
                const json = await res.json();
                setData(json);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Erro desconhecido");
            } finally {
                setLoading(false);
            }
        }
        fetchCockpit();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-[var(--color-muted-foreground)]" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="py-12 text-center text-sm text-[var(--color-muted-foreground)]">
                {error ?? "Erro ao carregar cockpit."}
            </div>
        );
    }

    return <CockpitView data={data} />;
}
