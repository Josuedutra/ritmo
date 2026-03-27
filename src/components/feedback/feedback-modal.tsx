"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Button, Label, Textarea, toast } from "@/components/ui";
import { MessageSquare, Bug, Lightbulb, HelpCircle, X, Send, Loader2 } from "lucide-react";
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

// Pages where feedback button should appear (authenticated app pages)
const SHOW_FEEDBACK_PATHS = ["/dashboard", "/quotes", "/settings", "/templates", "/onboarding"];

// NPS: 0-10 scale descriptions
const NPS_SCALE_LABELS: Record<string, string> = {
  "0": "0",
  "1": "1",
  "2": "2",
  "3": "3",
  "4": "4",
  "5": "5",
  "6": "6",
  "7": "7",
  "8": "8",
  "9": "9",
  "10": "10",
};

function getNpsSegment(score: number): "detractor" | "passive" | "promoter" {
  if (score <= 6) return "detractor";
  if (score <= 8) return "passive";
  return "promoter";
}

const NPS_FOLLOWUP_PLACEHOLDER: Record<string, string> = {
  detractor: "O que podemos melhorar para lhe oferecer uma melhor experiência?",
  passive: "O que falta para recomendar o Ritmo com confiança?",
  promoter: "O que mais aprecia no Ritmo?",
};

// ─── NPS Widget Props ─────────────────────────────────────────────────────────

interface NpsWidgetProps {
  open: boolean;
  onClose: () => void;
  triggerContext?: string; // e.g. "proposal_sent" | "quote_created_5"
}

export function NpsWidget({ open, onClose, triggerContext }: NpsWidgetProps) {
  const pathname = usePathname();
  const [step, setStep] = useState<"score" | "followup" | "done">("score");
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleScoreSelect = async (selectedScore: number) => {
    setScore(selectedScore);

    // Submit score immediately
    setSubmitting(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "nps",
          message: "",
          page: pathname,
          npsScore: selectedScore,
        }),
      });
    } catch {
      // Non-critical — continue to follow-up step
    } finally {
      setSubmitting(false);
    }

    setStep("followup");
  };

  const handleFollowupSubmit = async () => {
    if (!comment.trim() || score === null) {
      setStep("done");
      onClose();
      return;
    }

    setSubmitting(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "nps",
          message: comment.trim(),
          page: pathname,
          npsScore: score,
        }),
      });
    } catch {
      // Non-critical
    } finally {
      setSubmitting(false);
    }

    setStep("done");
    toast.success("Obrigado!", "O seu feedback foi registado.");
    onClose();
  };

  const handleSkip = () => {
    setStep("done");
    onClose();
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
      // Reset after animation
      setTimeout(() => {
        setStep("score");
        setScore(null);
        setComment("");
      }, 200);
    }
  };

  const segment = score !== null ? getNpsSegment(score) : null;

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] fixed top-[50%] left-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-6 shadow-xl">
          <Dialog.Close asChild>
            <button
              className="ring-offset-background focus:ring-ring absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-none"
              onClick={handleSkip}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Fechar</span>
            </button>
          </Dialog.Close>

          {step === "score" && (
            <div>
              <Dialog.Title className="text-lg font-semibold">
                Qual a probabilidade de recomendar o Ritmo?
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                Numa escala de 0 a 10, sendo 10 &quot;muito provável&quot;.
              </Dialog.Description>

              <div className="mt-6">
                <div className="grid grid-cols-11 gap-1">
                  {Array.from({ length: 11 }, (_, i) => i).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => handleScoreSelect(n)}
                      disabled={submitting}
                      className={`flex h-9 w-full items-center justify-center rounded border text-sm font-medium transition-colors disabled:opacity-50 ${
                        n <= 6
                          ? "border-orange-200 hover:bg-orange-100 hover:text-orange-800"
                          : n <= 8
                            ? "border-yellow-200 hover:bg-yellow-100 hover:text-yellow-800"
                            : "border-green-200 hover:bg-green-100 hover:text-green-800"
                      }`}
                    >
                      {NPS_SCALE_LABELS[String(n)]}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-xs text-[var(--color-muted-foreground)]">
                  <span>Nada provável</span>
                  <span>Muito provável</span>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button variant="outline" size="sm" onClick={handleSkip}>
                  Agora não
                </Button>
              </div>
            </div>
          )}

          {step === "followup" && segment && (
            <div>
              <Dialog.Title className="text-lg font-semibold">
                {segment === "promoter"
                  ? "Que bom! Obrigado pelo apoio."
                  : "Obrigado pela sua resposta."}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                Partilhe mais detalhes, se quiser. É opcional.
              </Dialog.Description>

              <div className="mt-4">
                <Label htmlFor="nps-comment" className="sr-only text-sm font-medium">
                  Comentário
                </Label>
                <Textarea
                  id="nps-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={NPS_FOLLOWUP_PLACEHOLDER[segment]}
                  className="min-h-[100px]"
                />
              </div>

              <div className="mt-4 flex gap-3">
                <Button variant="outline" onClick={handleSkip} className="flex-1">
                  Saltar
                </Button>
                <Button
                  onClick={handleFollowupSubmit}
                  disabled={submitting}
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
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── FeedbackModal (existing general feedback) ────────────────────────────────

export function FeedbackModal() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Only show on authenticated app pages
  const shouldShow = SHOW_FEEDBACK_PATHS.some((path) => pathname?.startsWith(path));
  if (!shouldShow) return null;

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
          className="fixed right-4 bottom-4 z-50 gap-1.5 shadow-lg"
        >
          <MessageSquare className="h-4 w-4" />
          Feedback
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] fixed top-[50%] left-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold">Enviar feedback</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Ajude-nos a melhorar o Ritmo com as suas sugestões.
          </Dialog.Description>

          <Dialog.Close asChild>
            <button
              className="ring-offset-background focus:ring-ring absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-none"
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
                      <span className="text-xs font-medium">{feedbackType.label}</span>
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
              <Button variant="outline" onClick={handleClose} className="flex-1">
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
