"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { Sparkles, X, ArrowRight } from "lucide-react";

interface OnboardingBannerProps {
    isAdmin: boolean;
}

export function OnboardingBanner({ isAdmin }: OnboardingBannerProps) {
    const [visible, setVisible] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // Check if banner was dismissed in this session
        const wasDismissed = sessionStorage.getItem("onboarding-banner-dismissed");
        if (wasDismissed) {
            setDismissed(true);
            return;
        }

        // Check onboarding status
        const checkOnboarding = async () => {
            try {
                const response = await fetch("/api/onboarding");
                const data = await response.json();

                if (!data.completed) {
                    setVisible(true);
                }
            } catch (error) {
                console.error("Failed to check onboarding status:", error);
            }
        };

        if (isAdmin) {
            checkOnboarding();
        }
    }, [isAdmin]);

    const handleDismiss = () => {
        setDismissed(true);
        sessionStorage.setItem("onboarding-banner-dismissed", "true");
    };

    if (!visible || dismissed || !isAdmin) {
        return null;
    }

    return (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 p-4">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10">
                    <Sparkles className="h-5 w-5 text-[var(--color-primary)]" />
                </div>
                <div>
                    <p className="font-medium">Complete a configuração da sua conta</p>
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                        Configure templates, email e BCC para começar a usar o Ritmo.
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Link href="/onboarding">
                    <Button size="sm" className="gap-1.5">
                        Configurar
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                </Link>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDismiss}
                    className="h-8 w-8 p-0"
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
