"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    FileText,
    Mail,
    Settings,
    LogOut,
    Menu,
    X,
} from "lucide-react";
import { useState } from "react";
import { ModeToggle } from "@/components/mode-toggle";

interface NavItem {
    href: string;
    label: string;
    icon: typeof LayoutDashboard;
}

const navItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/quotes", label: "Orçamentos", icon: FileText },
    { href: "/templates", label: "Templates", icon: Mail },
    { href: "/settings", label: "Definições", icon: Settings },
];

interface AppHeaderProps {
    user: {
        email: string;
        name?: string | null;
    };
}

export function AppHeader({ user }: AppHeaderProps) {
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-sidebar)]">
            <div className="container-app flex h-14 items-center justify-between">
                {/* Logo */}
                <Link href="/dashboard" className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent tracking-tight transition-opacity hover:opacity-80">
                    Ritmo
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden items-center gap-1 md:flex">
                    {navItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-[var(--color-sidebar-accent)] text-[var(--color-foreground)]"
                                        : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-sidebar-accent)] hover:text-[var(--color-foreground)]"
                                )}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* User Menu */}
                <div className="flex items-center gap-3">
                    <ModeToggle />
                    <span className="hidden text-sm text-[var(--color-muted-foreground)] sm:block">
                        {user.name || user.email}
                    </span>
                    <button
                        type="button"
                        onClick={() => signOut({ callbackUrl: "/?signed_out=1" })}
                        className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-sidebar-accent)] hover:text-[var(--color-foreground)]"
                        title="Sair"
                    >
                        <LogOut className="h-4 w-4" />
                    </button>

                    {/* Mobile Menu Button */}
                    <button
                        type="button"
                        className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-sidebar-accent)] md:hidden"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile Navigation */}
            {mobileMenuOpen && (
                <nav className="border-t border-[var(--color-border)] p-2 md:hidden">
                    {navItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className={cn(
                                    "flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-[var(--color-sidebar-accent)] text-[var(--color-foreground)]"
                                        : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-sidebar-accent)]"
                                )}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            )}
        </header>
    );
}
