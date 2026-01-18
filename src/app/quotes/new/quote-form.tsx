"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Label, Textarea } from "@/components/ui";
import { Send, Save, Plus } from "lucide-react";

interface Contact {
    id: string;
    name: string | null;
    email: string | null;
    company: string | null;
}

interface QuoteFormProps {
    contacts: Contact[];
}

export function QuoteForm({ contacts }: QuoteFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState<"save" | "send" | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [title, setTitle] = useState("");
    const [reference, setReference] = useState("");
    const [contactId, setContactId] = useState("");
    const [newContactName, setNewContactName] = useState("");
    const [newContactEmail, setNewContactEmail] = useState("");
    const [newContactCompany, setNewContactCompany] = useState("");
    const [serviceType, setServiceType] = useState("");
    const [value, setValue] = useState("");
    const [proposalLink, setProposalLink] = useState("");
    const [notes, setNotes] = useState("");
    const [showNewContact, setShowNewContact] = useState(false);

    const handleSubmit = async (action: "save" | "send") => {
        setLoading(action);
        setError(null);

        try {
            let finalContactId = contactId || null;

            // Create new contact if needed
            if (showNewContact && newContactEmail) {
                const contactResponse = await fetch("/api/contacts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: newContactName || newContactEmail.split("@")[0],
                        email: newContactEmail,
                        company: newContactCompany || null,
                    }),
                });

                if (!contactResponse.ok) {
                    const data = await contactResponse.json();
                    throw new Error(data.error || data.message || "Erro ao criar contacto");
                }

                const newContact = await contactResponse.json();
                finalContactId = newContact.id;
            }

            // Create quote
            const quoteResponse = await fetch("/api/quotes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title,
                    reference: reference || null,
                    contactId: finalContactId || null,
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

            router.push(`/quotes/${quote.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erro ao guardar orçamento");
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="grid gap-6 lg:grid-cols-3">
            {/* Main form */}
            <div className="space-y-6 lg:col-span-2">
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

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <Label htmlFor="title">Título *</Label>
                                <Input
                                    id="title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Ex: Proposta de consultoria Q1"
                                    required
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

                            <div>
                                <Label htmlFor="serviceType">Tipo de serviço</Label>
                                <Input
                                    id="serviceType"
                                    value={serviceType}
                                    onChange={(e) => setServiceType(e.target.value)}
                                    placeholder="Ex: Consultoria"
                                />
                            </div>

                            <div>
                                <Label htmlFor="value">Valor (EUR)</Label>
                                <Input
                                    id="value"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={value}
                                    onChange={(e) => setValue(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>

                            <div>
                                <Label htmlFor="proposalLink">Link da proposta</Label>
                                <Input
                                    id="proposalLink"
                                    type="url"
                                    value={proposalLink}
                                    onChange={(e) => setProposalLink(e.target.value)}
                                    placeholder="https://..."
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="notes">Notas</Label>
                            <Textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Notas internas sobre o orçamento..."
                                rows={3}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Sidebar - Contact selection */}
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Contacto</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {!showNewContact ? (
                            <>
                                <div>
                                    <Label htmlFor="contact">Selecionar contacto</Label>
                                    <select
                                        id="contact"
                                        value={contactId}
                                        onChange={(e) => setContactId(e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-ring)]"
                                    >
                                        <option value="">Sem contacto</option>
                                        {contacts.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name || c.email}
                                                {c.company ? ` (${c.company})` : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowNewContact(true)}
                                    className="w-full gap-1.5"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Criar novo contacto
                                </Button>
                            </>
                        ) : (
                            <>
                                <div>
                                    <Label htmlFor="newContactName">Nome</Label>
                                    <Input
                                        id="newContactName"
                                        value={newContactName}
                                        onChange={(e) => setNewContactName(e.target.value)}
                                        placeholder="João Silva"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="newContactEmail">Email *</Label>
                                    <Input
                                        id="newContactEmail"
                                        type="email"
                                        value={newContactEmail}
                                        onChange={(e) => setNewContactEmail(e.target.value)}
                                        placeholder="joao@empresa.pt"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="newContactCompany">Empresa</Label>
                                    <Input
                                        id="newContactCompany"
                                        value={newContactCompany}
                                        onChange={(e) => setNewContactCompany(e.target.value)}
                                        placeholder="Empresa, Lda"
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setShowNewContact(false);
                                        setNewContactName("");
                                        setNewContactEmail("");
                                        setNewContactCompany("");
                                    }}
                                    className="w-full"
                                >
                                    Cancelar
                                </Button>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Actions */}
                <Card>
                    <CardContent className="space-y-2 pt-6">
                        <Button
                            onClick={() => handleSubmit("send")}
                            disabled={loading !== null || !title}
                            className="w-full gap-1.5"
                        >
                            <Send className="h-4 w-4" />
                            {loading === "send" ? "A criar..." : "Criar e marcar como enviado"}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => handleSubmit("save")}
                            disabled={loading !== null || !title}
                            className="w-full gap-1.5"
                        >
                            <Save className="h-4 w-4" />
                            {loading === "save" ? "A guardar..." : "Guardar rascunho"}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
