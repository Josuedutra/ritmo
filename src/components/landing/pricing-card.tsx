import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import { Check, X } from "lucide-react";

interface PricingFeature {
    text: string;
    included: boolean;
}

interface PricingCardProps {
    name: string;
    description?: string;
    price?: string;
    priceNote?: string;
    features: PricingFeature[];
    cta: {
        text: string;
        href?: string;
        disabled?: boolean;
    };
    note?: string;
    highlighted?: boolean;
    badge?: string;
}

export function PricingCard({
    name,
    description,
    price,
    priceNote,
    features,
    cta,
    note,
    highlighted = false,
    badge,
}: PricingCardProps) {
    return (
        <div
            className={cn(
                "relative flex flex-col rounded-xl border p-6",
                highlighted
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-lg"
                    : "border-[var(--color-border)] bg-[var(--color-card)]"
            )}
        >
            {/* Badge */}
            {badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-[var(--color-primary)] px-3 py-1 text-xs font-medium text-white">
                        {badge}
                    </span>
                </div>
            )}

            {/* Header */}
            <div className="mb-6">
                <h3 className="text-lg font-semibold">{name}</h3>
                {description && (
                    <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                        {description}
                    </p>
                )}
                {price && (
                    <div className="mt-4">
                        <span className="text-3xl font-bold">{price}</span>
                        {priceNote && (
                            <span className="text-[var(--color-muted-foreground)]">
                                {priceNote}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Features */}
            <ul className="mb-6 flex-1 space-y-3">
                {features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                        {feature.included ? (
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                        ) : (
                            <X className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" />
                        )}
                        <span
                            className={cn(
                                !feature.included && "text-[var(--color-muted-foreground)]"
                            )}
                        >
                            {feature.text}
                        </span>
                    </li>
                ))}
            </ul>

            {/* CTA */}
            {cta.href && !cta.disabled ? (
                <Link href={cta.href}>
                    <Button
                        className="w-full"
                        variant={highlighted ? "default" : "outline"}
                    >
                        {cta.text}
                    </Button>
                </Link>
            ) : (
                <Button
                    className="w-full"
                    variant="outline"
                    disabled={cta.disabled}
                >
                    {cta.text}
                </Button>
            )}

            {/* Note */}
            {note && (
                <p className="mt-4 text-center text-xs text-[var(--color-muted-foreground)]">
                    {note}
                </p>
            )}
        </div>
    );
}
