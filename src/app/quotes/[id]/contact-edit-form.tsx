"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, X, Loader2 } from "lucide-react";
import { toast } from "@/components/ui";

interface Contact {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  taxId: string | null;
}

interface ContactEditFormProps {
  contact: Contact;
  onSave: () => void;
  onCancel: () => void;
}

export function ContactEditForm({ contact, onSave, onCancel }: ContactEditFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState({
    name: contact.name ?? "",
    phone: contact.phone ?? "",
    company: contact.company ?? "",
    taxId: contact.taxId ?? "",
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fields.name || null,
          phone: fields.phone || null,
          company: fields.company || null,
          taxId: fields.taxId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao guardar contacto");
      }

      toast({ title: "Contacto atualizado" });
      router.refresh();
      onSave();
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Erro ao guardar",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs text-[var(--color-muted-foreground)]">Nome</Label>
        <Input
          value={fields.name}
          onChange={(e) => setFields((f) => ({ ...f, name: e.target.value }))}
          placeholder="Nome do contacto"
          className="h-8 text-sm"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-[var(--color-muted-foreground)]">Email</Label>
        <Input value={contact.email ?? ""} readOnly disabled className="h-8 text-sm opacity-60" />
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-[var(--color-muted-foreground)]">Telefone</Label>
        <Input
          type="tel"
          value={fields.phone}
          onChange={(e) => setFields((f) => ({ ...f, phone: e.target.value }))}
          placeholder="+351 912 345 678"
          className="h-8 text-sm"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-[var(--color-muted-foreground)]">Empresa</Label>
        <Input
          value={fields.company}
          onChange={(e) => setFields((f) => ({ ...f, company: e.target.value }))}
          placeholder="Nome da empresa"
          className="h-8 text-sm"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-[var(--color-muted-foreground)]">NIF</Label>
        <Input
          value={fields.taxId}
          onChange={(e) => setFields((f) => ({ ...f, taxId: e.target.value }))}
          placeholder="123456789"
          className="h-8 text-sm"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={handleSave} disabled={saving} className="h-7 gap-1 text-xs">
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          Guardar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={saving}
          className="h-7 gap-1 text-xs"
        >
          <X className="h-3 w-3" />
          Cancelar
        </Button>
      </div>
    </div>
  );
}
