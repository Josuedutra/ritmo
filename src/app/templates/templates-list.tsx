"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    Button,
    Badge,
    Input,
    Label,
} from "@/components/ui";
import { Mail, Phone, Pencil, Save, X, Check } from "lucide-react";

interface Template {
    id: string;
    code: string;
    name: string;
    subject: string | null;
    body: string;
    isActive: boolean;
    updatedAt: string;
}

interface TemplatesListProps {
    templates: Template[];
}

// Template code to label mapping
const TEMPLATE_LABELS: Record<string, { label: string; description: string; type: "email" | "call" }> = {
    T2: { label: "D+1 Follow-up", description: "Primeiro email após envio do orçamento", type: "email" },
    T3: { label: "D+3 Follow-up", description: "Segundo email de acompanhamento", type: "email" },
    T5: { label: "D+14 Fecho", description: "Email de fecho suave", type: "email" },
    CALL_SCRIPT: { label: "Script D+7", description: "Script para chamada de follow-up", type: "call" },
};

// Available placeholders
const PLACEHOLDERS = [
    { name: "contact_name", description: "Nome do contacto" },
    { name: "contact_company", description: "Empresa do contacto" },
    { name: "quote_title", description: "Título do orçamento" },
    { name: "quote_reference", description: "Referência do orçamento" },
    { name: "quote_value", description: "Valor do orçamento" },
    { name: "user_name", description: "Nome do utilizador" },
];

export function TemplatesList({ templates }: TemplatesListProps) {
    const router = useRouter();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{
        name: string;
        subject: string;
        body: string;
    }>({ name: "", subject: "", body: "" });
    const [saving, setSaving] = useState(false);

    const handleEdit = (template: Template) => {
        setEditingId(template.id);
        setEditForm({
            name: template.name,
            subject: template.subject || "",
            body: template.body,
        });
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditForm({ name: "", subject: "", body: "" });
    };

    const handleSave = async (templateId: string) => {
        setSaving(true);
        try {
            const response = await fetch(`/api/templates/${templateId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editForm),
            });

            if (!response.ok) {
                throw new Error("Failed to save template");
            }

            setEditingId(null);
            router.refresh();
        } catch (error) {
            console.error("Error saving template:", error);
            alert("Erro ao guardar template");
        } finally {
            setSaving(false);
        }
    };

    const insertPlaceholder = (placeholder: string) => {
        const tag = `{{${placeholder}}}`;
        setEditForm((prev) => ({
            ...prev,
            body: prev.body + tag,
        }));
    };

    return (
        <div className="space-y-6">
            {/* Placeholders reference */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Placeholders disponíveis</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2">
                        {PLACEHOLDERS.map((p) => (
                            <Badge
                                key={p.name}
                                variant="outline"
                                className="cursor-help"
                                title={p.description}
                            >
                                {`{{${p.name}}}`}
                            </Badge>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Templates grid */}
            <div className="grid gap-4 md:grid-cols-2">
                {templates.map((template) => {
                    const info = TEMPLATE_LABELS[template.code];
                    const isEditing = editingId === template.id;
                    const Icon = info?.type === "call" ? Phone : Mail;

                    return (
                        <Card key={template.id} className={isEditing ? "ring-2 ring-[var(--color-primary)]" : ""}>
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`rounded-md p-2 ${
                                            info?.type === "call"
                                                ? "bg-green-500/10 text-green-500"
                                                : "bg-blue-500/10 text-blue-500"
                                        }`}>
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base">
                                                {isEditing ? (
                                                    <Input
                                                        value={editForm.name}
                                                        onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                                                        className="h-7 text-base font-semibold"
                                                    />
                                                ) : (
                                                    template.name
                                                )}
                                            </CardTitle>
                                            <p className="text-xs text-[var(--color-muted-foreground)]">
                                                {info?.description || template.code}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant={template.isActive ? "success" : "secondary"}>
                                        {template.code}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {isEditing ? (
                                    <>
                                        {info?.type === "email" && (
                                            <div className="space-y-1.5">
                                                <Label htmlFor={`subject-${template.id}`} className="text-xs">
                                                    Assunto
                                                </Label>
                                                <Input
                                                    id={`subject-${template.id}`}
                                                    value={editForm.subject}
                                                    onChange={(e) => setEditForm((prev) => ({ ...prev, subject: e.target.value }))}
                                                    placeholder="Assunto do email"
                                                />
                                            </div>
                                        )}
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor={`body-${template.id}`} className="text-xs">
                                                    {info?.type === "call" ? "Script" : "Corpo do email"}
                                                </Label>
                                                <div className="flex gap-1">
                                                    {PLACEHOLDERS.slice(0, 3).map((p) => (
                                                        <button
                                                            key={p.name}
                                                            type="button"
                                                            onClick={() => insertPlaceholder(p.name)}
                                                            className="rounded bg-[var(--color-muted)] px-1.5 py-0.5 text-[10px] hover:bg-[var(--color-accent)]"
                                                            title={`Inserir ${p.description}`}
                                                        >
                                                            +{p.name.split("_")[0]}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <textarea
                                                id={`body-${template.id}`}
                                                value={editForm.body}
                                                onChange={(e) => setEditForm((prev) => ({ ...prev, body: e.target.value }))}
                                                rows={10}
                                                className="w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                onClick={() => handleSave(template.id)}
                                                disabled={saving}
                                                className="gap-1.5"
                                            >
                                                {saving ? (
                                                    <>A guardar...</>
                                                ) : (
                                                    <>
                                                        <Save className="h-3.5 w-3.5" />
                                                        Guardar
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={handleCancel}
                                                className="gap-1.5"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                                Cancelar
                                            </Button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {template.subject && (
                                            <div className="rounded-md bg-[var(--color-muted)] p-2 text-sm">
                                                <span className="text-[var(--color-muted-foreground)]">Assunto: </span>
                                                {template.subject}
                                            </div>
                                        )}
                                        <div className="max-h-40 overflow-y-auto rounded-md border border-[var(--color-border)] p-3">
                                            <pre className="whitespace-pre-wrap font-sans text-sm text-[var(--color-muted-foreground)]">
                                                {template.body}
                                            </pre>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-[var(--color-muted-foreground)]">
                                                Atualizado: {new Date(template.updatedAt).toLocaleDateString("pt-PT")}
                                            </span>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleEdit(template)}
                                                className="gap-1.5"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                                Editar
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {templates.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <p className="text-[var(--color-muted-foreground)]">
                            Nenhum template encontrado. Execute o seed para criar os templates padrão.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
