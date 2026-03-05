"use client";

import { useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Copy, Check, Loader2, Link2 } from "lucide-react";

interface ValidationResult {
    valid: boolean;
    partnerName?: string;
    error?: string;
}

export function ReferralCodeForm() {
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ValidationResult | null>(null);
    const [copied, setCopied] = useState(false);

    const validate = useCallback(async () => {
        const trimmed = code.trim();
        if (!trimmed) return;

        setLoading(true);
        setResult(null);

        try {
            const res = await fetch(
                `/api/referrals/capture?code=${encodeURIComponent(trimmed)}`
            );
            const data = await res.json();

            if (data.valid) {
                setResult({ valid: true, partnerName: data.partnerName });
            } else {
                setResult({
                    valid: false,
                    error: "Código inválido ou parceiro inativo.",
                });
            }
        } catch {
            setResult({
                valid: false,
                error: "Erro de ligação. Tente novamente.",
            });
        } finally {
            setLoading(false);
        }
    }, [code]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        validate();
    };

    const shareableUrl = result?.valid
        ? `${typeof window !== "undefined" ? window.location.origin : ""}/signup?ref=${encodeURIComponent(code.trim())}`
        : null;

    const copyLink = async () => {
        if (!shareableUrl) return;
        try {
            await navigator.clipboard.writeText(shareableUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback: select text from input
        }
    };

    return (
        <div className="mx-auto w-full max-w-md">
            <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                    type="text"
                    value={code}
                    onChange={(e) => {
                        setCode(e.target.value);
                        if (result) setResult(null);
                    }}
                    placeholder="Ex: acme2024"
                    className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                    disabled={loading}
                    autoComplete="off"
                />
                <button
                    type="submit"
                    disabled={loading || !code.trim()}
                    className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Link2 className="h-4 w-4" />
                    )}
                    Validar
                </button>
            </form>

            {/* Success state */}
            {result?.valid && (
                <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                        <CheckCircle2 className="h-5 w-5 shrink-0" />
                        <p className="text-sm font-medium">
                            Código válido — parceiro{" "}
                            <strong>{result.partnerName}</strong>
                        </p>
                    </div>

                    {shareableUrl && (
                        <div className="mt-3">
                            <p className="mb-1.5 text-xs text-green-600 dark:text-green-500">
                                Link de referência para partilhar:
                            </p>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    value={shareableUrl}
                                    className="flex-1 rounded-md border border-green-200 bg-white px-3 py-2 text-xs text-green-800 dark:border-green-800 dark:bg-green-950/50 dark:text-green-300"
                                    onClick={(e) =>
                                        (e.target as HTMLInputElement).select()
                                    }
                                />
                                <button
                                    type="button"
                                    onClick={copyLink}
                                    className="inline-flex items-center gap-1.5 rounded-md border border-green-200 bg-white px-3 py-2 text-xs font-medium text-green-700 transition-colors hover:bg-green-100 dark:border-green-800 dark:bg-green-950/50 dark:text-green-400 dark:hover:bg-green-900/50"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="h-3.5 w-3.5" />
                                            Copiado
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-3.5 w-3.5" />
                                            Copiar
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Error state */}
            {result && !result.valid && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
                    <AlertCircle className="h-5 w-5 shrink-0 text-red-500 dark:text-red-400" />
                    <p className="text-sm text-red-700 dark:text-red-400">
                        {result.error}
                    </p>
                </div>
            )}
        </div>
    );
}
