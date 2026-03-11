"use client";

import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Organization } from "@prisma/client";
import { Copy, Lock, X, Zap } from "lucide-react";
import { useState, KeyboardEvent } from "react";

interface BccSettingsProps {
  organization: Organization;
  isFree?: boolean;
}

export function BccSettings({ organization, isFree = false }: BccSettingsProps) {
  const { toast } = useToast();

  // Generic BCC address (auto-creates quote) — primary option
  const genericBccAddress = `all+${(organization as any).shortId || organization.id}@inbound.useritmo.pt`;
  // Legacy per-quote BCC address (still supported)
  const legacyBccAddress = organization.bccAddress || genericBccAddress;
  const isEnabled = !isFree && organization.bccInboundEnabled;

  const [showLegacy, setShowLegacy] = useState(false);

  // ── BCC Subject Filter state ───────────────────────────────────────────────
  const initialKeywords = (() => {
    const raw = (organization as any).bccSubjectKeywords;
    if (!raw) return [] as string[];
    try {
      return JSON.parse(raw) as string[];
    } catch {
      return [] as string[];
    }
  })();

  const [keywords, setKeywords] = useState<string[]>(initialKeywords);
  const [keywordInput, setKeywordInput] = useState("");
  const [savingKeywords, setSavingKeywords] = useState(false);
  // ────────────────────────────────────────────────────────────────────────────

  function onCopy(address: string) {
    navigator.clipboard.writeText(address);
    toast({
      description: "Endereço copiado para a área de transferência.",
    });
  }

  function addKeyword() {
    const trimmed = keywordInput.trim().toLowerCase();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords((prev) => [...prev, trimmed]);
    }
    setKeywordInput("");
  }

  function handleKeywordKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addKeyword();
    }
  }

  function removeKeyword(kw: string) {
    setKeywords((prev) => prev.filter((k) => k !== kw));
  }

  async function saveKeywords() {
    setSavingKeywords(true);
    try {
      const res = await fetch("/api/settings/organization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timezone: organization.timezone,
          sendWindowStart: parseInt(organization.sendWindowStart.split(":")[0]),
          sendWindowEnd: parseInt(organization.sendWindowEnd.split(":")[0]),
          bccSubjectKeywords: keywords,
        }),
      });
      if (!res.ok) throw new Error("Erro ao guardar");
      toast({ description: "Filtros de palavras-chave guardados." });
    } catch {
      toast({ description: "Erro ao guardar filtros. Tente novamente.", variant: "error" });
    } finally {
      setSavingKeywords(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>BCC (Captura automática)</CardTitle>
          {isEnabled ? (
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-green-600">
                Ativo
              </Badge>
              <Button variant="outline" size="sm" onClick={() => onCopy(genericBccAddress)}>
                <Copy className="mr-2 h-4 w-4" />
                Copiar
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-muted-foreground">
                Bloqueado
              </Badge>
              {isFree && (
                <Button size="sm" variant="link">
                  Fazer Upgrade
                </Button>
              )}
            </div>
          )}
        </div>
        <CardDescription>Crie orçamentos automaticamente enviando com BCC.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className={`space-y-4 ${!isEnabled ? "pointer-events-none opacity-50" : ""}`}>
          {/* Primary: Generic BCC address (auto-create) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Endereço BCC automático</span>
            </div>
            <p className="text-muted-foreground text-sm">
              Adicione este endereço no BCC dos seus emails de orçamento. O Ritmo cria
              automaticamente o orçamento e activa o follow-up — zero acção manual.
            </p>
            <div className="flex items-center gap-2">
              <Input value={genericBccAddress} readOnly className="bg-muted font-mono text-sm" />
            </div>
          </div>

          {/* BCC Subject Filter */}
          <div className="space-y-3 border-t pt-4">
            <div>
              <p className="text-sm font-medium">Filtro de assunto</p>
              <p className="text-muted-foreground text-sm">
                Só captura emails cujo assunto contenha pelo menos uma destas palavras. Vazio =
                captura tudo.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {keywords.map((kw) => (
                <span
                  key={kw}
                  className="bg-secondary text-secondary-foreground flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                >
                  {kw}
                  <button
                    type="button"
                    onClick={() => removeKeyword(kw)}
                    className="hover:text-destructive ml-0.5 rounded-full"
                    aria-label={`Remover ${kw}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={handleKeywordKeyDown}
                placeholder="Ex: orçamento, proposta, cotação"
                className="max-w-xs text-sm"
              />
              <Button type="button" variant="outline" size="sm" onClick={addKeyword}>
                Adicionar
              </Button>
            </div>
            <Button type="button" size="sm" onClick={saveKeywords} disabled={savingKeywords}>
              {savingKeywords ? "A guardar…" : "Guardar filtros"}
            </Button>
          </div>

          {/* Legacy: Per-quote BCC address (collapsible) */}
          <div className="border-t pt-2">
            <button
              onClick={() => setShowLegacy(!showLegacy)}
              className="text-muted-foreground hover:text-foreground text-xs transition-colors"
            >
              {showLegacy ? "▾ Esconder" : "▸ Endereço por orçamento"} (modo avançado)
            </button>
            {showLegacy && (
              <div className="mt-2 space-y-1">
                <p className="text-muted-foreground text-xs">
                  Se preferir, pode usar o endereço específico de cada orçamento para associar o
                  PDF/link a um orçamento existente.
                </p>
                <p className="text-muted-foreground font-mono text-xs">
                  Formato: all+[orgId]+[quoteId]@inbound.useritmo.pt
                </p>
              </div>
            )}
          </div>
        </div>

        {isFree && (
          <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-600">
            <Lock className="h-4 w-4" />
            <span className="text-sm font-medium">Disponível em planos pagos/trial</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
