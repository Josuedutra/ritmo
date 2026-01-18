"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui";
import { Send, RotateCcw, CheckCircle, XCircle, Handshake, AlertTriangle } from "lucide-react";

interface Quote {
    id: string;
    businessStatus: string;
    ritmoStage: string;
    sentAt: string | null;
}

interface QuoteActionsProps {
    quote: Quote;
}

export function QuoteActions({ quote }: QuoteActionsProps) {
    const router = useRouter();
    const [loading, setLoading] = useState<string | null>(null);
    const [limitError, setLimitError] = useState<{ message: string; limit: number; used: number } | null>(null);

    const handleMarkSent = async () => {
        setLoading("send");
        setLimitError(null);
        try {
            const response = await fetch(`/api/quotes/${quote.id}/mark-sent`, {
                method: "POST",
            });

            if (!response.ok) {
                const data = await response.json();
                if (data.error === "LIMIT_EXCEEDED") {
                    setLimitError({
                        message: data.message,
                        limit: data.limit,
                        used: data.used,
                    });
                    return;
                }
                alert(data.error || data.message || "Erro ao marcar como enviado");
                return;
            }

            router.refresh();
        } catch (error) {
            console.error("Error marking as sent:", error);
            alert("Erro ao marcar como enviado");
        } finally {
            setLoading(null);
        }
    };

    const handleResend = async () => {
        setLoading("resend");
        try {
            const response = await fetch(`/api/quotes/${quote.id}/mark-sent`, {
                method: "POST",
            });

            if (!response.ok) {
                const data = await response.json();
                alert(data.error || "Erro ao reenviar");
                return;
            }

            router.refresh();
        } catch (error) {
            console.error("Error resending:", error);
            alert("Erro ao reenviar");
        } finally {
            setLoading(null);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        setLoading(newStatus);
        try {
            const response = await fetch(`/api/quotes/${quote.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ businessStatus: newStatus }),
            });

            if (!response.ok) {
                const data = await response.json();
                alert(data.error || "Erro ao atualizar status");
                return;
            }

            router.refresh();
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Erro ao atualizar status");
        } finally {
            setLoading(null);
        }
    };

    const isSent = quote.businessStatus === "sent";
    const isNegotiation = quote.businessStatus === "negotiation";
    const isDraft = quote.businessStatus === "draft";
    const isFinished = quote.businessStatus === "won" || quote.businessStatus === "lost";

    return (
        <div className="space-y-3">
            {/* Limit exceeded error */}
            {limitError && (
                <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-red-500">Limite atingido</p>
                        <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
                            {limitError.message}
                        </p>
                        <Link
                            href="/settings/billing"
                            className="mt-2 inline-flex items-center text-sm font-medium text-red-500 hover:underline"
                        >
                            Atualizar plano →
                        </Link>
                    </div>
                </div>
            )}

            <div className="flex flex-wrap gap-2">
            {/* Mark as sent (draft only) */}
            {isDraft && (
                <Button
                    onClick={handleMarkSent}
                    disabled={loading !== null}
                    className="gap-1.5"
                >
                    <Send className="h-4 w-4" />
                    {loading === "send" ? "A enviar..." : "Marcar como enviado"}
                </Button>
            )}

            {/* Resend (sent or negotiation) */}
            {(isSent || isNegotiation) && (
                <Button
                    variant="outline"
                    onClick={handleResend}
                    disabled={loading !== null}
                    className="gap-1.5"
                >
                    <RotateCcw className="h-4 w-4" />
                    {loading === "resend" ? "A reenviar..." : "Reenviar"}
                </Button>
            )}

            {/* Move to negotiation */}
            {isSent && (
                <Button
                    variant="outline"
                    onClick={() => handleStatusChange("negotiation")}
                    disabled={loading !== null}
                    className="gap-1.5"
                >
                    <Handshake className="h-4 w-4" />
                    {loading === "negotiation" ? "A atualizar..." : "Em negociação"}
                </Button>
            )}

            {/* Mark as won/lost */}
            {(isSent || isNegotiation) && (
                <>
                    <Button
                        variant="outline"
                        onClick={() => handleStatusChange("won")}
                        disabled={loading !== null}
                        className="gap-1.5 border-green-500/30 text-green-600 hover:bg-green-500/10"
                    >
                        <CheckCircle className="h-4 w-4" />
                        {loading === "won" ? "..." : "Ganho"}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => handleStatusChange("lost")}
                        disabled={loading !== null}
                        className="gap-1.5 border-red-500/30 text-red-600 hover:bg-red-500/10"
                    >
                        <XCircle className="h-4 w-4" />
                        {loading === "lost" ? "..." : "Perdido"}
                    </Button>
                </>
            )}

            {/* Reopen if finished */}
            {isFinished && (
                <Button
                    variant="outline"
                    onClick={() => handleStatusChange("sent")}
                    disabled={loading !== null}
                    className="gap-1.5"
                >
                    <RotateCcw className="h-4 w-4" />
                    {loading === "sent" ? "..." : "Reabrir"}
                </Button>
            )}
            </div>
        </div>
    );
}
