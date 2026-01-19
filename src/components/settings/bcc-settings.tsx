"use client";

import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Organization } from "@prisma/client";
import { Copy, Lock } from "lucide-react";

interface BccSettingsProps {
    organization: Organization;
    isFree?: boolean;
}

export function BccSettings({ organization, isFree = false }: BccSettingsProps) {
    const { toast } = useToast();

    const bccAddress = organization.bccAddress || `bcc+${organization.id}@inbound.ritmo.app`; // fallback
    const isEnabled = !isFree && organization.bccInboundEnabled;

    function onCopy() {
        navigator.clipboard.writeText(bccAddress);
        toast({
            description: "Endereço copiado para a área de transferência.",
        });
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>BCC (Captura de proposta)</CardTitle>
                    {isEnabled ? (
                        <div className="flex items-center gap-2">
                            <Badge variant="default" className="bg-green-600">Ativo</Badge>
                            <Button variant="outline" size="sm" onClick={onCopy}>
                                <Copy className="w-4 h-4 mr-2" />
                                Copiar
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-muted-foreground">Bloqueado</Badge>
                            {isFree && <Button size="sm" variant="link">Fazer Upgrade</Button>}
                        </div>
                    )}
                </div>
                <CardDescription>
                    Receba propostas automaticamente enviando com BCC.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                <div className={`space-y-4 ${!isEnabled ? "opacity-50 pointer-events-none" : ""}`}>
                    <p className="text-sm">
                        Adicione este email em BCC ao enviar a proposta. O Ritmo associa automaticamente o PDF/link ao orçamento.
                    </p>
                    <div className="flex items-center gap-2">
                        <Input value={bccAddress} readOnly className="font-mono bg-muted" />
                    </div>
                </div>

                {isFree && (
                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-4 rounded-md border border-amber-200">
                        <Lock className="w-4 h-4" />
                        <span className="text-sm font-medium">Disponível em planos pagos/trial</span>
                    </div>
                )}

            </CardContent>
        </Card>
    );
}
