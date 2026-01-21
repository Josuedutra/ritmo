"use client";

import { useEffect, useCallback, useState } from "react";
import { Button } from "@/components/ui";
import { AlertTriangle, ArrowRight, X, Loader2, Mail } from "lucide-react";
import { runUpgradeCta, getRecommendedPlan, type CtaActionType } from "@/lib/billing/cta";

/**
 * Upgrade Prompt Component (P1.1 Upgrade Prompts Optimization)
 *
 * Features:
 * - Dedupe "shown" events with localStorage (24h window)
 * - Punchy PT-PT copy with 1-liner + bullets
 * - Smart CTA (portal/checkout/contact)
 */

export type UpgradeReason =
    | "send_limit"
    | "storage_quota"
    | "retention_expired"
    | "seat_limit"
    | "benchmark_locked";

export type UpgradeVariant = "inline" | "modal" | "banner";

interface UpgradePromptProps {
    reason: UpgradeReason;
    title?: string;
    message?: string;
    bullets?: readonly string[];
    ctaLabel?: string;
    variant?: UpgradeVariant;
    location: string;
    currentPlan?: string | null;
    organizationId?: string;
    onDismiss?: () => void;
    className?: string;
}

// 24 hours in milliseconds
const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Check if "shown" event was already tracked within dedupe window
 */
function hasShownRecently(reason: UpgradeReason, location: string): boolean {
    if (typeof window === "undefined") return false;

    try {
        const key = `upgrade_prompt_shown:${reason}:${location}`;
        const stored = localStorage.getItem(key);

        if (!stored) return false;

        const timestamp = parseInt(stored, 10);
        if (isNaN(timestamp)) return false;

        return Date.now() - timestamp < DEDUPE_WINDOW_MS;
    } catch {
        // localStorage unavailable or error - fail-open (allow tracking)
        return false;
    }
}

/**
 * Mark "shown" event as tracked
 */
function markShown(reason: UpgradeReason, location: string): void {
    if (typeof window === "undefined") return;

    try {
        const key = `upgrade_prompt_shown:${reason}:${location}`;
        localStorage.setItem(key, Date.now().toString());
    } catch {
        // Silently ignore localStorage errors
    }
}

/**
 * Track upgrade prompt events via API
 * Non-blocking - errors are silently ignored
 *
 * Uses keepalive: true for "clicked" events to ensure tracking
 * completes even when page navigates away immediately after.
 */
async function trackUpgradeEvent(
    event: "shown" | "clicked",
    reason: UpgradeReason,
    location: string,
    extra?: {
        recommendedPlanKey?: string;
        actionType?: CtaActionType;
    }
): Promise<void> {
    try {
        // Use keepalive for clicks to survive page navigation
        const options: RequestInit = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event, reason, location, ...extra }),
        };

        // keepalive ensures the request completes even if page unloads
        if (event === "clicked") {
            options.keepalive = true;
        }

        await fetch("/api/tracking/upgrade-prompt", options);
    } catch {
        // Silently ignore tracking errors
    }
}

