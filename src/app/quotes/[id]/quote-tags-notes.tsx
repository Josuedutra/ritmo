"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Textarea, toast } from "@/components/ui";
import { Tag, Plus, X, Send, Clock, User, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

// P1-03: Predefined quick tags
const QUICK_TAGS = [
    { id: "urgente", label: "Urgente", color: "text-red-600 border-red-300 bg-red-500/10" },
    { id: "obra", label: "Obra", color: "text-[var(--color-info-foreground)] border-[var(--color-info)]/30 bg-[var(--color-info-muted)]" },
    { id: "manutencao", label: "Manutenção", color: "text-green-600 border-green-300 bg-green-500/10" },
    { id: "it", label: "IT", color: "text-purple-600 border-purple-300 bg-purple-500/10" },
    { id: "residencial", label: "Residencial", color: "text-amber-600 border-amber-300 bg-amber-500/10" },
    { id: "comercial", label: "Comercial", color: "text-cyan-600 border-cyan-300 bg-cyan-500/10" },
];

interface QuoteNote {
    id: string;
    content: string;
    createdAt: string;
    author: { id: string; name: string | null } | null;
}

interface QuoteTagsNotesProps {
    quoteId: string;
    tags: string[];
    notes: QuoteNote[];
    legacyNotes?: string | null;
}

export function QuoteTagsNotes({ quoteId, tags, notes, legacyNotes }: QuoteTagsNotesProps) {
    const router = useRouter();
    const [newNote, setNewNote] = useState("");
    const [submittingNote, setSubmittingNote] = useState(false);
    const [updatingTags, setUpdatingTags] = useState(false);
    const [showNoteInput, setShowNoteInput] = useState(false);

    const handleToggleTag = useCallback(async (tagId: string) => {
        setUpdatingTags(true);
        try {
            const newTags = tags.includes(tagId)
                ? tags.filter((t) => t !== tagId)
                : [...tags, tagId];

            const response = await fetch(`/api/quotes/${quoteId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tags: newTags }),
            });

            if (!response.ok) {
                throw new Error("Failed to update tags");
            }

            router.refresh();
        } catch (error) {
            console.error("Error updating tags:", error);
            toast.error("Erro ao atualizar", "Não foi possível atualizar as tags");
        } finally {
            setUpdatingTags(false);
        }
    }, [quoteId, tags, router]);

    const handleAddNote = useCallback(async () => {
        if (!newNote.trim()) return;

        setSubmittingNote(true);
        try {
            const response = await fetch(`/api/quotes/${quoteId}/notes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: newNote.trim() }),
            });

            if (!response.ok) {
                throw new Error("Failed to add note");
            }

            setNewNote("");
            setShowNoteInput(false);
            toast.success("Nota adicionada!");
            router.refresh();
        } catch (error) {
            console.error("Error adding note:", error);
            toast.error("Erro ao adicionar", "Não foi possível adicionar a nota");
        } finally {
            setSubmittingNote(false);
        }
    }, [quoteId, newNote, router]);

    const getTagConfig = (tagId: string) => {
        return QUICK_TAGS.find((t) => t.id === tagId) || {
            id: tagId,
            label: tagId,
            color: "text-gray-600 border-gray-300 bg-gray-500/10",
        };
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Tag className="h-4 w-4" />
                    Tags e Notas
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
                {/* Quick tags section */}
                <div>
                    <p className="mb-2 text-xs font-medium text-[var(--color-muted-foreground)]">Tags rápidas</p>
                    <div className="flex flex-wrap gap-2">
                        {QUICK_TAGS.map((tag) => {
                            const isActive = tags.includes(tag.id);
                            return (
                                <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => handleToggleTag(tag.id)}
                                    disabled={updatingTags}
                                    className={`inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs font-medium transition-all disabled:opacity-50 ${
                                        isActive
                                            ? tag.color
                                            : "border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:border-[var(--color-border-hover)]"
                                    }`}
                                >
                                    {isActive && <X className="h-3 w-3" />}
                                    {tag.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Legacy notes (if exists) */}
                {legacyNotes && (
                    <div className="rounded-md bg-[var(--color-muted)]/50 p-3">
                        <p className="mb-1 text-xs font-medium text-[var(--color-muted-foreground)]">Notas (original)</p>
                        <p className="whitespace-pre-wrap text-sm">{legacyNotes}</p>
                    </div>
                )}

                {/* Timestamped notes section */}
                <div>
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-medium text-[var(--color-muted-foreground)]">Notas internas</p>
                        {!showNoteInput && (
                            <button
                                type="button"
                                onClick={() => setShowNoteInput(true)}
                                className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline"
                            >
                                <Plus className="h-3 w-3" />
                                Adicionar nota
                            </button>
                        )}
                    </div>

                    {/* Add note form */}
                    {showNoteInput && (
                        <div className="mb-3 space-y-2">
                            <Textarea
                                placeholder="Escreva uma nota..."
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                rows={2}
                                className="text-sm"
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    onClick={handleAddNote}
                                    disabled={!newNote.trim() || submittingNote}
                                    className="gap-1.5"
                                >
                                    {submittingNote ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Send className="h-3.5 w-3.5" />
                                    )}
                                    Guardar
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setShowNoteInput(false);
                                        setNewNote("");
                                    }}
                                    disabled={submittingNote}
                                >
                                    Cancelar
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Notes list */}
                    {notes.length > 0 ? (
                        <div className="space-y-3">
                            {notes.map((note) => (
                                <div key={note.id} className="rounded-md border border-[var(--color-border)] p-3">
                                    <p className="whitespace-pre-wrap text-sm">{note.content}</p>
                                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--color-muted-foreground)]">
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true, locale: pt })}
                                        </span>
                                        {note.author?.name && (
                                            <span className="flex items-center gap-1">
                                                <User className="h-3 w-3" />
                                                {note.author.name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        !showNoteInput && (
                            <p className="text-sm text-[var(--color-muted-foreground)]">
                                Nenhuma nota registada
                            </p>
                        )
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
