"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui";

interface SystemPageLayoutProps {
    icon: React.ReactNode;
    iconBg?: string;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}

export function SystemPageLayout({
    icon,
    iconBg = "bg-[var(--color-primary)]",
    title,
    subtitle,
    children,
}: SystemPageLayoutProps) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="mb-8 text-center">
                    <Link href="/" className="inline-block transition-opacity hover:opacity-80">
                        <span className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent tracking-tight">
                            Ritmo
                        </span>
                    </Link>
                </div>

                <Card className="overflow-hidden shadow-2xl shadow-black/5 border-[var(--color-border)]">
                    <CardContent className="p-8">
                        <div className="text-center">
                            {/* Icon */}
                            <div
                                className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl shadow-lg ${iconBg}`}
                                style={{
                                    boxShadow: iconBg.includes("green")
                                        ? "0 10px 40px -10px rgba(34, 197, 94, 0.4)"
                                        : iconBg.includes("orange")
                                            ? "0 10px 40px -10px rgba(249, 115, 22, 0.4)"
                                            : "0 10px 40px -10px rgba(59, 130, 246, 0.4)",
                                }}
                            >
                                {icon}
                            </div>

                            {/* Title */}
                            <h1 className="mb-2 text-2xl font-bold tracking-tight">
                                {title}
                            </h1>

                            {/* Subtitle */}
                            {subtitle && (
                                <p className="mb-8 text-[var(--color-muted-foreground)] leading-relaxed">
                                    {subtitle}
                                </p>
                            )}

                            {/* Content */}
                            {children}
                        </div>
                    </CardContent>
                </Card>

                {/* Footer text */}
                <p className="mt-6 text-center text-sm text-[var(--color-muted-foreground)]">
                    <Link href="/" className="hover:underline">
                        Voltar à página inicial
                    </Link>
                </p>
            </div>
        </div>
    );
}