export function UpgradePrompt({
    reason,
    title: customTitle,
    message: customMessage,
    bullets: customBullets,
    ctaLabel: customCtaLabel,
    variant = "inline",
    location,
    currentPlan,
    organizationId,
    onDismiss,
    className = "",
}: UpgradePromptProps) {
    const [isLoading, setIsLoading] = useState(false);

    // Get preset copy
    const preset = UPGRADE_PROMPTS[reason];
    const title = customTitle || preset.title;
    const message = customMessage || preset.message;
    const bullets = customBullets || preset.bullets;
    const recommendedPlan = getRecommendedPlan(reason, currentPlan);
    const ctaLabel = customCtaLabel || (recommendedPlan === "pro_plus" ? "Pedir acesso" : preset.ctaLabel);

    // Track shown event on mount with dedupe
    useEffect(() => {
        if (!hasShownRecently(reason, location)) {
            trackUpgradeEvent("shown", reason, location);
            markShown(reason, location);
        }
    }, [reason, location]);

    // Handle CTA click with smart action
    const handleCtaClick = useCallback(async () => {
        if (isLoading) return;

        setIsLoading(true);

        // Get action type for tracking
        const actionType: CtaActionType =
            recommendedPlan === "pro_plus" ? "contact" : "portal";

        // Track click before action
        await trackUpgradeEvent("clicked", reason, location, {
            recommendedPlanKey: recommendedPlan,
            actionType,
        });

        try {
            const result = await runUpgradeCta({
                reason,
                currentPlan,
                organizationId,
            });

            if (result.url) {
                // For contact (mailto), open in new window
                if (result.type === "contact") {
                    window.open(result.url, "_blank");
                } else {
                    window.location.href = result.url;
                }
            }
        } catch {
            // Fallback to billing page on error
            window.location.href = "/settings/billing";
        } finally {
            setIsLoading(false);
        }
    }, [reason, location, currentPlan, organizationId, recommendedPlan, isLoading]);

    // CTA button with loading state
    const CtaButton = ({ size = "sm" }: { size?: "sm" | "default" }) => (
        <Button
            size={size}
            variant="outline"
            onClick={handleCtaClick}
            disabled={isLoading}
            className={`gap-1.5 border-amber-500/50 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400 ${
                size === "sm" ? "mt-3" : ""
            }`}
        >
            {isLoading ? (
                <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    A processar...
                </>
            ) : recommendedPlan === "pro_plus" ? (
                <>
                    <Mail className="h-3.5 w-3.5" />
                    {ctaLabel}
                </>
            ) : (
                <>
                    {ctaLabel}
                    <ArrowRight className="h-3.5 w-3.5" />
                </>
            )}
        </Button>
    );

    // Variant-specific styles
    const variantStyles = {
        inline: "rounded-lg border border-amber-500/30 bg-amber-500/10 p-4",
        modal: "fixed inset-0 z-50 flex items-center justify-center bg-black/50",
        banner: "w-full border-b border-amber-500/30 bg-amber-500/10 px-4 py-3",
    };

    // Inline variant (most common)
    if (variant === "inline") {
        return (
            <div className={`${variantStyles.inline} ${className}`}>
                <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                            {title}
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                            {message}
                        </p>
                        {bullets.length > 0 && (
                            <ul className="mt-2 space-y-1">
                                {bullets.map((bullet, index) => (
                                    <li
                                        key={index}
                                        className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]"
                                    >
                                        <span className="h-1 w-1 rounded-full bg-amber-500" />
                                        {bullet}
                                    </li>
                                ))}
                            </ul>
                        )}
                        <CtaButton />
                    </div>
                    {onDismiss && (
                        <button
                            type="button"
                            onClick={onDismiss}
                            className="rounded p-1 hover:bg-amber-500/20"
                        >
                            <X className="h-4 w-4 text-amber-500" />
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // Banner variant
    if (variant === "banner") {
        return (
            <div className={`${variantStyles.banner} ${className}`}>
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                        <p className="text-sm">
                            <span className="font-medium text-amber-600 dark:text-amber-400">
                                {title}
                            </span>
                            <span className="text-[var(--color-muted-foreground)]">
                                {" "}{message}
                            </span>
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCtaClick}
                            disabled={isLoading}
                            className="gap-1.5 border-amber-500/50 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400"
                        >
                            {isLoading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : recommendedPlan === "pro_plus" ? (
                                <Mail className="h-3.5 w-3.5" />
                            ) : null}
                            {ctaLabel}
                            {!isLoading && recommendedPlan !== "pro_plus" && (
                                <ArrowRight className="h-3.5 w-3.5" />
                            )}
                        </Button>
                        {onDismiss && (
                            <button
                                type="button"
                                onClick={onDismiss}
                                className="rounded p-1 hover:bg-amber-500/20"
                            >
                                <X className="h-4 w-4 text-amber-500" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Modal variant
    if (variant === "modal") {
        return (
            <div className={variantStyles.modal}>
                <div className="w-full max-w-md rounded-lg bg-[var(--color-background)] p-6 shadow-xl">
                    <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold">{title}</h3>
                            <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                                {message}
                            </p>
                            {bullets.length > 0 && (
                                <ul className="mt-3 space-y-1.5">
                                    {bullets.map((bullet, index) => (
                                        <li
                                            key={index}
                                            className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]"
                                        >
                                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                            {bullet}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        {onDismiss && (
                            <Button variant="ghost" onClick={onDismiss}>
                                Mais tarde
                            </Button>
                        )}
                        <Button
                            onClick={handleCtaClick}
                            disabled={isLoading}
                            className="gap-1.5"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    A processar...
                                </>
                            ) : recommendedPlan === "pro_plus" ? (
                                <>
                                    <Mail className="h-4 w-4" />
                                    {ctaLabel}
                                </>
                            ) : (
                                <>
                                    {ctaLabel}
                                    <ArrowRight className="h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}

// P1.1-02: Punchy PT-PT copy (1-liner + max 2 bullets)
export const UPGRADE_PROMPTS = {
    send_limit: {
        title: "Limite de envios atingido",
        message: "Atingiu o limite de envios deste plano.",
        bullets: [
            "Aumente o limite mensal",
            "Desbloqueie automação e relatórios",
        ],
        ctaLabel: "Ver planos",
    },
    storage_quota: {
        title: "Armazenamento cheio",
        message: "Sem espaço para guardar novas propostas.",
        bullets: [
            "Mais armazenamento",
            "Histórico mais longo",
        ],
        ctaLabel: "Aumentar espaço",
    },
    retention_expired: {
        title: "Proposta expirada",
        message: "Esta proposta expirou no histórico do seu plano.",
        bullets: [
            "Guarde propostas por mais tempo",
            "Acesso ao histórico quando precisa",
        ],
        ctaLabel: "Ver planos",
    },
    seat_limit: {
        title: "Limite de utilizadores",
        message: "Este plano não permite adicionar mais utilizadores.",
        bullets: [
            "Traga a equipa para o Ritmo",
            "Mais controlo e permissões",
        ],
        ctaLabel: "Adicionar lugares",
    },
    benchmark_locked: {
        title: "Benchmark bloqueado",
        message: "Benchmark é exclusivo do Pro+.",
        bullets: [
            "Compare com o seu setor",
            "Metas e ranking",
        ],
        ctaLabel: "Pedir acesso",
    },
} as const;
