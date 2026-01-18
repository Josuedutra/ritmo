"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, toast } from "@/components/ui";
import { Sparkles, Loader2 } from "lucide-react";

interface GenerateActionButtonProps {
    quoteId: string;
    className?: string;
}

export function GenerateActionButton({ quoteId, className }: GenerateActionButtonProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleGenerateAction = async (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent navigation to quote detail
        e.stopPropagation();

        setLoading(true);
        try {
            const response = await fetch(`/api/quotes/${quoteId}/generate-action`, {
                method: "POST",
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 400) {
                    toast.error("Tarefa já existe", data.error || "Já existe uma tarefa pendente para este orçamento");
                } else {
                    toast.error("Erro ao criar tarefa", data.error || "Tente novamente");
                }
                return;
            }

            const priorityLabel = data.priority === "HIGH" ? " (prioritária)" : "";
            const typeLabels: Record<string, string> = {
                follow_up: "Follow-up email",
                call: "Chamada",
                custom: "Obter contacto",
            };
            const typeLabel = typeLabels[data.taskType] || data.taskType;

            toast.success(
                "Tarefa criada!",
                `${typeLabel}${priorityLabel} adicionada às ações de hoje`
            );
            router.refresh();
        } catch (error) {
            console.error("Error generating action:", error);
            toast.error("Erro ao criar tarefa", "Verifique a sua conexão e tente novamente");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateAction}
            disabled={loading}
            className={`gap-1.5 border-orange-500/30 text-orange-600 hover:bg-orange-500/10 ${className || ""}`}
        >
            {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
                <Sparkles className="h-3.5 w-3.5" />
            )}
            {loading ? "A criar..." : "Gerar ação"}
        </Button>
    );
}
