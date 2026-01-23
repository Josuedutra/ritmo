import { cn } from "@/lib/utils";
import { forwardRef, type ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | "link" | "brand";
    size?: "default" | "sm" | "lg" | "icon";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", ...props }, ref) => {
        return (
            <button
                className={cn(
                    // Base styles
                    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]",
                    "disabled:pointer-events-none disabled:opacity-50",

                    // Variants
                    {
                        "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)]":
                            variant === "default",
                        "bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)] hover:bg-[var(--color-accent)]":
                            variant === "secondary",
                        "border border-[var(--color-border)] bg-transparent hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]":
                            variant === "outline",
                        "hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]":
                            variant === "ghost",
                        "bg-[var(--color-destructive)] text-[var(--color-destructive-foreground)] hover:opacity-90":
                            variant === "destructive",
                        "text-[var(--color-primary)] underline-offset-4 hover:underline":
                            variant === "link",
                    },

                    // Brand variant - Ritmo signature gradient CTA
                    variant === "brand" && [
                        "bg-gradient-to-r from-[var(--color-brand-from)] to-[var(--color-brand-to)]",
                        "text-[var(--color-brand-foreground)] font-semibold",
                        "shadow-md shadow-[var(--color-brand-from)]/25",
                        "hover:shadow-lg hover:shadow-[var(--color-brand-from)]/30 hover:-translate-y-0.5",
                        "focus-visible:ring-[var(--color-brand-from)]",
                        "active:translate-y-0",
                    ],

                    // Sizes
                    {
                        "h-10 px-4 py-2": size === "default",
                        "h-8 px-3 text-xs": size === "sm",
                        "h-11 px-6": size === "lg",
                        "h-10 w-10": size === "icon",
                    },

                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);

Button.displayName = "Button";

export { Button };
