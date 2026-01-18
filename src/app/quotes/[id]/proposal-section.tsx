"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Label } from "@/components/ui";
import { FileText, Upload, ExternalLink, Trash2, Link as LinkIcon, Save, Copy, Check, Mail } from "lucide-react";

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
    } | null;
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

    // Generate BCC address for this quote
    const bccAddress = quote.orgShortId
        ? `bcc+${quote.orgShortId}+${quote.publicId}@${INBOUND_DOMAIN}`
        : null;

    const handleCopyBcc = async () => {
        if (!bccAddress) return;

        try {
            await navigator.clipboard.writeText(bccAddress);
            setBccCopied(true);
            setTimeout(() => setBccCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy BCC:", err);
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

    const hasProposal = quote.proposalFile || quote.proposalLink;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4" />
                    Proposta
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Uploaded file */}
                {quote.proposalFile && (
                    <div className="flex items-center justify-between rounded-md border border-[var(--color-border)] p-3">
                        <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-sm">{quote.proposalFile.filename}</p>
                            <p className="text-xs text-[var(--color-muted-foreground)]">
                                {formatFileSize(quote.proposalFile.sizeBytes)} •{" "}
                                {new Date(quote.proposalFile.createdAt).toLocaleDateString("pt-PT")}
                            </p>
                        </div>
                        <div className="flex gap-1">
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleOpenProposal}
                                disabled={loadingUrl}
                                className="h-8 w-8 p-0"
                                title="Abrir proposta"
                            >
                                <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleDelete}
                                disabled={deleting}
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                                title="Remover"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* External link */}
                {quote.proposalLink && !quote.proposalFile && !showLinkEdit && (
                    <div className="flex items-center justify-between rounded-md border border-[var(--color-border)] p-3">
                        <div className="min-w-0 flex-1">
                            <p className="flex items-center gap-1 text-sm font-medium">
                                <LinkIcon className="h-3.5 w-3.5" />
                                Link externo
                            </p>
                            <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                                {quote.proposalLink}
                            </p>
                        </div>
                        <div className="flex gap-1">
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleOpenProposal}
                                className="h-8 w-8 p-0"
                                title="Abrir proposta"
                            >
                                <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setShowLinkEdit(true)}
                                className="h-8 w-8 p-0"
                                title="Editar"
                            >
                                <LinkIcon className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* Link editor */}
                {(showLinkEdit || (!hasProposal && !quote.proposalFile)) && (
                    <div className="space-y-2">
                        <Label htmlFor="proposal-link" className="text-xs">
                            Link da proposta
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                id="proposal-link"
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
                    </div>
                )}

                {/* BCC Capture Address */}
                {bccAddress && (
                    <div className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/30 p-3">
                        <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                                <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-muted-foreground)]">
                                    <Mail className="h-3.5 w-3.5" />
                                    BCC para capturar proposta
                                </p>
                                <p className="mt-1 truncate text-xs font-mono select-all">{bccAddress}</p>
                            </div>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCopyBcc}
                                className="h-8 shrink-0 gap-1 px-2"
                                title="Cole em BCC ao enviar pelo Outlook/Gmail"
                            >
                                {bccCopied ? (
                                    <>
                                        <Check className="h-3.5 w-3.5 text-green-500" />
                                        <span className="text-xs text-green-500">Copiado</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-3.5 w-3.5" />
                                        <span className="text-xs">Copiar BCC</span>
                                    </>
                                )}
                            </Button>
                        </div>
                        <div className="mt-2 space-y-1">
                            <p className="text-xs text-[var(--color-muted-foreground)]">
                                <strong>Como usar:</strong> Cole este endereço no campo BCC do seu email (Outlook, Gmail, etc.) ao enviar a proposta.
                            </p>
                            <p className="text-xs text-[var(--color-muted-foreground)]">
                                O PDF anexo será automaticamente associado a este orçamento.
                            </p>
                        </div>
                    </div>
                )}

                {/* Upload button */}
                <div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf"
                        onChange={handleUpload}
                        className="hidden"
                    />
                    <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full gap-1.5"
                    >
                        <Upload className="h-4 w-4" />
                        {uploading
                            ? "A carregar..."
                            : quote.proposalFile
                                ? "Substituir ficheiro"
                                : "Carregar PDF"}
                    </Button>
                    <p className="mt-1 text-center text-xs text-[var(--color-muted-foreground)]">
                        Máx. 10MB • Apenas PDF
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
