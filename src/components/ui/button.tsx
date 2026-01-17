import { cn } from "@/lib/utils";
import { forwardRef, type ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
    size?: "default" | "sm" | "lg" | "icon";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", ...props }, ref) => {
        return (
            <button
                className={cn(
                    // Base styles
                    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]",
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
                    },

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
