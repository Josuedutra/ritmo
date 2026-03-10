"use client";

import { useState, useEffect } from "react";
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
  toast,
} from "@/components/ui";
import {
  Mail,
  Phone,
  Pencil,
  Save,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
} from "lucide-react";

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
const TEMPLATE_LABELS: Record<
  string,
  { label: string; description: string; type: "email" | "call" }
> = {
  T2: {
    label: "D+1 Follow-up",
    description: "Primeiro email após envio do orçamento",
    type: "email",
  },
  T3: { label: "D+3 Follow-up", description: "Segundo email de acompanhamento", type: "email" },
  T5: { label: "D+14 Fecho", description: "Email de fecho suave", type: "email" },
  CALL_SCRIPT: {
    label: "Script D+7",
    description: "Script para chamada de follow-up",
    type: "call",
  },
};

// Available placeholders
const PLACEHOLDERS = [
  { name: "contact_name", description: "Nome do contacto" },
  { name: "contact_company", description: "Empresa do contacto" },
  { name: "quote_title", description: "Título do orçamento" },
  { name: "quote_reference", description: "Referência do orçamento" },
  { name: "quote_value", description: "Valor do orçamento" },
  { name: "user_name", description: "Nome do utilizador" },
  { name: "assinatura", description: "Assinatura de email (posição manual)" },
];

