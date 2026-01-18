"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Clock, AlertTriangle, Zap } from "lucide-react";

interface EntitlementsData {
    tier: "trial" | "free" | "paid";
    planName: string;
    trialActive: boolean;
    trialEndsAt: string | null;
    trialDaysRemaining: number | null;
    quotesUsed: number;
    quotesLimit: number;
    quotesRemaining: number;
    autoEmailEnabled: boolean;
    bccInboundEnabled: boolean;
    subscriptionStatus: string | null;
}

export function LifecycleBanner() {
    const [entitlements, setEntitlements] = useState<EntitlementsData | null>(null);
    const [dismissed, setDismissed] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchEntitlements() {
            try {
                const res = await fetch("/api/entitlements");
                if (res.ok) {
                    const data = await res.json();
                    setEntitlements(data.data);
                }
            } catch {
                // Silently fail - banner is optional
            } finally {
                setLoading(false);
            }
        }

        fetchEntitlements();
    }, []);

    if (loading || dismissed || !entitlements) {
        return null;
    }

    // Don't show banner for paid users with active subscription
    if (entitlements.tier === "paid" && entitlements.subscriptionStatus === "active") {
        return null;
    }

    // Trial banner (any days remaining)
    if (entitlements.tier === "trial" && entitlements.trialDaysRemaining !== null) {
        const isUrgent = entitlements.trialDaysRemaining <= 3;
        const borderColor = isUrgent ? "border-orange-500/30" : "border-blue-500/30";
        const bgColor = isUrgent ? "bg-orange-500/10" : "bg-blue-500/10";
        const iconColor = isUrgent ? "text-orange-500" : "text-blue-400";
        const textColor = isUrgent ? "text-orange-200" : "text-blue-200";
        const subtextColor = isUrgent ? "text-orange-300/80" : "text-blue-300/80";
        const linkColor = isUrgent ? "text-orange-400 hover:text-orange-300" : "text-blue-400 hover:text-blue-300";
        const Icon = isUrgent ? Clock : Zap;

        return (
            <div className={`mb-4 rounded-lg border ${borderColor} ${bgColor} px-4 py-3`}>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <Icon className={`mt-0.5 h-5 w-5 ${iconColor}`} />
                        <div>
                            <p className={`text-sm font-medium ${textColor}`}>
                                Trial termina em {entitlements.trialDaysRemaining} dia{entitlements.trialDaysRemaining !== 1 ? "s" : ""} · {entitlements.quotesUsed}/{entitlements.quotesLimit} envios
                            </p>
                            <Link
                                href="/settings/billing"
                                className={`mt-2 inline-flex items-center text-sm font-medium ${linkColor}`}
                            >
                                Atualizar plano →
                            </Link>
                        </div>
                    </div>
                    <button
                        onClick={() => setDismissed(true)}
                        className={linkColor}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
        );
    }

    // Free tier - trial ended or never started
    if (entitlements.tier === "free") {
        return (
            <div className="mb-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 text-[var(--color-muted-foreground)]" />
                        <div>
                            <p className="text-sm font-medium">
                                Modo manual · {entitlements.quotesUsed}/{entitlements.quotesLimit} envios este mês
                            </p>
                            <Link
                                href="/settings/billing"
                                className="mt-2 inline-flex items-center text-sm font-medium text-[var(--color-primary)] hover:underline"
                            >
                                Atualizar plano →
                            </Link>
                        </div>
                    </div>
                    <button
                        onClick={() => setDismissed(true)}
                        className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
        );
    }

    // Past due subscription
    if (entitlements.subscriptionStatus === "past_due") {
        return (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 text-red-500" />
                        <div>
                            <p className="text-sm font-medium text-red-200">
                                Pagamento em atraso. Atualize para continuar a enviar.
                            </p>
                            <Link
                                href="/settings/billing"
                                className="mt-2 inline-flex items-center text-sm font-medium text-red-400 hover:text-red-300"
                            >
                                Atualizar pagamento →
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Cancelled subscription
    if (entitlements.subscriptionStatus === "cancelled") {
        return (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 text-red-500" />
                        <div>
                            <p className="text-sm font-medium text-red-200">
                                Subscrição cancelada. Reative para continuar.
                            </p>
                            <Link
                                href="/settings/billing"
                                className="mt-2 inline-flex items-center text-sm font-medium text-red-400 hover:text-red-300"
                            >
                                Reativar →
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
