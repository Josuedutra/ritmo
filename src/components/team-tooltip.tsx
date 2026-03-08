"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, X } from "lucide-react";

const DISMISS_KEY = "ritmo:team-tooltip-dismissed";

interface TeamTooltipProps {
  show: boolean;
}

export function TeamTooltip({ show }: TeamTooltipProps) {
  const [dismissed, setDismissed] = useState(true); // Start hidden to avoid flash

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (!show || dismissed) return null;

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <div className="mb-4 rounded-lg border border-[var(--color-info)]/30 bg-[var(--color-info)]/10 px-4 py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Users className="mt-0.5 h-5 w-5 text-[var(--color-info)]" />
          <div>
            <p className="text-sm font-medium text-[var(--color-info)]">
              Tem um vendedor? Adicione-o à sua equipa nas{" "}
              <Link
                href="/settings?tab=team"
                className="underline hover:text-[var(--color-info-foreground)]"
              >
                Definições → Equipa
              </Link>
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-[var(--color-info)] hover:text-[var(--color-info-foreground)]"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
