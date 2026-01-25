import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
    variant?: "gradient" | "mono";
    showWordmark?: boolean;
    size?: "sm" | "md" | "lg";
    href?: string;
    className?: string;
}

const sizeConfig = {
    sm: { icon: 20, text: "text-lg" },
    md: { icon: 28, text: "text-2xl" },
    lg: { icon: 36, text: "text-3xl" },
};

export function Logo({
    variant = "gradient",
    showWordmark = true,
    size = "md",
    href,
    className,
}: LogoProps) {
    const config = sizeConfig[size];
    const iconSrc = variant === "gradient"
        ? "/brand/ribbonR-flat-gradient.svg"
        : "/brand/ribbonR-mono.svg";

    const content = (
        <span className={cn("flex items-center gap-2", className)}>
            <Image
                src={iconSrc}
                alt="Ritmo"
                width={config.icon}
                height={config.icon}
                className="flex-shrink-0"
            />
            {showWordmark && (
                <span
                    className={cn(
                        config.text,
                        "font-bold tracking-tight text-zinc-800 dark:text-zinc-200"
                    )}
                >
                    Ritmo
                </span>
            )}
        </span>
    );

    if (href) {
        return (
            <Link href={href} className="transition-opacity hover:opacity-80">
                {content}
            </Link>
        );
    }

    return content;
}
