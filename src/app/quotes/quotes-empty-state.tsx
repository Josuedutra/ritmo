"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, Button, toast } from "@/components/ui";
import { FileText, Plus, Sparkles, Loader2, Mail, PenLine } from "lucide-react";

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
          title: "Comece por adicionar o seu primeiro orçamento",
          description: null, // Custom layout for zero-quotes state
        };
    }
  };

  const { title, description } = getContent();

  // Enhanced empty state for zero quotes (filter "all")
  if (filter === "all") {
    return (
      <Card className="flex flex-col items-center justify-center p-12 text-center">
        <FileText className="mb-4 h-12 w-12 text-[var(--color-muted-foreground)]" />
        <h3 className="mb-2 text-lg font-medium">{title}</h3>
        <p className="mb-6 max-w-md text-sm text-[var(--color-muted-foreground)]">
          O Ritmo acompanha os seus orçamentos e gera follow-ups automáticos para que nenhuma
          proposta fique esquecida.
        </p>

        {/* How it works — two methods */}
        <div className="mb-8 grid w-full max-w-lg gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-[var(--color-border)] p-4 text-left">
            <Mail className="mb-2 h-5 w-5 text-[var(--color-primary)]" />
            <p className="mb-1 text-sm font-medium">Via BCC</p>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Adicione o Ritmo em BCC ao enviar o orçamento por e-mail. Nós fazemos o resto.
            </p>
          </div>
          <div className="rounded-lg border border-[var(--color-border)] p-4 text-left">
            <PenLine className="mb-2 h-5 w-5 text-[var(--color-primary)]" />
            <p className="mb-1 text-sm font-medium">Entrada manual</p>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Registe o orçamento manualmente e marque como enviado para ativar os follow-ups.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <Link href="/quotes/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Criar primeiro orçamento
            </Button>
          </Link>
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
            {creatingExample ? "A criar..." : "Ou experimentar com um exemplo"}
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col items-center justify-center p-12 text-center">
      <FileText className="mb-4 h-12 w-12 text-[var(--color-muted-foreground)]" />
      <h3 className="mb-2 text-lg font-medium">{title}</h3>
      <p className="mb-2 text-sm text-[var(--color-muted-foreground)]">{description}</p>

      {filter !== "no_response" && (
        <Link href="/quotes" className="mt-4 text-sm text-[var(--color-primary)] hover:underline">
          Ver todos os orçamentos
        </Link>
      )}
    </Card>
  );
}
