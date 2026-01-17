import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
    label: string;
    value: string | number;
    trend?: {
        value: number;
        label?: string;
    };
    icon?: React.ReactNode;
    className?: string;
}

export function StatCard({ label, value, trend, icon, className }: StatCardProps) {
    const trendColor = trend
        ? trend.value > 0
            ? "text-[var(--color-success)]"
            : trend.value < 0
                ? "text-[var(--color-destructive)]"
                : "text-[var(--color-muted-foreground)]"
        : "";

    const TrendIcon = trend
        ? trend.value > 0
            ? ArrowUp
            : trend.value < 0
                ? ArrowDown
                : Minus
        : null;

    return (
        <div
            className={cn(
                "rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4",
                className
            )}
        >
            <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-muted-foreground)]">{label}</span>
                {icon && <span className="text-[var(--color-muted-foreground)]">{icon}</span>}
            </div>
            <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-semibold">{value}</span>
                {trend && TrendIcon && (
                    <span className={cn("flex items-center text-xs font-medium", trendColor)}>
                        <TrendIcon className="mr-0.5 h-3 w-3" />
                        {Math.abs(trend.value)}%
                        {trend.label && <span className="ml-1 text-[var(--color-muted-foreground)]">{trend.label}</span>}
                    </span>
                )}
            </div>
        </div>
    );
}
