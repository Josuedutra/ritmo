import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
    icon?: LucideIcon;
    title: string;
    description: string;
    className?: string;
}

export function FeatureCard({ icon: Icon, title, description, className }: FeatureCardProps) {
    return (
        <div
            className={cn(
                "rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6",
                className
            )}
        >
            {Icon && (
                <div className="mb-4 inline-flex rounded-lg bg-[var(--color-primary)]/10 p-3">
                    <Icon className="h-6 w-6 text-[var(--color-primary)]" />
                </div>
            )}
            <h3 className="mb-2 font-semibold">{title}</h3>
            <p className="text-sm text-[var(--color-muted-foreground)]">{description}</p>
        </div>
    );
}
