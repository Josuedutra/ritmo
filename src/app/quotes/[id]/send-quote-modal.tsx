"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, toast } from "@/components/ui";
import { Loader2, X, Paperclip, Mail } from "lucide-react";

interface ProposalFile {
  filename: string;
}

interface SendQuoteModalProps {
  quoteId: string;
  contactEmail: string | null | undefined;
  quoteTitle: string;
  proposalFile: ProposalFile | null | undefined;
  onClose: () => void;
}

export function SendQuoteModal({
  quoteId,
  contactEmail,
  quoteTitle,
  proposalFile,
  onClose,
}: SendQuoteModalProps) {
  const router = useRouter();
  const [sending, setSending] = useState(false);

  const defaultSubject = `Orçamento — ${quoteTitle}`;
  const defaultBody = `Exmo(a) Sr(a),\n\nTenho o prazer de enviar em anexo o orçamento referente a ${quoteTitle}.\n\nFico ao dispor para qualquer esclarecimento.\n\nCom os melhores cumprimentos`;

  const [to, setTo] = useState(contactEmail || "");
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);

  const handleSend = async () => {
    if (!to) {
      toast.error("Email obrigatório", "Introduza o email do destinatário");
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`/api/quotes/${quoteId}/send-quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, body }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (
          data.error === "LIMIT_EXCEEDED" ||
          data.error === "PAYMENT_REQUIRED" ||
          data.error === "SUBSCRIPTION_CANCELLED"
        ) {
          toast.error("Limite atingido", data.message || "Atualize o seu plano para continuar");
        } else {
          toast.error("Erro ao enviar", data.message || "Tente novamente");
        }
        return;
      }

      const data = await response.json();
      const recipientName = to;
      toast.success(
        "Orçamento enviado!",
        `Enviado para ${recipientName}. Cadência iniciada: D+1, D+3, D+7, D+14`
      );
      onClose();
      router.refresh();
    } catch {
      toast.error("Erro ao enviar", "Verifique a sua conexão e tente novamente");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-[var(--color-background)] shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] p-4">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-[var(--color-primary)]" />
            <h3 className="font-semibold">Enviar orçamento</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 hover:bg-[var(--color-muted)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4 p-4">
          {/* To */}
          <div>
            <label className="mb-1 block text-sm font-medium">Para</label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="email@cliente.pt"
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="mb-1 block text-sm font-medium">Assunto</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
            />
          </div>

          {/* Body */}
          <div>
            <label className="mb-1 block text-sm font-medium">Mensagem</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              className="w-full resize-none rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
            />
          </div>

          {/* Attachment */}
          <div className="flex items-center gap-2 rounded-md bg-[var(--color-muted)]/50 px-3 py-2 text-sm">
            <Paperclip className="h-4 w-4 text-[var(--color-muted-foreground)]" />
            {proposalFile ? (
              <span className="text-[var(--color-foreground)]">{proposalFile.filename}</span>
            ) : (
              <span className="text-[var(--color-muted-foreground)] italic">
                Sem anexo — carregue um PDF na secção de proposta
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-[var(--color-border)] p-4">
          <Button variant="ghost" onClick={onClose} disabled={sending}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={sending} className="gap-1.5">
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />A enviar...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                Enviar agora
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
