import { cn } from "@/lib/utils";

interface LandingSectionProps {
    id?: string;
    title?: string;
    subtitle?: string;
    children: React.ReactNode;
    className?: string;
    containerClassName?: string;
    background?: "default" | "muted";
}

export function LandingSection({
    id,
    title,
    subtitle,
    children,
    className,
    containerClassName,
    background = "default",
}: LandingSectionProps) {
    return (
        <section
            id={id}
            className={cn(
                "py-16 sm:py-20 lg:py-24",
                background === "muted" && "bg-[var(--color-muted)]/30",
                className
            )}
        >
            <div className={cn("container-app", containerClassName)}>
                {(title || subtitle) && (
                    <div className="mb-12 text-center">
                        {title && (
                            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                                {title}
                            </h2>
                        )}
                        {subtitle && (
                            <p className="mx-auto mt-4 max-w-2xl text-[var(--color-muted-foreground)]">
                                {subtitle}
                            </p>
                        )}
                    </div>
                )}
                {children}
            </div>
        </section>
    );
}
