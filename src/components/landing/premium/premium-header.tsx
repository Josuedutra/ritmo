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
        "fixed top-0 right-0 left-0 z-50 border-b border-transparent transition-all duration-300",
        scrolled ? "border-white/10 bg-black/50 backdrop-blur-md" : "bg-transparent"
      )}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          {/* Logo Icon or SVG */}
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-blue-500 to-emerald-500 font-bold text-white">
            R
          </div>
          <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-xl font-bold text-transparent">
            Ritmo
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-zinc-400 md:flex">
          <Link href="#features" className="transition-colors hover:text-white">
            Funcionalidades
          </Link>
          <Link href="#how-it-works" className="transition-colors hover:text-white">
            Como funciona
          </Link>
          <Link href="#pricing" className="transition-colors hover:text-white">
            Planos
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="hidden text-sm font-medium text-zinc-300 transition-colors hover:text-white sm:block"
          >
            Entrar
          </Link>
          <Link href="/signup">
            <Button className="rounded-full bg-white px-6 text-black transition-colors hover:bg-zinc-200">
              Experimentar grátis
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
