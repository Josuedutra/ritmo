"use client";

import { useState, useEffect, useCallback } from "react";

interface Alert {
    code: string;
    message: string;
    value: number;
    threshold: number;
}

interface MetricsResponse {
    healthy: boolean;
    requestId: string;
    timestamp: string;
    coverage: {
        inbound: boolean;
        stripe: boolean;
        cron: boolean;
    };
    alerts: Alert[];
    metrics: {
        inbound: {
            total24h: number | null;
            processed24h: number | null;
            rejected24h: number | null;
            rejectionRate: number | null;
        };
        stripe: {
            total24h: number | null;
            processed24h: number | null;
            failed24h: number | null;
            failureRate: number | null;
        };
        cron: {
            pendingPurge: number | null;
            lastPurge: string | null;
            isStale: boolean;
        };
    };
    thresholds: {
        inboundRejectionRate: number;
        inboundMinEvents: number;
        stripeFailures: number;
        cronPendingPurge: number;
        cronStaleHours: number;
    };
    error?: string;
}

interface CronResponse {
    status: string;
    cron: {
        purgeProposals: {
            lastRun24h: boolean;
            lastSuccess: string | null;
            pendingPurge: number;
            purgedLast24h: number;
        };
    };
}

interface InboundResponse {
    status: string;
    coverage: boolean;
    inbound: {
        received24h: number | null;
        processed24h: number | null;
        rejected24h: number | null;
        successRate: number | null;
        rejectionRate: number | null;
        reasons: Record<string, number> | null;
        alert: boolean;
    };
}

interface StripeResponse {
    status: string;
    coverage: boolean;
    stripe: {
        events24h: number | null;
        processed24h: number | null;
        failed24h: number | null;
        failureRate: number | null;
        eventTypes: Record<string, number>;
        recentEvents: Array<{
            id: string;
            stripeEventId: string;
            eventType: string;
            at: string;
        }>;
        alert: boolean;
    };
}

