"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import {
    Button,
    Label,
    Textarea,
    toast,
} from "@/components/ui";
import {
    MessageSquare,
    Bug,
    Lightbulb,
    HelpCircle,
    X,
    Send,
    Loader2,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

type FeedbackType = "bug" | "feature" | "other";

const FEEDBACK_TYPES = [
    {
        id: "bug" as FeedbackType,
        label: "Bug",
        description: "Algo não funciona como esperado",
        icon: Bug,
    },
    {
        id: "feature" as FeedbackType,
        label: "Sugestão",
        description: "Nova funcionalidade ou melhoria",
        icon: Lightbulb,
    },
    {
        id: "other" as FeedbackType,
        label: "Outro",
        description: "Dúvida ou comentário geral",
        icon: HelpCircle,
    },
];

export function FeedbackModal() {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [type, setType] = useState<FeedbackType | null>(null);
    const [message, setMessage] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!type || !message.trim()) return;

        setSubmitting(true);
        try {
            const response = await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type,
                    message: message.trim(),
                    page: pathname,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                toast.error("Erro ao enviar", data.error || "Tente novamente");
                return;
            }

            toast.success("Feedback enviado!", "Obrigado por nos ajudar a melhorar.");
            setOpen(false);
            setType(null);
            setMessage("");
        } catch (error) {
            console.error("Error submitting feedback:", error);
            toast.error("Erro ao enviar", "Verifique a sua conexão e tente novamente");
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        setOpen(false);
        // Reset after animation
        setTimeout(() => {
            setType(null);
            setMessage("");
        }, 200);
    };

    return (
        <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="fixed bottom-4 right-4 z-50 gap-1.5 shadow-lg"
                >
                    <MessageSquare className="h-4 w-4" />
                    Feedback
                </Button>
            </Dialog.Trigger>

            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-6 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
                    <Dialog.Title className="text-lg font-semibold">
                        Enviar feedback
                    </Dialog.Title>
                    <Dialog.Description className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                        Ajude-nos a melhorar o Ritmo com as suas sugestões.
                    </Dialog.Description>

                    <Dialog.Close asChild>
                        <button
                            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            onClick={handleClose}
                        >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Fechar</span>
                        </button>
                    </Dialog.Close>

                    <div className="mt-6 space-y-4">
                        {/* Type selection */}
                        <div>
                            <Label className="text-sm font-medium">Tipo de feedback</Label>
                            <div className="mt-2 grid grid-cols-3 gap-2">
                                {FEEDBACK_TYPES.map((feedbackType) => {
                                    const Icon = feedbackType.icon;
                                    const isSelected = type === feedbackType.id;

                                    return (
                                        <button
                                            key={feedbackType.id}
                                            type="button"
                                            onClick={() => setType(feedbackType.id)}
                                            className={`flex flex-col items-center gap-2 rounded-lg border p-3 text-center transition-colors ${
                                                isSelected
                                                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                                                    : "border-[var(--color-border)] hover:bg-[var(--color-accent)]"
                                            }`}
                                        >
                                            <Icon
                                                className={`h-5 w-5 ${
                                                    isSelected
                                                        ? "text-[var(--color-primary)]"
                                                        : "text-[var(--color-muted-foreground)]"
                                                }`}
                                            />
                                            <span className="text-xs font-medium">
                                                {feedbackType.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Message */}
                        <div>
                            <Label htmlFor="feedback-message" className="text-sm font-medium">
                                Mensagem
                            </Label>
                            <Textarea
                                id="feedback-message"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder={
                                    type === "bug"
                                        ? "Descreva o problema que encontrou..."
                                        : type === "feature"
                                          ? "Descreva a sua sugestão..."
                                          : "Escreva a sua mensagem..."
                                }
                                className="mt-2 min-h-[120px]"
                            />
                            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                                Mínimo 10 caracteres
                            </p>
                        </div>

                        {/* Submit */}
                        <div className="flex gap-3 pt-2">
                            <Button
                                variant="outline"
                                onClick={handleClose}
                                className="flex-1"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={!type || message.trim().length < 10 || submitting}
                                className="flex-1 gap-1.5"
                            >
                                {submitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                                {submitting ? "A enviar..." : "Enviar"}
                            </Button>
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
