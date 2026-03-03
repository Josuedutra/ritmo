"use client";

import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Organization } from "@prisma/client";
import { Copy, Lock, Zap } from "lucide-react";
import { useState } from "react";

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

  function onCopy(address: string) {
    navigator.clipboard.writeText(address);
    toast({
      description: "Endereço copiado para a área de transferência.",
    });
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
