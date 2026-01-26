import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { type HTMLAttributes, forwardRef } from "react";

const badgeVariants = cva(
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
    {
        variants: {
            variant: {
                default: "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]",
                secondary: "bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)]",
                success: "bg-[var(--color-success)]/15 text-[var(--color-success)] border border-[var(--color-success)]/30",
                warning: "bg-[var(--color-warning)]/15 text-[var(--color-warning)] border border-[var(--color-warning)]/30",
                destructive: "bg-[var(--color-destructive)]/15 text-[var(--color-destructive)] border border-[var(--color-destructive)]/30",
                info: "bg-[var(--color-info)]/10 text-[var(--color-info)] border border-[var(--color-info)]/25",
                outline: "border border-[var(--color-border)] text-[var(--color-foreground)]",
                high: "bg-[var(--color-priority-high)]/15 text-[var(--color-priority-high)] border border-[var(--color-priority-high)]/30",
                low: "bg-[var(--color-priority-low)]/15 text-[var(--color-priority-low)] border border-[var(--color-priority-low)]/30",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);

export interface BadgeProps
    extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

const Badge = forwardRef<HTMLDivElement, BadgeProps>(
    ({ className, variant, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(badgeVariants({ variant }), className)}
                {...props}
            />
        );
    }
);

Badge.displayName = "Badge";

export { Badge, badgeVariants };
