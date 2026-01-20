"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";

const COOKIE_NOTICE_KEY = "ritmo_cookie_notice_dismissed";

/**
 * Banner informativo de cookies.
 * Aparece na primeira visita e desaparece após o utilizador clicar "OK".
 * Não bloqueia o uso do site - é apenas informativo.
 */
export function CookieBanner() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check if banner was already dismissed
        const dismissed = localStorage.getItem(COOKIE_NOTICE_KEY);
        if (!dismissed) {
            // Small delay to avoid layout shift on initial load
            const timer = setTimeout(() => setIsVisible(true), 500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleDismiss = () => {
        localStorage.setItem(COOKIE_NOTICE_KEY, "true");
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
            <div className="mx-auto max-w-2xl rounded-xl border border-zinc-200 bg-white p-4 shadow-lg sm:flex sm:items-center sm:justify-between sm:gap-4">
                <p className="text-sm text-zinc-600 mb-3 sm:mb-0">
                    Usamos apenas cookies essenciais para autenticação e segurança.{" "}
                    <Link
                        href="/cookies"
                        className="font-medium text-zinc-900 underline hover:text-black"
                    >
                        Saiba mais
                    </Link>
                </p>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDismiss}
                        className="flex-1 sm:flex-none rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
                    >
                        OK
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 sm:hidden"
                        aria-label="Fechar"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
