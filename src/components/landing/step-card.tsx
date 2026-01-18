import { cn } from "@/lib/utils";

interface StepCardProps {
    number: number;
    title: string;
    description: string;
    className?: string;
}

export function StepCard({ number, title, description, className }: StepCardProps) {
    return (
        <div className={cn("relative", className)}>
            {/* Step number */}
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary)] text-lg font-bold text-white">
                {number}
            </div>
            <h3 className="mb-2 text-lg font-semibold">{title}</h3>
            <p className="text-[var(--color-muted-foreground)]">{description}</p>
        </div>
    );
}
