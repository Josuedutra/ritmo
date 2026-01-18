"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Badge, Card, CardContent, toast, Textarea } from "@/components/ui";
import {
    Mail,
    Phone,
    Copy,
    Check,
    ExternalLink,
    FileText,
    Clock,
    Building2,
    Euro,
    CheckCircle2,
    Plus,
    ClipboardCopy,
    AlertTriangle,
    Calendar,
    Zap,
    XCircle,
    Loader2,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

export interface ActionCardProps {
    id: string;
    type: "email" | "call";
    eventType: string;
    title: string;
    priority?: "HIGH" | "LOW" | null;
    scheduledFor: Date;
    processedAt?: Date | null;
    autoSent?: boolean;
    quote: {
        id: string;
        title: string;
        reference?: string | null;
        value?: number | string | null;
        sentAt?: Date | null;
        proposalLink?: string | null;
        hasProposalFile?: boolean;
    };
    contact: {
        name?: string | null;
        email?: string | null;
        company?: string | null;
        phone?: string | null;
    } | null;
    template?: {
        code: string;
        subject?: string | null;
        body: string;
    } | null;
    isTask?: boolean;
    taskId?: string;
    onComplete?: (id: string, notes?: string) => Promise<void>;
    onCopyTemplate?: (template: string) => void;
    onStatusChange?: (quoteId: string, status: string) => Promise<void>;
}

export function ActionCard({
    id,
    type,
    eventType,
    title,
    priority,
    scheduledFor,
    processedAt,
    autoSent,
    quote,
    contact,
    template,
    isTask,
    taskId,
    onComplete,
    onCopyTemplate,
    onStatusChange,
}: ActionCardProps) {
    const [copied, setCopied] = useState(false);
    const [completing, setCompleting] = useState(false);
    const [loadingProposal, setLoadingProposal] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
    const [callNotes, setCallNotes] = useState("");
    const [showNotesField, setShowNotesField] = useState(false);

    const isHigh = priority === "HIGH";
    const isCall = type === "call";
    const Icon = isCall ? Phone : Mail;
    const hasProposal = quote.proposalLink || quote.hasProposalFile;

    // Format value
    const formattedValue = quote.value
        ? `€${typeof quote.value === "number" ? quote.value.toLocaleString("pt-PT") : quote.value}`
        : null;

    // Format sent date
    const sentDateFormatted = quote.sentAt
        ? format(new Date(quote.sentAt), "d MMM", { locale: pt })
        : null;

    // Get stage label
    const stageLabel = getStageLabel(eventType);

    // Build template with variables replaced
    const processedTemplate = template
        ? replaceTemplateVariables(template.body, {
              contact_name: contact?.name || "Cliente",
              contact_company: contact?.company || "",
              quote_title: quote.title,
              quote_reference: quote.reference || quote.title,
              quote_value: formattedValue || "",
          })
        : null;

    // Preview template (first 3-4 lines, ~150 chars)
    const templatePreview = processedTemplate
        ? processedTemplate.length > 150
            ? processedTemplate.substring(0, 150).trim() + "..."
            : processedTemplate
        : null;

    // Call script bullets
    const callScriptBullets = [
        `Confirmar se recebeu o orçamento`,
        `Perguntar se tem dúvidas`,
        `Propor próximo passo`,
    ];

    const handleCopyTemplate = async () => {
        if (!processedTemplate) return;

        try {
            await navigator.clipboard.writeText(processedTemplate);
            setCopied(true);
            onCopyTemplate?.(processedTemplate);
            toast.success("Template copiado!");
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("Failed to copy:", error);
            toast.error("Erro ao copiar", "Não foi possível copiar para o clipboard");
        }
    };

    const handleCopySummary = async () => {
        const sentDate = quote.sentAt
            ? format(new Date(quote.sentAt), "d 'de' MMMM", { locale: pt })
            : "N/A";

        const summary = [
            `Cliente: ${contact?.name || "N/A"}`,
            contact?.company ? `Empresa: ${contact.company}` : null,
            `Orçamento: ${quote.reference || quote.title}`,
            formattedValue ? `Valor: ${formattedValue}` : null,
            `Enviado: ${sentDate}`,
            "",
            "---",
            isCall
                ? `Script: "Bom dia/boa tarde, ${contact?.name || "cliente"}. Daqui fala [Nome] da [Empresa]. Estou a ligar relativamente ao orçamento que enviei há cerca de uma semana para ${quote.title}. Teve oportunidade de analisar? Há alguma questão que possa esclarecer?"`
                : `Objetivo: Follow-up ${stageLabel} para ${quote.title}`,
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

    const handleComplete = async () => {
        if (!onComplete) return;
        setCompleting(true);
        try {
            await onComplete(taskId || id, callNotes || undefined);
        } finally {
            setCompleting(false);
        }
    };

    const handleOpenProposal = async () => {
        if (quote.hasProposalFile) {
            setLoadingProposal(true);
            try {
                const response = await fetch(`/api/quotes/${quote.id}/proposal/url`);
                const data = await response.json();
                if (data.url) {
                    window.open(data.url, "_blank", "noopener,noreferrer");
                }
            } catch (error) {
                console.error("Failed to get proposal URL:", error);
            } finally {
                setLoadingProposal(false);
            }
        } else if (quote.proposalLink) {
            window.open(quote.proposalLink, "_blank", "noopener,noreferrer");
        }
    };

    // P1-02: Handle status change
    const handleStatusChange = async (status: string) => {
        if (!onStatusChange) return;
        setUpdatingStatus(status);
        try {
            await onStatusChange(quote.id, status);
        } catch (error) {
            console.error("Failed to update status:", error);
            toast.error("Erro ao atualizar", "Tente novamente");
        } finally {
            setUpdatingStatus(null);
        }
    };

    // P0-07: Priority HIGH styling - amber accent, subtle but noticeable
    const cardClasses = isHigh
        ? "border-amber-500/50 bg-gradient-to-r from-amber-500/5 to-transparent shadow-[inset_0_0_0_1px_rgba(245,158,11,0.1)]"
        : "hover:border-[var(--color-border-hover)]";

    return (
        <Card className={`transition-all ${cardClasses}`}>
            <CardContent className="p-4">
                {/* P0-07: High priority indicator bar */}
                {isHigh && (
                    <div className="mb-3 flex items-center gap-2 text-amber-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-xs font-medium">Prioritário — requer atenção</span>
                    </div>
                )}

                {/* Header with context */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                        {/* Icon - larger for calls */}
                        <div
                            className={`shrink-0 rounded-lg p-2.5 ${
                                isCall
                                    ? isHigh
                                        ? "bg-amber-500/15 text-amber-600"
                                        : "bg-green-500/10 text-green-500"
                                    : "bg-blue-500/10 text-blue-500"
                            }`}
                        >
                            <Icon className={isCall ? "h-6 w-6" : "h-5 w-5"} />
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                            {/* Title */}
                            <h4 className="font-semibold">{title}</h4>

                            {/* Context row: client, company, value, sent date */}
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                                {contact?.name && (
                                    <span className="font-medium">{contact.name}</span>
                                )}
                                {contact?.company && (
                                    <span className="flex items-center gap-1 text-[var(--color-muted-foreground)]">
                                        <Building2 className="h-3 w-3" />
                                        {contact.company}
                                    </span>
                                )}
                                {formattedValue && (
                                    <span className="flex items-center gap-1 font-semibold">
                                        {formattedValue}
                                    </span>
                                )}
                                {sentDateFormatted && (
                                    <span className="flex items-center gap-1 text-[var(--color-muted-foreground)]">
                                        <Calendar className="h-3 w-3" />
                                        Enviado {sentDateFormatted}
                                    </span>
                                )}
                            </div>

                            {/* Stage badge */}
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                <Badge variant="secondary" className="gap-1">
                                    <Clock className="h-3 w-3" />
                                    {stageLabel}
                                </Badge>
                                {isTask && (
                                    <Badge variant="outline" className="gap-1 text-orange-600 border-orange-300">
                                        Ação manual
                                    </Badge>
                                )}
                                {autoSent && processedAt && (
                                    <Badge variant="success" className="gap-1">
                                        <Zap className="h-3 w-3" />
                                        Enviado {format(new Date(processedAt), "HH:mm", { locale: pt })}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right side: Value highlight for calls */}
                    {isCall && formattedValue && (
                        <div className="text-right shrink-0">
                            <p className="text-xl font-bold">{formattedValue}</p>
                        </div>
                    )}
                </div>

                {/* P0-05: Email template preview */}
                {type === "email" && templatePreview && (
                    <div className="mt-3 rounded-md bg-[var(--color-muted)]/50 p-3">
                        <pre className="whitespace-pre-wrap font-sans text-xs text-[var(--color-muted-foreground)] leading-relaxed">
                            {templatePreview}
                        </pre>
                    </div>
                )}

                {/* P0-06: Call script bullets */}
                {isCall && (
                    <div className="mt-3 rounded-md bg-[var(--color-muted)]/50 p-3">
                        <p className="text-xs font-medium text-[var(--color-muted-foreground)] mb-2">Script rápido:</p>
                        <ul className="space-y-1">
                            {callScriptBullets.map((bullet, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                    <span className="text-[var(--color-primary)]">•</span>
                                    {bullet}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* P0-06: Call notes field */}
                {isCall && showNotesField && (
                    <div className="mt-3">
                        <Textarea
                            placeholder="Notas da chamada (opcional)..."
                            value={callNotes}
                            onChange={(e) => setCallNotes(e.target.value)}
                            rows={2}
                            className="text-sm"
                        />
                    </div>
                )}

                {/* Actions - reorganized for quick execution */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                    {/* Primary actions first */}
                    {type === "email" && (
                        <>
                            {processedTemplate && (
                                <Button
                                    variant={isHigh ? "default" : "outline"}
                                    size="sm"
                                    onClick={handleCopyTemplate}
                                    className="gap-1.5"
                                >
                                    {copied ? (
                                        <Check className="h-3.5 w-3.5" />
                                    ) : (
                                        <Copy className="h-3.5 w-3.5" />
                                    )}
                                    {copied ? "Copiado!" : "Copiar template"}
                                </Button>
                            )}
                            {hasProposal && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleOpenProposal}
                                    disabled={loadingProposal}
                                    className="gap-1.5"
                                >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    {loadingProposal ? "A abrir..." : "Abrir proposta"}
                                </Button>
                            )}
                        </>
                    )}

                    {/* P0-06: Call primary actions */}
                    {isCall && (
                        <>
                            {hasProposal && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleOpenProposal}
                                    disabled={loadingProposal}
                                    className="gap-1.5"
                                >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    {loadingProposal ? "A abrir..." : "Abrir proposta"}
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCopySummary}
                                className="gap-1.5"
                            >
                                <ClipboardCopy className="h-3.5 w-3.5" />
                                Copiar resumo
                            </Button>
                            {contact?.phone && (
                                <a
                                    href={`tel:${contact.phone}`}
                                    className={`inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-xs font-medium transition-colors ${
                                        isHigh
                                            ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)]"
                                            : "border border-[var(--color-border)] bg-transparent hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]"
                                    }`}
                                >
                                    <Phone className="h-3.5 w-3.5" />
                                    Ligar {contact.phone}
                                </a>
                            )}
                            {!hasProposal && (
                                <Link
                                    href={`/quotes/${quote.id}#proposal`}
                                    className="inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-dashed border-orange-400 bg-orange-500/5 px-3 text-xs font-medium text-orange-600 transition-colors hover:bg-orange-500/10"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Adicionar proposta
                                </Link>
                            )}
                        </>
                    )}

                    {/* Secondary actions */}
                    <Link href={`/quotes/${quote.id}`}>
                        <Button variant="ghost" size="sm" className="gap-1.5">
                            <FileText className="h-3.5 w-3.5" />
                            Ver orçamento
                        </Button>
                    </Link>

                    {/* Complete action - pushed to the right */}
                    <div className="ml-auto flex items-center gap-2">
                        {isCall && !showNotesField && (
                            <button
                                type="button"
                                onClick={() => setShowNotesField(true)}
                                className="text-xs text-[var(--color-muted-foreground)] hover:underline"
                            >
                                + Notas
                            </button>
                        )}
                        <Button
                            variant={isHigh ? "default" : "secondary"}
                            size="sm"
                            onClick={handleComplete}
                            disabled={completing}
                            className="gap-1.5"
                        >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {completing ? "A marcar..." : "Concluir"}
                        </Button>
                    </div>
                </div>

                {/* P1-02: One-click status update buttons */}
                {onStatusChange && (
                    <div className="mt-3 flex items-center gap-2 border-t border-[var(--color-border)] pt-3">
                        <span className="text-xs text-[var(--color-muted-foreground)]">Status:</span>
                        <button
                            type="button"
                            onClick={() => handleStatusChange("won")}
                            disabled={updatingStatus !== null}
                            className="inline-flex h-6 items-center gap-1 rounded border border-green-500/30 bg-green-500/10 px-2 text-xs font-medium text-green-600 transition-colors hover:bg-green-500/20 disabled:opacity-50"
                        >
                            {updatingStatus === "won" ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                                <CheckCircle2 className="h-3 w-3" />
                            )}
                            Ganho
                        </button>
                        <button
                            type="button"
                            onClick={() => handleStatusChange("lost")}
                            disabled={updatingStatus !== null}
                            className="inline-flex h-6 items-center gap-1 rounded border border-red-500/30 bg-red-500/10 px-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                        >
                            {updatingStatus === "lost" ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                                <XCircle className="h-3 w-3" />
                            )}
                            Perdido
                        </button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function getStageLabel(eventType: string): string {
    switch (eventType) {
        case "email_d1":
            return "D+1";
        case "email_d3":
            return "D+3";
        case "call_d7":
            return "D+7";
        case "email_d14":
            return "D+14";
        default:
            return eventType;
    }
}

function replaceTemplateVariables(
    template: string,
    variables: Record<string, string>
): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
        result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
    }
    return result;
}

function buildMailtoLink(
    email: string,
    subject?: string | null,
    body?: string | null
): string {
    const params = new URLSearchParams();
    if (subject) params.set("subject", subject);
    if (body) params.set("body", body);
    const queryString = params.toString();
    return `mailto:${email}${queryString ? `?${queryString}` : ""}`;
}