export function OpsClient() {
    const [opsToken, setOpsToken] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

    const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
    const [cron, setCron] = useState<CronResponse | null>(null);
    const [inbound, setInbound] = useState<InboundResponse | null>(null);
    const [stripe, setStripe] = useState<StripeResponse | null>(null);

    const fetchData = useCallback(async () => {
        if (!opsToken) {
            setError("Enter OPS_TOKEN to fetch data");
            return;
        }

        setIsLoading(true);
        setError(null);

        const headers = {
            "x-ops-token": opsToken,
        };

        try {
            // Fetch all endpoints in parallel
            const [metricsRes, cronRes, inboundRes, stripeRes] = await Promise.all([
                fetch("/api/ops/metrics", { headers }),
                fetch("/api/ops/cron", { headers }),
                fetch("/api/ops/inbound", { headers }),
                fetch("/api/ops/stripe", { headers }),
            ]);

            if (!metricsRes.ok && metricsRes.status === 401) {
                setError("Invalid OPS_TOKEN");
                setIsLoading(false);
                return;
            }

            const [metricsData, cronData, inboundData, stripeData] = await Promise.all([
                metricsRes.json(),
                cronRes.json(),
                inboundRes.json(),
                stripeRes.json(),
            ]);

            setMetrics(metricsData);
            setCron(cronData);
            setInbound(inboundData);
            setStripe(stripeData);
            setLastRefresh(new Date());
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch data");
        } finally {
            setIsLoading(false);
        }
    }, [opsToken]);

    // Auto-refresh every 30 seconds when token is set
    useEffect(() => {
        if (!opsToken) return;

        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [opsToken, fetchData]);

    return (
        <div className="space-y-6">
            {/* Token Input */}
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
                <div className="flex items-center gap-4">
                    <input
                        type="password"
                        placeholder="Enter OPS_TOKEN..."
                        value={opsToken}
                        onChange={(e) => setOpsToken(e.target.value)}
                        className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                    />
                    <button
                        onClick={fetchData}
                        disabled={isLoading || !opsToken}
                        className="rounded bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                        {isLoading ? "Loading..." : "Refresh"}
                    </button>
                </div>
                {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
                {lastRefresh && (
                    <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
                        Last refresh: {lastRefresh.toLocaleTimeString()}
                    </p>
                )}
            </div>

            {/* Health Status Banner */}
            {metrics && (
                <div
                    className={`rounded-lg border p-4 ${
                        metrics.healthy
                            ? "border-green-500/30 bg-green-500/10"
                            : "border-red-500/30 bg-red-500/10"
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{metrics.healthy ? "✓" : "⚠"}</span>
                        <div>
                            <h2 className="font-semibold">
                                {metrics.healthy ? "All Systems Healthy" : "Issues Detected"}
                            </h2>
                            {metrics.alerts.length > 0 && (
                                <ul className="mt-1 space-y-1 text-sm">
                                    {metrics.alerts.map((alert, i) => (
                                        <li key={i} className="text-red-600">
                                            {alert.code}: {alert.message}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Metrics Grid */}
            <div className="grid gap-4 md:grid-cols-3">
                {/* Inbound Card */}
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
                    <h3 className="mb-3 text-sm font-medium text-[var(--color-muted-foreground)]">
                        Inbound Email (24h)
                        {inbound && !inbound.coverage && (
                            <span className="ml-2 text-xs text-yellow-600">(no coverage)</span>
                        )}
                    </h3>
                    {inbound ? (
                        inbound.coverage ? (
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span>Received</span>
                                    <span className="font-mono">{inbound.inbound.received24h ?? "-"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Processed</span>
                                    <span className="font-mono text-green-600">
                                        {inbound.inbound.processed24h ?? "-"}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Rejected</span>
                                    <span
                                        className={`font-mono ${
                                            (inbound.inbound.rejected24h ?? 0) > 0 ? "text-red-600" : ""
                                        }`}
                                    >
                                        {inbound.inbound.rejected24h ?? "-"}
                                    </span>
                                </div>
                                <div className="flex justify-between border-t pt-2">
                                    <span>Rejection Rate</span>
                                    <span
                                        className={`font-mono ${
                                            (inbound.inbound.rejectionRate ?? 0) > 25 ? "text-red-600" : ""
                                        }`}
                                    >
                                        {inbound.inbound.rejectionRate ?? 0}%
                                    </span>
                                </div>
                                {inbound.inbound.reasons && Object.keys(inbound.inbound.reasons).length > 0 && (
                                    <div className="mt-3 border-t pt-2">
                                        <p className="mb-1 text-xs font-medium">Rejection Reasons:</p>
                                        {Object.entries(inbound.inbound.reasons).map(([reason, count]) => (
                                            <div key={reason} className="flex justify-between text-xs">
                                                <span className="text-[var(--color-muted-foreground)]">
                                                    {reason}
                                                </span>
                                                <span>{count}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-yellow-600">
                                Coverage unavailable - InboundIngestion table not accessible
                            </p>
                        )
                    ) : (
                        <p className="text-sm text-[var(--color-muted-foreground)]">No data</p>
                    )}
                </div>

                {/* Stripe Card */}
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
                    <h3 className="mb-3 text-sm font-medium text-[var(--color-muted-foreground)]">
                        Stripe Webhooks (24h)
                        {stripe && !stripe.coverage && (
                            <span className="ml-2 text-xs text-yellow-600">(no coverage)</span>
                        )}
                    </h3>
                    {stripe ? (
                        stripe.coverage ? (
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span>Events</span>
                                    <span className="font-mono">{stripe.stripe.events24h ?? "-"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Processed</span>
                                    <span className="font-mono text-green-600">
                                        {stripe.stripe.processed24h ?? "-"}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Failed</span>
                                    <span
                                        className={`font-mono ${
                                            (stripe.stripe.failed24h ?? 0) > 0 ? "text-red-600" : ""
                                        }`}
                                    >
                                        {stripe.stripe.failed24h ?? "-"}
                                    </span>
                                </div>
                                <div className="flex justify-between border-t pt-2">
                                    <span>Failure Rate</span>
                                    <span
                                        className={`font-mono ${
                                            (stripe.stripe.failureRate ?? 0) > 0 ? "text-red-600" : ""
                                        }`}
                                    >
                                        {stripe.stripe.failureRate ?? 0}%
                                    </span>
                                </div>
                                {stripe.stripe.recentEvents.length > 0 && (
                                    <div className="mt-3 border-t pt-2">
                                        <p className="mb-1 text-xs font-medium">Recent Events:</p>
                                        {stripe.stripe.recentEvents.slice(0, 3).map((e) => (
                                            <div key={e.id} className="mb-1 text-xs">
                                                <p className="font-mono text-[var(--color-muted-foreground)]">
                                                    {e.eventType}
                                                </p>
                                                <p className="text-[var(--color-muted-foreground)]">
                                                    {new Date(e.at).toLocaleTimeString()}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-yellow-600">
                                Coverage unavailable - ProductEvent table not accessible
                            </p>
                        )
                    ) : (
                        <p className="text-sm text-[var(--color-muted-foreground)]">No data</p>
                    )}
                </div>

                {/* Cron Card */}
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
                    <h3 className="mb-3 text-sm font-medium text-[var(--color-muted-foreground)]">
                        Cron Jobs
                    </h3>
                    {cron ? (
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span>Run in 24h</span>
                                <span
                                    className={`font-mono ${
                                        cron.cron.purgeProposals.lastRun24h
                                            ? "text-green-600"
                                            : "text-yellow-600"
                                    }`}
                                >
                                    {cron.cron.purgeProposals.lastRun24h ? "Yes" : "No"}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Purged (24h)</span>
                                <span className="font-mono">
                                    {cron.cron.purgeProposals.purgedLast24h}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Pending</span>
                                <span
                                    className={`font-mono ${
                                        cron.cron.purgeProposals.pendingPurge > 1000
                                            ? "text-red-600"
                                            : ""
                                    }`}
                                >
                                    {cron.cron.purgeProposals.pendingPurge}
                                </span>
                            </div>
                            {cron.cron.purgeProposals.lastSuccess && (
                                <div className="border-t pt-2 text-xs">
                                    <span className="text-[var(--color-muted-foreground)]">
                                        Last success:{" "}
                                    </span>
                                    <span>
                                        {new Date(
                                            cron.cron.purgeProposals.lastSuccess
                                        ).toLocaleString()}
                                    </span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-[var(--color-muted-foreground)]">No data</p>
                    )}
                </div>
            </div>

            {/* Thresholds Reference */}
            {metrics && (
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
                    <h3 className="mb-3 text-sm font-medium text-[var(--color-muted-foreground)]">
                        Alert Thresholds
                    </h3>
                    <div className="grid gap-2 text-sm md:grid-cols-4">
                        <div>
                            <span className="text-[var(--color-muted-foreground)]">
                                Inbound Rejection:
                            </span>{" "}
                            {">"} {metrics.thresholds.inboundRejectionRate}%
                        </div>
                        <div>
                            <span className="text-[var(--color-muted-foreground)]">
                                Stripe Failures:
                            </span>{" "}
                            {">"} {metrics.thresholds.stripeFailures}
                        </div>
                        <div>
                            <span className="text-[var(--color-muted-foreground)]">Cron Backlog:</span>{" "}
                            {">"} {metrics.thresholds.cronPendingPurge}
                        </div>
                        <div>
                            <span className="text-[var(--color-muted-foreground)]">Cron Stale:</span>{" "}
                            {">"} {metrics.thresholds.cronStaleHours}h
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