export function TemplatesList({ templates }: TemplatesListProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    subject: string;
    body: string;
  }>({ name: "", subject: "", body: "" });
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [showSignaturePreview, setShowSignaturePreview] = useState(false);
  const [signatureHtml, setSignatureHtml] = useState<string | null>(null);
  const [signatureLoading, setSignatureLoading] = useState(false);

  const loadSignaturePreview = async () => {
    if (signatureHtml !== null) {
      setShowSignaturePreview((v) => !v);
      return;
    }
    setSignatureLoading(true);
    try {
      const [sigRes, logoRes] = await Promise.all([
        fetch("/api/settings/signature"),
        fetch("/api/settings/signature/logo"),
      ]);
      const sig = sigRes.ok ? await sigRes.json() : null;
      const logo = logoRes.ok ? await logoRes.json() : null;

      if (!sig?.signatureName) {
        setSignatureHtml("");
        setShowSignaturePreview(true);
        return;
      }

      const logoImg = logo?.url
        ? `<td style="padding-right:16px;vertical-align:top;"><img src="${logo.url}" alt="Logo" style="height:48px;width:auto;max-width:120px;" /></td>`
        : "";

      const html = `
<table style="border-top:1px solid #e5e7eb;padding-top:16px;margin-top:24px;font-family:Arial,sans-serif;font-size:13px;color:#6b7280;" cellpadding="0" cellspacing="0">
  <tr>
    ${logoImg}
    <td style="vertical-align:top;line-height:1.5;">
      <p style="margin:0;font-weight:600;color:#111827;font-size:14px;">${sig.signatureName}</p>
      ${sig.signatureTitle ? `<p style="margin:0;font-size:12px;color:#6b7280;">${sig.signatureTitle}</p>` : ""}
      ${sig.signaturePhone ? `<p style="margin:4px 0 0;font-size:12px;color:#6b7280;">${sig.signaturePhone}</p>` : ""}
      ${sig.signatureWebsite ? `<p style="margin:2px 0 0;font-size:12px;"><a href="${sig.signatureWebsite}" style="color:#3b82f6;text-decoration:none;">${sig.signatureWebsite.replace(/^https?:\/\//, "")}</a></p>` : ""}
    </td>
  </tr>
</table>`;
      setSignatureHtml(html);
      setShowSignaturePreview(true);
    } catch {
      setSignatureHtml("");
      setShowSignaturePreview(true);
    } finally {
      setSignatureLoading(false);
    }
  };

  const handleCopyPlaceholder = async (placeholder: string) => {
    const tag = `{{${placeholder}}}`;
    try {
      await navigator.clipboard.writeText(tag);
      toast.success(`Copiado: ${tag}`);
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  // Group templates
  const emailTemplates = templates.filter((t) => TEMPLATE_LABELS[t.code]?.type === "email");
  const callTemplates = templates.filter((t) => TEMPLATE_LABELS[t.code]?.type === "call");
  const otherTemplates = templates.filter((t) => !TEMPLATE_LABELS[t.code]);

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
        const data = await response.json();
        throw new Error(data.message || "Failed to save template");
      }

      toast.success("Template guardado!");
      setEditingId(null);
      router.refresh();
    } catch (error) {
      console.error("Error saving template:", error);
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Erro ao guardar", message);
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

  const renderTemplateCard = (template: Template) => {
    const info = TEMPLATE_LABELS[template.code];
    const isEditing = editingId === template.id;
    const isExpanded = expandedId === template.id;
    const Icon = info?.type === "call" ? Phone : Mail;
    const badgeLabel = info?.type === "call" ? "Chamada" : template.code;

    // Clamp body to ~3 lines (roughly 150 chars)
    const previewBody =
      template.body.length > 150 ? template.body.substring(0, 150) + "..." : template.body;
    const needsExpand = template.body.length > 150;

    return (
      <Card key={template.id} className={isEditing ? "ring-2 ring-[var(--color-primary)]" : ""}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div
                className={`rounded-md p-2 ${
                  info?.type === "call"
                    ? "bg-green-500/10 text-green-500"
                    : "bg-[var(--color-info-muted)] text-[var(--color-info)]"
                }`}
              >
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
            <Badge
              variant={
                info?.type === "call" ? "success" : template.isActive ? "default" : "secondary"
              }
            >
              {badgeLabel}
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
                  className="w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-ring)] focus:outline-none"
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
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />A guardar...
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      Guardar
                    </>
                  )}
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancel} className="gap-1.5">
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
              <div className="rounded-md border border-[var(--color-border)] p-3">
                <pre className="font-sans text-sm whitespace-pre-wrap text-[var(--color-muted-foreground)]">
                  {isExpanded ? template.body : previewBody}
                </pre>
                {needsExpand && (
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : template.id)}
                    className="mt-2 flex items-center gap-1 text-xs font-medium text-[var(--color-primary)] hover:underline"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-3 w-3" />
                        Ver menos
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3" />
                        Ver mais
                      </>
                    )}
                  </button>
                )}
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
  };

  return (
    <div className="space-y-6">
      {/* Placeholders reference */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Placeholders disponíveis</CardTitle>
          <p className="text-xs text-[var(--color-muted-foreground)]">Clique para copiar</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {PLACEHOLDERS.map((p) => (
              <button
                key={p.name}
                onClick={() => handleCopyPlaceholder(p.name)}
                className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2.5 py-1 text-xs font-medium transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-accent)]"
                title={p.description}
              >
                <Copy className="h-3 w-3 text-[var(--color-muted-foreground)]" />
                {`{{${p.name}}}`}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Email Templates Section */}
      {emailTemplates.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-medium text-[var(--color-muted-foreground)]">
              <Mail className="h-4 w-4" />
              Emails automáticos
            </h2>
            <button
              type="button"
              onClick={loadSignaturePreview}
              disabled={signatureLoading}
              className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-primary)] hover:underline disabled:opacity-50"
            >
              {signatureLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : showSignaturePreview ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
              Pré-visualização com assinatura
            </button>
          </div>

          {showSignaturePreview && (
            <Card className="border-dashed">
              <CardContent className="pt-4">
                <p className="mb-2 text-xs font-medium text-[var(--color-muted-foreground)]">
                  Prévia — assinatura adicionada automaticamente no final de cada email:
                </p>
                {signatureHtml ? (
                  <div
                    className="rounded bg-white p-3 dark:bg-[var(--color-card)]"
                    dangerouslySetInnerHTML={{ __html: signatureHtml }}
                  />
                ) : (
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    Nenhuma assinatura configurada.{" "}
                    <a
                      href="/settings?tab=signature"
                      className="text-[var(--color-primary)] underline"
                    >
                      Configurar assinatura →
                    </a>
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {emailTemplates.map((template) => renderTemplateCard(template))}
          </div>
        </div>
      )}

      {/* Call Templates Section */}
      {callTemplates.length > 0 && (
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-medium text-[var(--color-muted-foreground)]">
            <Phone className="h-4 w-4" />
            Chamadas
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {callTemplates.map((template) => renderTemplateCard(template))}
          </div>
        </div>
      )}

      {/* Other Templates */}
      {otherTemplates.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {otherTemplates.map((template) => renderTemplateCard(template))}
        </div>
      )}

      {templates.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-[var(--color-muted-foreground)]">Nenhum template encontrado.</p>
            <Button
              onClick={async () => {
                setSeeding(true);
                try {
                  const res = await fetch("/api/templates/seed-defaults", { method: "POST" });
                  if (!res.ok) throw new Error("Erro ao criar templates");
                  const data = await res.json();
                  toast.success(`${data.data.created} templates criados!`);
                  router.refresh();
                } catch {
                  toast.error("Erro ao criar templates padrão");
                } finally {
                  setSeeding(false);
                }
              }}
              disabled={seeding}
              className="gap-2"
            >
              {seeding ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />A criar...
                </>
              ) : (
                "Criar templates padrão"
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
