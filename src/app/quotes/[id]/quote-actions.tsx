"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, toast } from "@/components/ui";
import {
    Send,
    RotateCcw,
    CheckCircle,
    XCircle,
    Handshake,
    AlertTriangle,
    ClipboardCopy,
    Loader2,
    X,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

// P1-02: Common loss reasons
const LOSS_REASONS = [
    { id: "price", label: "Preço elevado" },
    { id: "competitor", label: "Escolheu concorrente" },
    { id: "no_budget", label: "Sem orçamento" },
    { id: "timing", label: "Má altura" },
    { id: "no_response", label: "Sem resposta" },
    { id: "other", label: "Outro motivo" },
];

interface Quote {
    id: string;
    title: string;
    reference?: string | null;
    businessStatus: string;
    ritmoStage: string;
    sentAt: string | null;
    value?: number | null;
    contact?: {
        name?: string | null;
        company?: string | null;
        phone?: string | null;
    } | null;
}

interface QuoteActionsProps {
    quote: Quote;
}

export function QuoteActions({ quote }: QuoteActionsProps) {
    const router = useRouter();
    const [loading, setLoading] = useState<string | null>(null);
    const [limitError, setLimitError] = useState<{
        message: string;
        limit: number;
        used: number;
        action?: string;
    } | null>(null);
    // P1-02: Loss reason modal state
    const [showLossReasonModal, setShowLossReasonModal] = useState(false);
    const [selectedLossReason, setSelectedLossReason] = useState<string | null>(null);

    const handleMarkSent = async () => {
        setLoading("send");
        setLimitError(null);
        try {
            const response = await fetch(`/api/quotes/${quote.id}/mark-sent`, {
                method: "POST",
            });

            if (!response.ok) {
                const data = await response.json();
                if (
                    data.error === "LIMIT_EXCEEDED" ||
                    data.error === "PAYMENT_REQUIRED" ||
                    data.error === "SUBSCRIPTION_CANCELLED"
                ) {
                    setLimitError({
                        message: data.message,
                        limit: data.limit,
                        used: data.used,
                        action: data.action,
                    });
                    return;
                }
                toast.error("Erro ao enviar", data.message || "Tente novamente");
                return;
            }

            toast.success("Orçamento enviado!", "Cadência de follow-up iniciada");
            router.refresh();
        } catch (error) {
            console.error("Error marking as sent:", error);
            toast.error("Erro ao enviar", "Verifique a sua conexão e tente novamente");
        } finally {
            setLoading(null);
        }
    };

    const handleResend = async () => {
        setLoading("resend");
        try {
            const response = await fetch(`/api/quotes/${quote.id}/mark-sent?force=true`, {
                method: "POST",
            });

            if (!response.ok) {
                const data = await response.json();
                toast.error("Erro ao reenviar", data.message || "Tente novamente");
                return;
            }

            toast.success("Orçamento reenviado!", "Cadência reiniciada");
            router.refresh();
        } catch (error) {
            console.error("Error resending:", error);
            toast.error("Erro ao reenviar", "Verifique a sua conexão e tente novamente");
        } finally {
            setLoading(null);
        }
    };

    const handleStatusChange = async (newStatus: string, lossReason?: string | null) => {
        setLoading(newStatus);
        try {
            const body: Record<string, any> = { businessStatus: newStatus };
            // P1-02: Include loss reason if provided
            if (newStatus === "lost" && lossReason) {
                body.lossReason = lossReason;
            }
            // Clear loss reason if reopening
            if (newStatus !== "lost") {
                body.lossReason = null;
            }

            const response = await fetch(`/api/quotes/${quote.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const data = await response.json();
                toast.error("Erro ao atualizar", data.message || "Tente novamente");
                return;
            }

            const statusLabels: Record<string, string> = {
                won: "Ganho",
                lost: "Perdido",
                negotiation: "Em negociação",
                sent: "Reaberto",
            };
            toast.success(`Status: ${statusLabels[newStatus] || newStatus}`);
            router.refresh();
        } catch (error) {
            console.error("Error updating status:", error);
            toast.error("Erro ao atualizar", "Verifique a sua conexão e tente novamente");
        } finally {
            setLoading(null);
            setShowLossReasonModal(false);
            setSelectedLossReason(null);
        }
    };

    // P1-02: Handle lost button click - show modal
    const handleLostClick = () => {
        setShowLossReasonModal(true);
    };

    // P1-02: Confirm lost with optional reason
    const handleConfirmLost = () => {
        handleStatusChange("lost", selectedLossReason);
    };

    const handleCopySummary = async () => {
        const sentDate = quote.sentAt
            ? format(new Date(quote.sentAt), "d 'de' MMMM", { locale: pt })
            : "N/A";

        const formattedValue = quote.value
            ? `€${quote.value.toLocaleString("pt-PT")}`
            : null;

        const summary = [
            `Cliente: ${quote.contact?.name || "N/A"}`,
            quote.contact?.company ? `Empresa: ${quote.contact.company}` : null,
            `Orçamento: ${quote.reference || quote.title}`,
            formattedValue ? `Valor: ${formattedValue}` : null,
            `Enviado: ${sentDate}`,
            "",
            "---",
            `Script: "Bom dia/boa tarde, ${quote.contact?.name || "cliente"}. Daqui fala [Nome] da [Empresa]. Estou a ligar relativamente ao orçamento que enviei para ${quote.title}. Teve oportunidade de analisar? Há alguma questão que possa esclarecer?"`,
        ]
            .filter(Boolean)
            .join("\n");

        try {
            await navigator.clipboard.writeText(summary);
            toast.success("Resumo copiado!");
        } catch (error) {
            console.error("Failed to copy summary:", error);
            toast.error("Erro ao copiar", "Não foi possível copiar para o clipboard");
        }
    };

    const isSent = quote.businessStatus === "sent";
    const isNegotiation = quote.businessStatus === "negotiation";
    const isDraft = quote.businessStatus === "draft";
    const isFinished = quote.businessStatus === "won" || quote.businessStatus === "lost";

    const getErrorTitle = () => {
        if (limitError?.action === "update_payment") return "Pagamento em atraso";
        if (limitError?.action === "reactivate_subscription") return "Subscrição cancelada";
        return "Limite atingido";
    };

    const getErrorCTA = () => {
        if (limitError?.action === "update_payment") return "Atualizar pagamento →";
        if (limitError?.action === "reactivate_subscription") return "Reativar subscrição →";
        return "Atualizar plano →";
    };

    return (
        <div className="space-y-3">
            {/* Limit/payment error */}
            {limitError && (
                <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-red-500">{getErrorTitle()}</p>
                        <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
                            {limitError.message}
                        </p>
                        <Link
                            href="/settings/billing"
                            className="mt-2 inline-flex items-center text-sm font-medium text-red-500 hover:underline"
                        >
                            {getErrorCTA()}
                        </Link>
                    </div>
                </div>
            )}

            {/* P1-02: Primary actions row */}
            <div className="flex flex-wrap gap-2">
                {/* Mark as sent (draft only) */}
                {isDraft && (
                    <Button
                        onClick={handleMarkSent}
                        disabled={loading !== null}
                        className="gap-1.5"
                    >
                        {loading === "send" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
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
                        {loading === "resend" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <RotateCcw className="h-4 w-4" />
                        )}
                        {loading === "resend" ? "A reenviar..." : "Reenviar"}
                    </Button>
                )}

                {/* Copy summary button */}
                {(isSent || isNegotiation) && (
                    <Button
                        variant="ghost"
                        onClick={handleCopySummary}
                        className="gap-1.5"
                    >
                        <ClipboardCopy className="h-4 w-4" />
                        Copiar resumo
                    </Button>
                )}

                {/* Reopen if finished */}
                {isFinished && (
                    <Button
                        variant="outline"
                        onClick={() => handleStatusChange("sent")}
                        disabled={loading !== null}
                        className="gap-1.5"
                    >
                        {loading === "sent" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <RotateCcw className="h-4 w-4" />
                        )}
                        Reabrir
                    </Button>
                )}
            </div>

            {/* P1-02: One-click status update buttons - prominent section */}
            {(isSent || isNegotiation) && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[var(--color-muted)]/30 p-2">
                    <span className="text-xs font-medium text-[var(--color-muted-foreground)] mr-1">Atualizar status:</span>
                    {isSent && (
                        <button
                            type="button"
                            onClick={() => handleStatusChange("negotiation")}
                            disabled={loading !== null}
                            className="inline-flex h-7 items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 text-xs font-medium text-amber-600 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
                        >
                            {loading === "negotiation" ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Handshake className="h-3.5 w-3.5" />
                            )}
                            Em negociação
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => handleStatusChange("won")}
                        disabled={loading !== null}
                        className="inline-flex h-7 items-center gap-1.5 rounded-md border border-green-500/30 bg-green-500/10 px-2.5 text-xs font-medium text-green-600 transition-colors hover:bg-green-500/20 disabled:opacity-50"
                    >
                        {loading === "won" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <CheckCircle className="h-3.5 w-3.5" />
                        )}
                        Ganho
                    </button>
                    <button
                        type="button"
                        onClick={handleLostClick}
                        disabled={loading !== null}
                        className="inline-flex h-7 items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                    >
                        {loading === "lost" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <XCircle className="h-3.5 w-3.5" />
                        )}
                        Perdido
                    </button>
                </div>
            )}

            {/* P1-02: Loss reason modal */}
            {showLossReasonModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-sm rounded-lg bg-[var(--color-background)] p-4 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-medium">Marcar como perdido</h3>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowLossReasonModal(false);
                                    setSelectedLossReason(null);
                                }}
                                className="rounded p-1 hover:bg-[var(--color-muted)]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <p className="text-sm text-[var(--color-muted-foreground)] mb-3">
                            Motivo (opcional):
                        </p>

                        <div className="space-y-2 mb-4">
                            {LOSS_REASONS.map((reason) => (
                                <button
                                    key={reason.id}
                                    type="button"
                                    onClick={() => setSelectedLossReason(reason.id === selectedLossReason ? null : reason.id)}
                                    className={`w-full text-left px-3 py-2 text-sm rounded-md border transition-colors ${
                                        selectedLossReason === reason.id
                                            ? "border-red-500 bg-red-500/10 text-red-600"
                                            : "border-[var(--color-border)] hover:bg-[var(--color-muted)]"
                                    }`}
                                >
                                    {reason.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setShowLossReasonModal(false);
                                    setSelectedLossReason(null);
                                }}
                                className="flex-1"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleConfirmLost}
                                disabled={loading === "lost"}
                                className="flex-1 gap-1.5 bg-red-600 hover:bg-red-700"
                            >
                                {loading === "lost" ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <XCircle className="h-4 w-4" />
                                )}
                                Confirmar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
