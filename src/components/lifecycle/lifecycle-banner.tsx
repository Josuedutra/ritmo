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

    // Trial ending soon (less than 3 days)
    if (
        entitlements.tier === "trial" &&
        entitlements.trialDaysRemaining !== null &&
        entitlements.trialDaysRemaining <= 3
    ) {
        return (
            <div className="mb-4 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <Clock className="mt-0.5 h-5 w-5 text-orange-500" />
                        <div>
                            <p className="text-sm font-medium text-orange-200">
                                Trial termina em {entitlements.trialDaysRemaining} dia
                                {entitlements.trialDaysRemaining !== 1 ? "s" : ""}
                            </p>
                            <p className="mt-0.5 text-sm text-orange-300/80">
                                Já enviou {entitlements.quotesUsed} de {entitlements.quotesLimit} orçamentos.
                                Escolha um plano para continuar com automação.
                            </p>
                            <Link
                                href="/settings/billing"
                                className="mt-2 inline-flex items-center text-sm font-medium text-orange-400 hover:text-orange-300"
                            >
                                Ver planos →
                            </Link>
                        </div>
                    </div>
                    <button
                        onClick={() => setDismissed(true)}
                        className="text-orange-400 hover:text-orange-300"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
        );
    }

    // Trial active with more time
    if (entitlements.tier === "trial" && entitlements.trialDaysRemaining !== null) {
        return (
            <div className="mb-4 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <Zap className="mt-0.5 h-5 w-5 text-blue-400" />
                        <div>
                            <p className="text-sm font-medium text-blue-200">
                                Trial ativo · {entitlements.trialDaysRemaining} dia
                                {entitlements.trialDaysRemaining !== 1 ? "s" : ""} restantes
                            </p>
                            <p className="mt-0.5 text-sm text-blue-300/80">
                                {entitlements.quotesRemaining} orçamentos disponíveis. Automação de emails e BCC ativas.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setDismissed(true)}
                        className="text-blue-400 hover:text-blue-300"
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
                                Modo manual (TASK-EMAIL)
                            </p>
                            <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
                                No plano gratuito, emails de follow-up aparecem como tarefas para enviar manualmente.
                                A automação e BCC estão desativadas.
                            </p>
                            <Link
                                href="/settings/billing"
                                className="mt-2 inline-flex items-center text-sm font-medium text-[var(--color-primary)] hover:underline"
                            >
                                Ativar automação com um plano →
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
                                Pagamento em atraso
                            </p>
                            <p className="mt-0.5 text-sm text-red-300/80">
                                Atualize o seu método de pagamento para continuar a enviar orçamentos.
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
                                Subscrição cancelada
                            </p>
                            <p className="mt-0.5 text-sm text-red-300/80">
                                Reative o seu plano para continuar a enviar orçamentos com automação.
                            </p>
                            <Link
                                href="/settings/billing"
                                className="mt-2 inline-flex items-center text-sm font-medium text-red-400 hover:text-red-300"
                            >
                                Reativar plano →
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
