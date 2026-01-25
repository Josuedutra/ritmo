"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand";

const navLinks = [
    { href: "#como-funciona", label: "Como funciona" },
    { href: "#planos", label: "Planos" },
    { href: "#faq", label: "FAQ" },
];

export function LandingHeader() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-background)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-background)]/80">
            <div className="container-app flex h-16 items-center justify-between">
                {/* Logo */}
                <Logo href="/" size="md" />

                {/* Desktop Nav */}
                <nav className="hidden items-center gap-8 md:flex">
                    {navLinks.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            className="text-sm text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
                        >
                            {link.label}
                        </a>
                    ))}
                </nav>

                {/* Desktop CTAs */}
                <div className="hidden items-center gap-3 md:flex">
                    <Link href="/login">
                        <Button variant="ghost" size="sm">
                            Entrar
                        </Button>
                    </Link>
                    <Link href="/signup">
                        <Button size="sm">Começar trial</Button>
                    </Link>
                </div>

                {/* Mobile Menu Button */}
                <button
                    type="button"
                    className="md:hidden"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label="Toggle menu"
                >
                    {mobileMenuOpen ? (
                        <X className="h-6 w-6" />
                    ) : (
                        <Menu className="h-6 w-6" />
                    )}
                </button>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="border-t border-[var(--color-border)] bg-[var(--color-background)] md:hidden">
                    <nav className="container-app flex flex-col gap-4 py-4">
                        {navLinks.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                className="text-sm text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                {link.label}
                            </a>
                        ))}
                        <div className="flex flex-col gap-2 pt-2">
                            <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                                <Button variant="outline" className="w-full">
                                    Entrar
                                </Button>
                            </Link>
                            <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                                <Button className="w-full">Começar trial</Button>
                            </Link>
                        </div>
                    </nav>
                </div>
            )}
        </header>
    );
}
