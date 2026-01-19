"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function PremiumHeader() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <header
            className={cn(
                "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-transparent",
                scrolled ? "bg-black/50 backdrop-blur-md border-white/10" : "bg-transparent"
            )}
        >
            <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                    {/* Logo Icon or SVG */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center font-bold text-white">R</div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                        Ritmo
                    </span>
                </Link>

                <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
                    <Link href="#features" className="hover:text-white transition-colors">Funcionalidades</Link>
                    <Link href="#how-it-works" className="hover:text-white transition-colors">Como funciona</Link>
                    <Link href="#pricing" className="hover:text-white transition-colors">Planos</Link>
                </nav>

                <div className="flex items-center gap-4">
                    <Link href="/login" className="text-sm font-medium text-zinc-300 hover:text-white transition-colors hidden sm:block">
                        Entrar
                    </Link>
                    <Link href="/signup">
                        <Button className="rounded-full bg-white text-black hover:bg-zinc-200 transition-colors px-6">
                            Começar trial
                        </Button>
                    </Link>
                </div>
            </div>
        </header>
    );
}
