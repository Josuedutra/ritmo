"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui";
import { Sparkles, Phone, Euro, Loader2, CheckCircle2, FileText } from "lucide-react";

interface BccEnrichFormProps {
  quoteId: string;
  contactName: string | null;
  hasPhone: boolean;
  hasValue: boolean;
}

/**
 * Inline enrichment form shown at the top of the quote detail page when
 * a BCC-captured quote is missing phone or value.
 *
 * Once saved, the D+7 guião is generated immediately and shown inline.
 */
export function BccEnrichForm({ quoteId, contactName, hasPhone, hasValue }: BccEnrichFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [value, setValue] = useState("");

  // Nothing to fill — shouldn't be rendered, but guard anyway
  if (hasPhone && hasValue) return null;

  const handleSave = async () => {
    const phoneVal = !hasPhone ? phone.trim() : undefined;
    const valueNum = !hasValue ? parseFloat(value.replace(",", ".")) : undefined;

    if (!hasPhone && !phoneVal) {
      toast({ title: "Telefone obrigatório", variant: "error" });
      return;
    }
    if (!hasValue && (valueNum === undefined || isNaN(valueNum) || valueNum <= 0)) {
      toast({ title: "Valor deve ser um número positivo", variant: "error" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(phoneVal ? { phone: phoneVal } : {}),
          ...(valueNum !== undefined ? { value: valueNum } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao guardar");
      }

      const data = await res.json();
      setDone(true);
      if (data.script) {
        setGeneratedScript(data.script);
      }
      toast({ title: "Guião D+7 desbloqueado!", description: "Dados guardados com sucesso." });
      // Refresh server components (page re-renders with updated data)
      router.refresh();
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Tente novamente",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-500" />
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">D+7 pronto</p>
        </div>
        {generatedScript && (
          <div className="mt-3 rounded-md border border-emerald-500/20 bg-white/50 p-3 dark:bg-black/20">
            <div className="mb-2 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Guião D+7 gerado
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-[var(--color-foreground)]">
              {generatedScript}
            </p>
          </div>
        )}
      </div>
    );
  }

  const firstName = contactName?.split(" ")[0] ?? "Cliente";
  const valuePlaceholder = hasValue ? "—" : "[€ —]";

  return (
    <div className="mb-6 rounded-lg border border-orange-500/40 bg-orange-500/10 px-5 py-4 dark:border-orange-500/30 dark:bg-orange-500/15">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-orange-500" />
        <span className="text-sm font-semibold text-orange-600 dark:text-orange-300">
          Activar guião D+7
        </span>
        <Badge variant="warning" className="ml-auto h-5 px-2 text-xs">
          Incompleto
        </Badge>
      </div>

      {/* Preview */}
      <p className="border-border/50 bg-muted/50 dark:bg-muted/20 mb-4 rounded-md border border-dashed px-3 py-2 text-sm italic text-[var(--color-muted-foreground)]">
        &ldquo;Olá {firstName}, ligo sobre o orçamento de {valuePlaceholder}...&rdquo;
      </p>

      {/* Inline fields */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        {!hasPhone && (
          <div className="flex-1 space-y-1">
            <Label className="flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
              <Phone className="h-3 w-3" />
              Telefone
            </Label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+351 912 345 678"
              className="h-9 text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>
        )}
        {!hasValue && (
          <div className="flex-1 space-y-1">
            <Label className="flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
              <Euro className="h-3 w-3" />
              Valor do orçamento
            </Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Ex: 1500"
              className="h-9 text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>
        )}
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="h-9 gap-2 whitespace-nowrap sm:mb-0"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Guardar e gerar guião
        </Button>
      </div>
    </div>
  );
}
