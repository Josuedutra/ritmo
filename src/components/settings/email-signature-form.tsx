"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Mail, ImagePlus, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Organization } from "@prisma/client";

interface EmailSignatureFormProps {
  organization: Organization;
}

interface SignatureData {
  signatureName: string;
  signatureTitle: string;
  signaturePhone: string;
  signatureWebsite: string;
  hasLogo: boolean;
}

export function EmailSignatureForm({ organization }: EmailSignatureFormProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<SignatureData>({
    signatureName: "",
    signatureTitle: "",
    signaturePhone: "",
    signatureWebsite: "",
    hasLogo: false,
  });

  useEffect(() => {
    async function loadSignature() {
      try {
        const res = await fetch("/api/settings/signature");
        if (res.ok) {
          const data = await res.json();
          setForm({
            signatureName: data.signatureName ?? "",
            signatureTitle: data.signatureTitle ?? "",
            signaturePhone: data.signaturePhone ?? "",
            signatureWebsite: data.signatureWebsite ?? "",
            hasLogo: data.hasLogo ?? false,
          });

          if (data.hasLogo) {
            const logoRes = await fetch("/api/settings/signature/logo");
            if (logoRes.ok) {
              const logoData = await logoRes.json();
              setLogoUrl(logoData.url ?? null);
            }
          }
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    loadSignature();
  }, []);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      toast({
        title: "Ficheiro demasiado grande",
        description: "O logo deve ter no máximo 500KB.",
        variant: "destructive",
      });
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let response: Response;

      if (logoFile) {
        const formData = new FormData();
        formData.append("signatureName", form.signatureName);
        formData.append("signatureTitle", form.signatureTitle);
        formData.append("signaturePhone", form.signaturePhone);
        formData.append("signatureWebsite", form.signatureWebsite);
        formData.append("logo", logoFile);

        response = await fetch("/api/settings/signature", {
          method: "PUT",
          body: formData,
        });
      } else {
        response = await fetch("/api/settings/signature", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao guardar");
      }

      // Refresh logo URL if new logo was uploaded
      if (logoFile) {
        setForm((prev) => ({ ...prev, hasLogo: true }));
        setLogoUrl(logoPreview);
        setLogoFile(null);
      }

      toast({ title: "Assinatura guardada!", description: "A assinatura foi atualizada." });
    } catch (error) {
      toast({
        title: "Erro ao guardar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const displayLogoUrl = logoPreview ?? logoUrl;
  const hasSignature = form.signatureName.trim().length > 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--color-muted-foreground)]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-[var(--color-info-muted)] p-2 text-[var(--color-info)]">
            <Mail className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">Assinatura de Email</CardTitle>
            <CardDescription className="text-xs">
              Adicionada automaticamente a todos os emails de follow-up (D+1, D+3, D+14)
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Upsell note */}
        <div className="flex items-start gap-2 rounded-md bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Emails com assinatura personalizada geram mais confiança e melhoram a taxa de resposta.
          </span>
        </div>

        {/* Form fields */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="sig-name" className="text-xs">
              Nome completo
            </Label>
            <Input
              id="sig-name"
              placeholder="Josué Dutra"
              value={form.signatureName}
              onChange={(e) => setForm((prev) => ({ ...prev, signatureName: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sig-title" className="text-xs">
              Cargo / Título
            </Label>
            <Input
              id="sig-title"
              placeholder="Gestor Comercial"
              value={form.signatureTitle}
              onChange={(e) => setForm((prev) => ({ ...prev, signatureTitle: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sig-phone" className="text-xs">
              Telefone
            </Label>
            <Input
              id="sig-phone"
              type="tel"
              placeholder="+351 912 345 678"
              value={form.signaturePhone}
              onChange={(e) => setForm((prev) => ({ ...prev, signaturePhone: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sig-website" className="text-xs">
              Website <span className="text-[var(--color-muted-foreground)]">(opcional)</span>
            </Label>
            <Input
              id="sig-website"
              type="url"
              placeholder="https://empresa.pt"
              value={form.signatureWebsite}
              onChange={(e) => setForm((prev) => ({ ...prev, signatureWebsite: e.target.value }))}
            />
          </div>
        </div>

        {/* Logo upload */}
        <div className="space-y-2">
          <Label className="text-xs">
            Logo <span className="text-[var(--color-muted-foreground)]">(PNG/JPG, máx. 500KB)</span>
          </Label>
          <div className="flex items-center gap-3">
            {displayLogoUrl ? (
              <img
                src={displayLogoUrl}
                alt="Logo da assinatura"
                className="h-10 w-auto max-w-[120px] rounded border border-[var(--color-border)] object-contain"
              />
            ) : (
              <div className="flex h-10 w-24 items-center justify-center rounded border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]">
                <ImagePlus className="h-4 w-4 text-[var(--color-muted-foreground)]" />
              </div>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="gap-1.5"
            >
              <ImagePlus className="h-3.5 w-3.5" />
              {displayLogoUrl ? "Alterar logo" : "Carregar logo"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={handleLogoChange}
            />
          </div>
        </div>

        {/* Preview toggle */}
        {hasSignature && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-primary)] hover:underline"
            >
              {showPreview ? (
                <>
                  <EyeOff className="h-3.5 w-3.5" />
                  Ocultar pré-visualização
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  Pré-visualizar assinatura
                </>
              )}
            </button>

            {showPreview && (
              <div className="rounded-md border border-[var(--color-border)] bg-white p-4 dark:bg-[var(--color-card)]">
                <p className="mb-3 text-xs text-[var(--color-muted-foreground)]">
                  Prévia do email — o seu conteúdo apareceria aqui acima.
                </p>
                <table
                  style={{
                    borderTop: "1px solid #e5e7eb",
                    paddingTop: "16px",
                    marginTop: "8px",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "13px",
                    color: "#6b7280",
                  }}
                >
                  <tbody>
                    <tr>
                      {displayLogoUrl && (
                        <td style={{ paddingRight: "16px", verticalAlign: "top" }}>
                          <img
                            src={displayLogoUrl}
                            alt="Logo"
                            style={{ height: "48px", width: "auto", maxWidth: "120px" }}
                          />
                        </td>
                      )}
                      <td style={{ verticalAlign: "top", lineHeight: "1.5" }}>
                        <p
                          style={{ margin: 0, fontWeight: 600, color: "#111827", fontSize: "14px" }}
                        >
                          {form.signatureName}
                        </p>
                        {form.signatureTitle && (
                          <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>
                            {form.signatureTitle}
                            {organization.name ? ` · ${organization.name}` : ""}
                          </p>
                        )}
                        {form.signaturePhone && (
                          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#6b7280" }}>
                            {form.signaturePhone}
                          </p>
                        )}
                        {form.signatureWebsite && (
                          <p style={{ margin: "2px 0 0", fontSize: "12px" }}>
                            <a
                              href={form.signatureWebsite}
                              style={{ color: "#3b82f6", textDecoration: "none" }}
                            >
                              {form.signatureWebsite.replace(/^https?:\/\//, "")}
                            </a>
                          </p>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />A guardar...
            </>
          ) : (
            "Guardar assinatura"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
