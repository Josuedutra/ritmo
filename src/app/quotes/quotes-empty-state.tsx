"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, Button, toast } from "@/components/ui";
import { FileText, Plus, Sparkles, Loader2 } from "lucide-react";

interface QuotesEmptyStateProps {
    filter: string;
}

/**
 * Patch E: Empty state for quotes list
 * Shows different messages based on filter
 * Includes "Criar orçamento de exemplo" button for "all" filter
 */
export function QuotesEmptyState({ filter }: QuotesEmptyStateProps) {
    const router = useRouter();
    const [creatingExample, setCreatingExample] = useState(false);

    // P0 Fix: Create example quote as DRAFT - user must click CTA for Aha
    const handleCreateExample = useCallback(async () => {
        setCreatingExample(true);
        try {
            const response = await fetch("/api/quotes/example", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ source: "quotes_empty_state" }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Erro ao criar orçamento de exemplo");
            }

            if (data.quote?.id) {
                if (data.isExisting) {
                    toast.success("Orçamento de exemplo já existe", "A redirecionar...");
                } else {
                    toast.success("Orçamento de exemplo criado!", "Clique no botão para iniciar follow-up");
                }
                // P0 Fix: Add seed=1 query param to trigger CTA highlight
                router.push(`/quotes/${data.quote.id}?seed=1`);
            } else {
                router.refresh();
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Erro ao criar orçamento";
            toast.error("Erro", message);
        } finally {
            setCreatingExample(false);
        }
    }, [router]);

    // Get title and description based on filter
    const getContent = () => {
        switch (filter) {
            case "no_response":
                return {
                    title: "Sem orçamentos sem resposta",
                    description: "Nenhum orçamento sem resposta há mais de 24h. Bom sinal!",
                };
            case "draft":
                return {
                    title: "Sem rascunhos",
                    description: "Todos os orçamentos foram enviados.",
                };
            case "sent":
                return {
                    title: "Sem orçamentos enviados",
                    description: "Crie um orçamento e marque como enviado para começar.",
                };
            case "negotiation":
                return {
                    title: "Sem orçamentos em negociação",
                    description: "Altere o status de um orçamento para 'Em negociação'.",
                };
            case "won":
                return {
                    title: "Sem orçamentos ganhos",
                    description: "Quando fechar um negócio, marque como 'Ganho'.",
                };
            case "lost":
                return {
                    title: "Sem orçamentos perdidos",
                    description: "Quando perder um negócio, marque como 'Perdido'.",
                };
            default:
                return {
                    title: "Sem orçamentos",
                    description: "Crie 1 orçamento para começar.",
                };
        }
    };

    const { title, description } = getContent();

    return (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
            <FileText className="mb-4 h-12 w-12 text-[var(--color-muted-foreground)]" />
            <h3 className="mb-2 text-lg font-medium">{title}</h3>
            <p className="mb-2 text-sm text-[var(--color-muted-foreground)]">
                {description}
            </p>

            {/* Patch E: Show CTAs only for "all" filter */}
            {filter === "all" && (
                <>
                    <p className="mb-6 text-xs text-[var(--color-muted-foreground)]">
                        Crie → Marque como enviado → Ritmo gera D+1/D+3/D+7/D+14
                    </p>
                    <div className="flex flex-col items-center gap-3">
                        <Link href="/quotes/new">
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Criar orçamento
                            </Button>
                        </Link>
                        {/* Patch E: Link menor para criar exemplo */}
                        <button
                            type="button"
                            onClick={handleCreateExample}
                            disabled={creatingExample}
                            className="flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] disabled:opacity-50"
                        >
                            {creatingExample ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Sparkles className="h-3.5 w-3.5" />
                            )}
                            {creatingExample ? "A criar..." : "Criar orçamento de exemplo"}
                        </button>
                    </div>
                </>
            )}

            {filter !== "all" && filter !== "no_response" && (
                <Link href="/quotes" className="mt-4 text-sm text-[var(--color-primary)] hover:underline">
                    Ver todos os orçamentos
                </Link>
            )}
        </Card>
    );
}
