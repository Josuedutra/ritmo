"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Label, Textarea, toast } from "@/components/ui";
import { Send, Save, Loader2, Info } from "lucide-react";

// Removed contacts prop - now using inline contact creation
export function QuoteForm() {
    const router = useRouter();
    const [loading, setLoading] = useState<"save" | "send" | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Form state - Patch A: simplified inline contact with separate fields
    const [title, setTitle] = useState("");
    const [reference, setReference] = useState("");
    const [clientName, setClientName] = useState(""); // Patch A: Cliente (nome) - OBRIGATÓRIO
    const [clientEmail, setClientEmail] = useState(""); // Patch A: Email (opcional) - separated
    const [clientPhone, setClientPhone] = useState(""); // Patch A: Telefone (opcional) - separated
    const [serviceType, setServiceType] = useState("");
    const [value, setValue] = useState("");
    const [proposalLink, setProposalLink] = useState("");
    const [proposalLinkError, setProposalLinkError] = useState<string | null>(null);
    const [notes, setNotes] = useState("");

    // Patch F: Track quote_new_opened event on mount
    useEffect(() => {
        fetch("/api/tracking/quote-new-opened", { method: "POST" }).catch(() => {});
    }, []);

    // Patch A: Check if contact info provided (for automation features)
    const hasContactInfo = !!clientEmail || !!clientPhone;

    // Validate proposal link
    const validateProposalLink = (link: string): boolean => {
        if (!link) return true; // Empty is valid
        try {
            const url = new URL(link);
            return url.protocol === "http:" || url.protocol === "https:";
        } catch {
            return false;
        }
    };

    const handleProposalLinkChange = (value: string) => {
        setProposalLink(value);
        if (value && !validateProposalLink(value)) {
            setProposalLinkError("Insira um URL válido (ex: https://drive.google.com/...)");
        } else {
            setProposalLinkError(null);
        }
    };

    const handleSubmit = async (action: "save" | "send") => {
        // Patch A: Validate client name (obrigatório)
        if (!clientName.trim()) {
            setError("O nome do cliente é obrigatório");
            toast.error("Erro", "O nome do cliente é obrigatório");
            return;
        }

        // Validate proposal link before submitting
        if (proposalLink && !validateProposalLink(proposalLink)) {
            setProposalLinkError("Insira um URL válido (ex: https://drive.google.com/...)");
            toast.error("Erro", "O link da proposta deve ser um URL válido");
            return;
        }

        // Patch F: Track mark_sent_clicked event
        if (action === "send") {
            fetch("/api/tracking/mark-sent-clicked", { method: "POST" }).catch(() => {});
        }

        setLoading(action);
        setError(null);

        try {
            let finalContactId: string | null = null;

            // Patch A: Create contact automatically (always, since name is required)
            // If email empty, always create new (no dedupe)
            const contactResponse = await fetch("/api/contacts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: clientName.trim(),
                    email: clientEmail.trim() || null,
                    phone: clientPhone.trim() || null,
                    company: null,
                }),
            });

            if (!contactResponse.ok) {
                const data = await contactResponse.json();
                throw new Error(data.error || data.message || "Erro ao criar contacto");
            }

            const newContact = await contactResponse.json();
            finalContactId = newContact.id;

            // Create quote
            const quoteResponse = await fetch("/api/quotes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title,
                    reference: reference || null,
                    contactId: finalContactId,
                    serviceType: serviceType || null,
                    value: value ? parseFloat(value) : null,
                    proposalLink: proposalLink || null,
                    notes: notes || null,
                }),
            });

            if (!quoteResponse.ok) {
                const data = await quoteResponse.json();
                throw new Error(data.error || data.message || "Erro ao criar orçamento");
            }

            const quote = await quoteResponse.json();

            // Mark as sent if requested
            if (action === "send") {
                const sendResponse = await fetch(`/api/quotes/${quote.id}/mark-sent`, {
                    method: "POST",
                });

                if (!sendResponse.ok) {
                    const data = await sendResponse.json();
                    if (data.error === "LIMIT_EXCEEDED") {
                        // Still navigate to quote page but show warning
                        router.push(`/quotes/${quote.id}?limit_warning=true`);
                        return;
                    }
                    throw new Error(data.error || data.message || "Erro ao marcar como enviado");
                }
            }

            toast.success(
                action === "send" ? "Orçamento enviado!" : "Orçamento guardado!",
                action === "send" ? "Cadência de follow-up iniciada" : "Pode continuar a editar"
            );
            router.push(`/quotes/${quote.id}`);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Erro ao guardar orçamento";
            setError(message);
            toast.error("Erro", message);
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Main form - single column, simplified */}
            <Card>
                <CardHeader>
                    <CardTitle>Detalhes do orçamento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {error && (
                        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">
                            {error}
                        </div>
                    )}

                    {/* Título - campo obrigatório */}
                    <div>
                        <Label htmlFor="title">Título do orçamento *</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ex: Proposta de consultoria Q1"
                            required
                            autoFocus
                        />
                    </div>

                    {/* Patch A: Contacto inline - nome obrigatório + email/telefone opcionais */}
                    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/30 p-4">
                        <div className="mb-3 flex items-center gap-2">
                            <span className="text-sm font-medium">Cliente</span>
                            <span className="text-xs text-[var(--color-muted-foreground)]">(guardado automaticamente)</span>
                        </div>
                        <div className="space-y-3">
                            {/* Nome do cliente - OBRIGATÓRIO */}
                            <div>
                                <Label htmlFor="clientName" className="text-xs">
                                    Nome do cliente <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="clientName"
                                    value={clientName}
                                    onChange={(e) => setClientName(e.target.value)}
                                    placeholder="Nome do cliente (obrigatório)"
                                    required
                                />
                            </div>
                            {/* Email e telefone - OPCIONAIS */}
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <Label htmlFor="clientEmail" className="text-xs">
                                        Email <span className="font-normal text-[var(--color-muted-foreground)]">(opcional)</span>
                                    </Label>
                                    <Input
                                        id="clientEmail"
                                        type="email"
                                        value={clientEmail}
                                        onChange={(e) => setClientEmail(e.target.value)}
                                        placeholder="joao@empresa.pt"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="clientPhone" className="text-xs">
                                        Telefone <span className="font-normal text-[var(--color-muted-foreground)]">(opcional)</span>
                                    </Label>
                                    <Input
                                        id="clientPhone"
                                        type="tel"
                                        value={clientPhone}
                                        onChange={(e) => setClientPhone(e.target.value)}
                                        placeholder="+351 912 345 678"
                                    />
                                </div>
                            </div>
                        </div>
                        {!hasContactInfo && clientName && (
                            <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
                                <Info className="h-3 w-3" />
                                Sem email/telefone = tarefas manuais (sem emails automáticos)
                            </div>
                        )}
                    </div>

                    {/* Campos secundários - colapsáveis visualmente */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="value">Valor (EUR)</Label>
                            <Input
                                id="value"
                                type="number"
                                step="0.01"
                                min="0"
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                placeholder="0"
                            />
                        </div>

                        <div>
                            <Label htmlFor="reference">Referência</Label>
                            <Input
                                id="reference"
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
                                placeholder="Ex: ORC-2024-001"
                            />
                        </div>
                    </div>

                    {/* Patch B: Link da proposta - claramente opcional */}
                    <div>
                        <Label htmlFor="proposalLink">
                            Link da proposta <span className="font-normal text-[var(--color-muted-foreground)]">(opcional)</span>
                        </Label>
                        <Input
                            id="proposalLink"
                            type="text"
                            value={proposalLink}
                            onChange={(e) => handleProposalLinkChange(e.target.value)}
                            placeholder="https://drive.google.com/..."
                            className={proposalLinkError ? "border-red-500" : ""}
                        />
                        {proposalLinkError ? (
                            <p className="mt-1 text-xs text-red-500">
                                {proposalLinkError}
                            </p>
                        ) : (
                            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                                Pode adicionar mais tarde · Google Drive, OneDrive ou Dropbox
                            </p>
                        )}
                    </div>

                    <div>
                        <Label htmlFor="notes">
                            Notas <span className="font-normal text-[var(--color-muted-foreground)]">(opcional)</span>
                        </Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ex: Prazo 30 dias / Aguarda validação técnica"
                            rows={2}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Actions - Patch D: CTAs renomeados com microcopy */}
            <Card>
                <CardContent className="space-y-3 pt-6">
                    {/* Patch D: CTA primário - "Guardar e iniciar follow-up" */}
                    <Button
                        onClick={() => handleSubmit("send")}
                        disabled={loading !== null || !clientName.trim()}
                        className="w-full gap-1.5"
                        size="lg"
                    >
                        {loading === "send" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                        {loading === "send" ? "A criar..." : "Guardar e iniciar follow-up"}
                    </Button>
                    {/* Patch D: Microcopy explicativo */}
                    <p className="text-center text-xs text-[var(--color-muted-foreground)]">
                        Cria D+1/D+3/D+7/D+14 automaticamente. Só o primeiro envio conta.
                    </p>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-[var(--color-border)]" />
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="bg-[var(--color-card)] px-2 text-[var(--color-muted-foreground)]">ou</span>
                        </div>
                    </div>

                    {/* Patch D: CTA secundário discreto - "Guardar rascunho" */}
                    <Button
                        variant="ghost"
                        onClick={() => handleSubmit("save")}
                        disabled={loading !== null || !clientName.trim()}
                        className="w-full gap-1.5"
                    >
                        {loading === "save" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        {loading === "save" ? "A guardar..." : "Guardar rascunho"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
