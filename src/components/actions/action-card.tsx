"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Badge, Card, CardContent, toast } from "@/components/ui";
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
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export interface ActionCardProps {
    id: string;
    type: "email" | "call";
    eventType: string;
    title: string;
    priority?: "HIGH" | "LOW" | null;
    scheduledFor: Date;
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
    onComplete?: (id: string) => Promise<void>;
    onCopyTemplate?: (template: string) => void;
}

export function ActionCard({
    id,
    type,
    eventType,
    title,
    priority,
    scheduledFor,
    quote,
    contact,
    template,
    isTask,
    taskId,
    onComplete,
    onCopyTemplate,
}: ActionCardProps) {
    const [copied, setCopied] = useState(false);
    const [completing, setCompleting] = useState(false);
    const [loadingProposal, setLoadingProposal] = useState(false);

    const isHigh = priority === "HIGH";
    const Icon = type === "email" ? Mail : Phone;
    const hasProposal = quote.proposalLink || quote.hasProposalFile;

    // Format value
    const formattedValue = quote.value
        ? `€${typeof quote.value === "number" ? quote.value.toLocaleString("pt-PT") : quote.value}`
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
            type === "call"
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
            await onComplete(taskId || id);
        } finally {
            setCompleting(false);
        }
    };

    const handleOpenProposal = async () => {
        // If there's an uploaded file, get signed URL
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
            // External link - open directly
            window.open(quote.proposalLink, "_blank", "noopener,noreferrer");
        }
    };

    return (
        <Card
            className={`transition-all ${
                isHigh
                    ? "border-orange-500/40 bg-orange-500/5 hover:border-orange-500/60"
                    : "hover:border-[var(--color-border-hover)]"
            }`}
        >
            <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div
                            className={`mt-0.5 rounded-lg p-2.5 ${
                                type === "email"
                                    ? "bg-blue-500/10 text-blue-500"
                                    : "bg-green-500/10 text-green-500"
                            }`}
                        >
                            <Icon className="h-5 w-5" />
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                            {/* Title + Priority */}
                            <div className="flex items-center gap-2">
                                <h4 className="truncate font-medium">{title}</h4>
                                {isHigh && (
                                    <Badge variant="high" className="shrink-0">
                                        Prioritário
                                    </Badge>
                                )}
                            </div>

                            {/* Contact info */}
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--color-muted-foreground)]">
                                {contact?.name && <span>{contact.name}</span>}
                                {contact?.company && (
                                    <span className="flex items-center gap-1">
                                        <Building2 className="h-3 w-3" />
                                        {contact.company}
                                    </span>
                                )}
                                {formattedValue && (
                                    <span className="flex items-center gap-1 font-medium text-[var(--color-foreground)]">
                                        <Euro className="h-3 w-3" />
                                        {formattedValue}
                                    </span>
                                )}
                            </div>

                            {/* Quote + Stage + Proposal indicator */}
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="gap-1">
                                    <FileText className="h-3 w-3" />
                                    {quote.reference || quote.title}
                                </Badge>
                                <Badge variant="secondary" className="gap-1">
                                    <Clock className="h-3 w-3" />
                                    {stageLabel}
                                </Badge>
                                {hasProposal && (
                                    <button
                                        type="button"
                                        onClick={handleOpenProposal}
                                        disabled={loadingProposal}
                                        className="inline-flex"
                                    >
                                        <Badge
                                            variant="success"
                                            className="gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                                        >
                                            <FileText className="h-3 w-3" />
                                            {loadingProposal ? "A abrir..." : "Proposta"}
                                        </Badge>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                    {/* Email-specific actions */}
                    {type === "email" && (
                        <>
                            {processedTemplate && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCopyTemplate}
                                    className="gap-1.5"
                                >
                                    {copied ? (
                                        <Check className="h-3.5 w-3.5 text-green-500" />
                                    ) : (
                                        <Copy className="h-3.5 w-3.5" />
                                    )}
                                    {copied ? "Copiado!" : "Copiar template"}
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCopySummary}
                                className="gap-1.5"
                            >
                                <ClipboardCopy className="h-3.5 w-3.5" />
                                Resumo
                            </Button>
                            {contact?.email && (
                                <a
                                    href={buildMailtoLink(
                                        contact.email,
                                        template?.subject,
                                        processedTemplate
                                    )}
                                    className="inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-xs font-medium transition-colors hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]"
                                >
                                    <Mail className="h-3.5 w-3.5" />
                                    Abrir email
                                </a>
                            )}
                            {hasProposal && (
                                <button
                                    type="button"
                                    onClick={handleOpenProposal}
                                    disabled={loadingProposal}
                                    className="inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-xs font-medium transition-colors hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)] disabled:opacity-50"
                                >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    {loadingProposal ? "A abrir..." : "Abrir proposta"}
                                </button>
                            )}
                        </>
                    )}

                    {/* Call-specific actions */}
                    {type === "call" && (
                        <>
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
                                    className="inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-[var(--color-border)] bg-transparent px-3 text-xs font-medium transition-colors hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]"
                                >
                                    <Phone className="h-3.5 w-3.5" />
                                    Ligar
                                </a>
                            )}
                            {hasProposal ? (
                                <button
                                    type="button"
                                    onClick={handleOpenProposal}
                                    disabled={loadingProposal}
                                    className="inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-xs font-medium transition-colors hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)] disabled:opacity-50"
                                >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    {loadingProposal ? "A abrir..." : "Abrir proposta"}
                                </button>
                            ) : (
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

                    {/* Common actions */}
                    <Link href={`/quotes/${quote.id}`}>
                        <Button variant="ghost" size="sm" className="gap-1.5">
                            <FileText className="h-3.5 w-3.5" />
                            Ver orçamento
                        </Button>
                    </Link>

                    {/* Complete action - pushed to the right */}
                    <div className="ml-auto">
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
