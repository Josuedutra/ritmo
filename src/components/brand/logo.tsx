import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
    /** Use full lockup (with wordmark) or icon only */
    showWordmark?: boolean;
    size?: "sm" | "md" | "lg";
    href?: string;
    className?: string;
}

const sizeConfig = {
    sm: { width: 100, height: 32 },
    md: { width: 130, height: 40 },
    lg: { width: 160, height: 50 },
};

const iconOnlyConfig = {
    sm: { width: 28, height: 28 },
    md: { width: 36, height: 36 },
    lg: { width: 44, height: 44 },
};

export function Logo({
    showWordmark = true,
    size = "md",
    href,
    className,
}: LogoProps) {
    const config = showWordmark ? sizeConfig[size] : iconOnlyConfig[size];
    const imageSrc = showWordmark
        ? "/brand/logo-ritmo.png"
        : "/brand/ritmo-3d-hero.png";

    const content = (
        <span className={cn("flex items-center", className)}>
            <Image
                src={imageSrc}
                alt="Ritmo"
                width={config.width}
                height={config.height}
                className="flex-shrink-0 object-contain"
                priority
            />
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
