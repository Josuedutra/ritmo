"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Check, FileText, Mail, Inbox, ChevronRight } from "lucide-react";

interface OnboardingChecklistProps {
    isAdmin: boolean;
}

interface OnboardingState {
    templates: boolean;
    smtp: boolean;
    bcc: boolean;
    firstQuote: boolean;
}

export function OnboardingChecklist({ isAdmin }: OnboardingChecklistProps) {
    const [state, setState] = useState<OnboardingState | null>(null);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        const wasDismissed = sessionStorage.getItem("onboarding-checklist-dismissed");
        if (wasDismissed) {
            setDismissed(true);
            return;
        }

        const checkOnboarding = async () => {
            try {
                const response = await fetch("/api/onboarding");
                const data = await response.json();

                if (!data.completed) {
                    setState(data.state || { templates: false, smtp: false, bcc: false, firstQuote: false });
                }
            } catch (error) {
                console.error("Failed to check onboarding status:", error);
            }
        };

        if (isAdmin) {
            checkOnboarding();
        }
    }, [isAdmin]);

    if (!state || dismissed || !isAdmin) {
        return null;
    }

    const steps = [
        {
            key: "templates",
            label: "Templates",
            description: "Personalizar emails",
            completed: state.templates,
            href: "/templates",
            icon: FileText,
        },
        {
            key: "smtp",
            label: "Email",
            description: "Configurar SMTP",
            completed: state.smtp,
            href: "/settings",
            icon: Mail,
        },
        {
            key: "bcc",
            label: "BCC",
            description: "Auto-anexar propostas",
            completed: state.bcc,
            href: "/settings",
            icon: Inbox,
        },
    ];

    const completedCount = steps.filter((s) => s.completed).length;
    const progress = Math.round((completedCount / steps.length) * 100);

    // All done - hide
    if (completedCount === steps.length) {
        return null;
    }

    const handleDismiss = () => {
        setDismissed(true);
        sessionStorage.setItem("onboarding-checklist-dismissed", "true");
    };

    return (
        <div className="mb-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
            <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">Configuração</span>
                    <span className="rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-xs font-medium text-[var(--color-primary)]">
                        {completedCount}/{steps.length}
                    </span>
                </div>
                <button
                    onClick={handleDismiss}
                    className="text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                >
                    Ocultar
                </button>
            </div>

            {/* Progress bar */}
            <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-muted)]">
                <div
                    className="h-full rounded-full bg-[var(--color-primary)] transition-all"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Steps */}
            <div className="grid gap-2 sm:grid-cols-3">
                {steps.map((step) => {
                    const Icon = step.icon;
                    return (
                        <Link
                            key={step.key}
                            href={step.href}
                            className={`flex items-center gap-3 rounded-md border p-3 transition-colors ${
                                step.completed
                                    ? "border-[var(--color-success)]/30 bg-[var(--color-success)]/5"
                                    : "border-[var(--color-border)] hover:bg-[var(--color-accent)]"
                            }`}
                        >
                            <div
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                                    step.completed
                                        ? "bg-[var(--color-success)]/20"
                                        : "bg-[var(--color-muted)]"
                                }`}
                            >
                                {step.completed ? (
                                    <Check className="h-4 w-4 text-[var(--color-success)]" />
                                ) : (
                                    <Icon className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className={`text-sm font-medium ${step.completed ? "text-[var(--color-success)]" : ""}`}>
                                    {step.label}
                                </div>
                                <div className="truncate text-xs text-[var(--color-muted-foreground)]">
                                    {step.description}
                                </div>
                            </div>
                            {!step.completed && (
                                <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" />
                            )}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
