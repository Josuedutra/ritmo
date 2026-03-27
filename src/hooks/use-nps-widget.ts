"use client";

import { useState, useCallback } from "react";

// Rate limiting: 1 NPS request per browser session
const NPS_SESSION_KEY = "ritmo:nps:shownAt";

type NpsTriggerContext = "proposal_sent" | "quote_created_5";

interface UseNpsWidgetReturn {
  isOpen: boolean;
  triggerContext: NpsTriggerContext | undefined;
  triggerNps: (context: NpsTriggerContext) => void;
  closeNps: () => void;
}

/**
 * Hook to manage NPS widget display with session-level rate limiting.
 *
 * Rules:
 * - Maximum 1 NPS request per browser session (sessionStorage)
 * - Can be triggered after key product actions (proposal_sent, quote_created_5)
 * - Widget can be closed/skipped without submitting
 */
export function useNpsWidget(): UseNpsWidgetReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [triggerContext, setTriggerContext] = useState<NpsTriggerContext | undefined>(undefined);

  const triggerNps = useCallback((context: NpsTriggerContext) => {
    // Rate limiting: only show once per session
    try {
      const alreadyShown = sessionStorage.getItem(NPS_SESSION_KEY);
      if (alreadyShown) return;

      // Mark as shown for this session
      sessionStorage.setItem(NPS_SESSION_KEY, new Date().toISOString());
    } catch {
      // sessionStorage not available (SSR, private browsing) — skip silently
      return;
    }

    setTriggerContext(context);
    setIsOpen(true);
  }, []);

  const closeNps = useCallback(() => {
    setIsOpen(false);
    setTriggerContext(undefined);
  }, []);

  return {
    isOpen,
    triggerContext,
    triggerNps,
    closeNps,
  };
}
