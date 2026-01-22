"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge, toast } from "@/components/ui";
import { UpgradePrompt, UPGRADE_PROMPTS } from "@/components/billing/upgrade-prompt";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { FileText, Upload, ExternalLink, Trash2, Link as LinkIcon, Save, Copy, Check, CheckCircle2, AlertTriangle } from "lucide-react";

// Inbound domain for BCC addresses
const INBOUND_DOMAIN = process.env.NEXT_PUBLIC_INBOUND_DOMAIN || "inbound.ritmo.app";

interface Quote {
    id: string;
    publicId: string;
    orgShortId: string | null;
    proposalLink: string | null;
    proposalFile: {
        id: string;
        filename: string;
        sizeBytes: number;
        createdAt: string;
        expiresAt: string | null;
        deletedAt: string | null;
    } | null;
    // P1-UPGRADE-PROMPTS: Ingest status from inbound processing
    ingestStatus?: "pending" | "processed" | "rejected_quota_exceeded" | "rejected_other" | null;
}

interface ProposalSectionProps {
    quote: Quote;
}

export function ProposalSection({ quote }: ProposalSectionProps) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [savingLink, setSavingLink] = useState(false);
    const [linkValue, setLinkValue] = useState(quote.proposalLink || "");
    const [showLinkEdit, setShowLinkEdit] = useState(false);
    const [loadingUrl, setLoadingUrl] = useState(false);
    const [bccCopied, setBccCopied] = useState(false);

    // Generate BCC address for this quote (using "all+" for Cloudflare compatibility)
    const bccAddress = quote.orgShortId
        ? `all+${quote.orgShortId}+${quote.publicId}@${INBOUND_DOMAIN}`
        : null;

    const handleCopyBcc = async () => {
        if (!bccAddress) return;

        try {
            await navigator.clipboard.writeText(bccAddress);
            setBccCopied(true);
            toast.success("BCC copiado!");
            setTimeout(() => setBccCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy BCC:", err);
            toast.error("Erro ao copiar");
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== "application/pdf") {
            alert("Apenas ficheiros PDF são permitidos");
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            alert("Ficheiro demasiado grande (máx. 10MB)");
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch(`/api/quotes/${quote.id}/proposal`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const data = await response.json();
                alert(data.error || "Erro ao carregar ficheiro");
                return;
            }

            router.refresh();
        } catch (error) {
            console.error("Upload error:", error);
            alert("Erro ao carregar ficheiro");
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleDelete = async () => {
        if (!confirm("Tem a certeza que deseja remover a proposta?")) return;

        setDeleting(true);
        try {
            const response = await fetch(`/api/quotes/${quote.id}/proposal`, {
                method: "DELETE",
            });

            if (!response.ok) {
                const data = await response.json();
                alert(data.error || "Erro ao remover ficheiro");
                return;
            }

            router.refresh();
        } catch (error) {
            console.error("Delete error:", error);
            alert("Erro ao remover ficheiro");
        } finally {
            setDeleting(false);
        }
    };

    const handleSaveLink = async () => {
        setSavingLink(true);
        try {
            const response = await fetch(`/api/quotes/${quote.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ proposalLink: linkValue || null }),
            });

            if (!response.ok) {
                const data = await response.json();
                alert(data.error || "Erro ao guardar link");
                return;
            }

            setShowLinkEdit(false);
            router.refresh();
        } catch (error) {
            console.error("Save link error:", error);
            alert("Erro ao guardar link");
        } finally {
            setSavingLink(false);
        }
    };

    const handleOpenProposal = async () => {
        if (quote.proposalFile) {
            setLoadingUrl(true);
            try {
                const response = await fetch(`/api/quotes/${quote.id}/proposal/url`);
                const data = await response.json();
                if (data.url) {
                    window.open(data.url, "_blank", "noopener,noreferrer");
                }
            } catch (error) {
                console.error("Failed to get proposal URL:", error);
            } finally {
                setLoadingUrl(false);
            }
        } else if (quote.proposalLink) {
            window.open(quote.proposalLink, "_blank", "noopener,noreferrer");
        }
    };

    // Check if proposal file is expired or deleted
    const isFileExpired = quote.proposalFile && (
        quote.proposalFile.deletedAt !== null ||
        (quote.proposalFile.expiresAt && new Date(quote.proposalFile.expiresAt) < new Date())
    );

    const hasProposal = (quote.proposalFile && !isFileExpired) || quote.proposalLink;

    // Determine proposal source for display
    const getProposalSource = () => {
        if (quote.proposalFile && !isFileExpired) return "PDF carregado";
        if (quote.proposalLink) return "Link externo";
        return null;
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <FileText className="h-4 w-4" />
                        Proposta
                    </CardTitle>
                    {/* P0-02: Status badge when proposal exists */}
                    {isFileExpired && (
                        <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Expirado
                        </Badge>
                    )}
                    {hasProposal && !isFileExpired && (
                        <Badge variant="success" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Disponível
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
                {/* P0-02: Primary action - Open proposal (if exists) - more prominent */}
                {hasProposal && (
                    <div className="space-y-2">
                        <Button
                            onClick={handleOpenProposal}
                            disabled={loadingUrl}
                            className="w-full gap-2"
                        >
                            <ExternalLink className="h-4 w-4" />
                            {loadingUrl ? "A abrir..." : "Abrir proposta"}
                        </Button>
                        {/* P0-02: Show source info */}
                        <p className="text-center text-xs text-[var(--color-muted-foreground)]">
                            {getProposalSource()}
                            {quote.proposalFile && ` · ${formatFileSize(quote.proposalFile.sizeBytes)}`}
                            {quote.proposalFile && ` · ${formatDistanceToNow(new Date(quote.proposalFile.createdAt), { addSuffix: true, locale: pt })}`}
                        </p>
                    </div>
                )}

                {/* Uploaded file info - simplified when proposal exists */}
                {quote.proposalFile && (
                    <div className="flex items-center justify-between rounded-md bg-[var(--color-muted)]/50 px-3 py-2">
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm">{quote.proposalFile.filename}</p>
                        </div>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleDelete}
                            disabled={deleting}
                            className="h-7 w-7 p-0 text-[var(--color-muted-foreground)] hover:text-red-500"
                            title="Remover"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                )}

                {/* External link info */}
                {quote.proposalLink && !quote.proposalFile && !showLinkEdit && (
                    <div className="flex items-center justify-between rounded-md bg-[var(--color-muted)]/50 px-3 py-2">
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                                {quote.proposalLink}
                            </p>
                        </div>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowLinkEdit(true)}
                            className="h-7 px-2 text-xs"
                        >
                            Editar
                        </Button>
                    </div>
                )}

                {/* P1-UPGRADE-PROMPTS: Storage quota exceeded notice */}
                {quote.ingestStatus === "rejected_quota_exceeded" && (
                    <UpgradePrompt
                        reason="storage_quota"
                        location="proposal_section"
                        variant="inline"
                        {...UPGRADE_PROMPTS.storage_quota}
                    />
                )}

                {/* P1-UPGRADE-PROMPTS: Expired file notice with retention upsell */}
                {isFileExpired && (
                    <div className="space-y-3">
                        <UpgradePrompt
                            reason="retention_expired"
                            location="proposal_section"
                            variant="inline"
                            {...UPGRADE_PROMPTS.retention_expired}
                        />
                        <Button
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="w-full gap-2"
                        >
                            <Upload className="h-4 w-4" />
                            {uploading ? "A carregar..." : "Carregar novo PDF"}
                        </Button>
                    </div>
                )}

                {/* No proposal - show add options */}
                {!hasProposal && !isFileExpired && !showLinkEdit && (
                    <div className="space-y-2">
                        <Button
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="w-full gap-2"
                        >
                            <Upload className="h-4 w-4" />
                            {uploading ? "A carregar..." : "Carregar PDF"}
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => setShowLinkEdit(true)}
                            className="w-full gap-2 text-[var(--color-muted-foreground)]"
                        >
                            <LinkIcon className="h-4 w-4" />
                            Adicionar link
                        </Button>
                    </div>
                )}

                {/* Link editor */}
                {showLinkEdit && (
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <Input
                                type="url"
                                placeholder="https://..."
                                value={linkValue}
                                onChange={(e) => setLinkValue(e.target.value)}
                                className="flex-1"
                            />
                            <Button
                                size="sm"
                                onClick={handleSaveLink}
                                disabled={savingLink}
                            >
                                <Save className="h-4 w-4" />
                            </Button>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setShowLinkEdit(false);
                                setLinkValue(quote.proposalLink || "");
                            }}
                            className="text-xs text-[var(--color-muted-foreground)] hover:underline"
                        >
                            Cancelar
                        </button>
                    </div>
                )}

                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handleUpload}
                    className="hidden"
                />

                {/* Replace file option (when file exists) */}
                {quote.proposalFile && (
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full text-center text-xs text-[var(--color-muted-foreground)] hover:underline"
                    >
                        {uploading ? "A carregar..." : "Substituir ficheiro"}
                    </button>
                )}

                {/* P0-03: Simplified BCC section */}
                {bccAddress && (
                    <div className="border-t border-[var(--color-border)] pt-4">
                        <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-[var(--color-muted-foreground)]">
                                    BCC para captura automática
                                </p>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCopyBcc}
                                className="h-7 shrink-0 gap-1.5 px-2"
                            >
                                {bccCopied ? (
                                    <>
                                        <Check className="h-3 w-3 text-green-500" />
                                        <span className="text-xs">Copiado</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-3 w-3" />
                                        <span className="text-xs">Copiar</span>
                                    </>
                                )}
                            </Button>
                        </div>
                        <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
                            Use no Outlook/Gmail ao enviar o orçamento
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
