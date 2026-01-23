"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "@/components/ui/use-toast";

const STORAGE_KEY_PREFIX = "ritmo:lastSeenAhaAt:";

interface AhaCelebrationOptions {
    organizationId: string | null;
    ahaFirstBccCaptureAt: string | null;
}

interface AhaCelebrationState {
    shouldCelebrate: boolean;
    isHighlighted: boolean;
}

/**
 * Hook to manage AHA celebration for first BCC capture.
 *
 * Triggers a toast and highlight animation once per organization.
 * Uses localStorage to ensure celebration only fires once per session/browser.
 *
 * @param options - Organization ID and AHA timestamp from entitlements
 * @returns Celebration state for UI integration
 */
export function useAhaCelebration(options: AhaCelebrationOptions): AhaCelebrationState {
    const { organizationId, ahaFirstBccCaptureAt } = options;
    const [shouldCelebrate, setShouldCelebrate] = useState(false);
    const [isHighlighted, setIsHighlighted] = useState(false);

    const triggerCelebration = useCallback(() => {
        // Show premium toast (PT-PT)
        toast({
            title: "Captura concluída",
            description: "Proposta associada ao orçamento e follow-ups ativados.",
            variant: "success",
            duration: 2800,
        });

        // Set highlight state
        setIsHighlighted(true);

        // Remove highlight after 1500ms
        setTimeout(() => {
            setIsHighlighted(false);
        }, 1500);
    }, []);

    useEffect(() => {
        // Skip if no org or no AHA timestamp
        if (!organizationId || !ahaFirstBccCaptureAt) {
            return;
        }

        const storageKey = `${STORAGE_KEY_PREFIX}${organizationId}`;

        try {
            const lastSeenAhaAt = localStorage.getItem(storageKey);
            const ahaTimestamp = new Date(ahaFirstBccCaptureAt).getTime();

            // Check if we should celebrate:
            // - Either never seen before (lastSeenAhaAt is null)
            // - Or AHA happened after our last seen timestamp
            const shouldTrigger = !lastSeenAhaAt || new Date(lastSeenAhaAt).getTime() < ahaTimestamp;

            if (shouldTrigger) {
                setShouldCelebrate(true);
                triggerCelebration();

                // Save that we've seen this AHA
                localStorage.setItem(storageKey, ahaFirstBccCaptureAt);
            }
        } catch {
            // localStorage might not be available (SSR, private browsing, etc.)
            // Silently ignore
        }
    }, [organizationId, ahaFirstBccCaptureAt, triggerCelebration]);

    return {
        shouldCelebrate,
        isHighlighted,
    };
}
