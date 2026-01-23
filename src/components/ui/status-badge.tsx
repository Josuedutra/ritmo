"use client";

import { Check, Clock, AlertTriangle, Info, X, Loader2, Shield } from "lucide-react";

export type StatusBadgeStatus =
    | "active"
    | "pending"
    | "verified"
    | "limited"
    | "disabled"
    | "info"
    | "warning";

interface StatusBadgeProps {
    status: StatusBadgeStatus;
    label?: string;
    size?: "sm" | "md";
}

const STATUS_CONFIG: Record<
    StatusBadgeStatus,
    {
        label: string;
        icon: React.ElementType;
        className: string;
        iconClassName: string;
        animate?: boolean;
    }
> = {
    active: {
        label: "Ativo",
        icon: Check,
        className: "bg-green-500/10 text-green-600 border-green-500/30",
        iconClassName: "text-green-500",
    },
    pending: {
        label: "A verificar",
        icon: Loader2,
        className: "bg-blue-500/10 text-blue-600 border-blue-500/30",
        iconClassName: "text-blue-500",
        animate: true,
    },
    verified: {
        label: "Confirmado",
        icon: Shield,
        className: "bg-green-500/10 text-green-600 border-green-500/30",
        iconClassName: "text-green-500",
    },
    limited: {
        label: "Limite atingido",
        icon: AlertTriangle,
        className: "bg-orange-500/10 text-orange-600 border-orange-500/30",
        iconClassName: "text-orange-500",
    },
    disabled: {
        label: "Indisponível",
        icon: X,
        className: "bg-gray-500/10 text-gray-500 border-gray-500/30",
        iconClassName: "text-gray-400",
    },
    info: {
        label: "Info",
        icon: Info,
        className: "bg-blue-500/10 text-blue-600 border-blue-500/30",
        iconClassName: "text-blue-500",
    },
    warning: {
        label: "Atenção",
        icon: AlertTriangle,
        className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
        iconClassName: "text-yellow-500",
    },
};

export function StatusBadge({ status, label, size = "sm" }: StatusBadgeProps) {
    const config = STATUS_CONFIG[status];
    const Icon = config.icon;
    const displayLabel = label ?? config.label;

    const sizeClasses = size === "sm"
        ? "px-2 py-0.5 text-xs gap-1"
        : "px-2.5 py-1 text-sm gap-1.5";

    const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

    return (
        <span
            className={`inline-flex items-center rounded-full border font-medium ${sizeClasses} ${config.className}`}
        >
            <Icon
                className={`${iconSize} ${config.iconClassName} ${config.animate ? "animate-spin" : ""}`}
            />
            {displayLabel}
        </span>
    );
}
