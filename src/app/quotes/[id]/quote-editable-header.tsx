"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui";
import {
  FileText,
  Building2,
  Calendar,
  Clock,
  Pencil,
  Check,
  X,
  ChevronDown,
  Search,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface Contact {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
}

interface QuoteEditableHeaderProps {
  quote: {
    id: string;
    title: string;
    reference: string | null;
    value: number | null;
    currency: string;
    serviceType: string | null;
    businessStatus: string;
    tags: string[];
    sentAt: string | null;
    contact: Contact | null;
  };
  statusConfig: {
    label: string;
    variant: "default" | "secondary" | "success" | "destructive" | "warning";
  };
  nextAction: { label: string; timing: string; variant: "default" | "warning" | "success" } | null;
}

// Generic inline-edit field hook
function useInlineEdit(initialValue: string) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState(false);

  const startEdit = () => {
    setValue(initialValue);
    setEditing(true);
  };

  const cancel = () => {
    setValue(initialValue);
    setEditing(false);
  };

  const showFlash = () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 1000);
  };

  return { editing, value, setValue, saving, setSaving, flash, startEdit, cancel, showFlash };
}

// Editable title field
function EditableTitle({
  quoteId,
  title,
  onSaved,
}: {
  quoteId: string;
  title: string;
  onSaved: () => void;
}) {
  const { editing, value, setValue, saving, setSaving, flash, startEdit, cancel, showFlash } =
    useInlineEdit(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const save = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === title) {
      cancel();
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!res.ok) throw new Error("Falha ao guardar");
      showFlash();
      onSaved();
    } catch {
      toast.error("Erro ao guardar título");
      cancel();
    } finally {
      setSaving(false);
    }
  }, [value, title, quoteId, cancel, setSaving, showFlash, onSaved]);

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          onBlur={save}
          disabled={saving}
          className="min-w-0 flex-1 rounded border border-[var(--color-primary)] bg-transparent px-2 py-0.5 text-xl font-semibold focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:outline-none"
        />
        {saving && (
          <Loader2 className="h-4 w-4 animate-spin text-[var(--color-muted-foreground)]" />
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      className={`group flex items-center gap-1.5 text-left transition-colors ${
        flash ? "text-green-600" : "hover:text-[var(--color-primary)]"
      }`}
    >
      <span className="text-xl font-semibold">{title}</span>
      <Pencil className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-60" />
    </button>
  );
}

// Editable value field
function EditableValue({
  quoteId,
  value,
  currency,
  onSaved,
}: {
  quoteId: string;
  value: number | null;
  currency: string;
  onSaved: () => void;
}) {
  const displayValue = value !== null ? String(value) : "";
  const {
    editing,
    value: inputVal,
    setValue,
    saving,
    setSaving,
    flash,
    startEdit,
    cancel,
    showFlash,
  } = useInlineEdit(displayValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const save = useCallback(async () => {
    const trimmed = inputVal.trim();
    const parsed = trimmed === "" ? null : parseFloat(trimmed.replace(",", "."));
    if (parsed === value && trimmed !== "") {
      cancel();
      return;
    }
    if (trimmed !== "" && isNaN(parsed!)) {
      toast.error("Valor inválido");
      cancel();
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: parsed }),
      });
      if (!res.ok) throw new Error("Falha ao guardar");
      showFlash();
      onSaved();
    } catch {
      toast.error("Erro ao guardar valor");
      cancel();
    } finally {
      setSaving(false);
    }
  }, [inputVal, value, quoteId, cancel, setSaving, showFlash, onSaved]);

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-2xl font-bold text-[var(--color-muted-foreground)]">€</span>
        <input
          ref={inputRef}
          type="number"
          min="0"
          step="0.01"
          value={inputVal}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          onBlur={save}
          disabled={saving}
          placeholder="0"
          className="w-32 rounded border border-[var(--color-primary)] bg-transparent px-2 py-0.5 text-2xl font-bold focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:outline-none"
        />
        {saving && (
          <Loader2 className="h-4 w-4 animate-spin text-[var(--color-muted-foreground)]" />
        )}
      </div>
    );
  }

  const formattedValue = value !== null ? `€${value.toLocaleString("pt-PT")}` : null;

  return (
    <button
      type="button"
      onClick={startEdit}
      className={`group flex items-center gap-1 text-right transition-colors ${
        flash ? "text-green-600" : "hover:text-[var(--color-primary)]"
      }`}
    >
      {formattedValue ? (
        <span className="text-2xl font-bold">{formattedValue}</span>
      ) : (
        <span className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)]">
          Adicionar valor
        </span>
      )}
      <Pencil className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
    </button>
  );
}

// Editable reference field
function EditableReference({
  quoteId,
  reference,
  onSaved,
}: {
  quoteId: string;
  reference: string | null;
  onSaved: () => void;
}) {
  const { editing, value, setValue, saving, setSaving, flash, startEdit, cancel, showFlash } =
    useInlineEdit(reference ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const save = useCallback(async () => {
    const trimmed = value.trim();
    const newVal = trimmed === "" ? null : trimmed;
    if (newVal === reference) {
      cancel();
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: newVal }),
      });
      if (!res.ok) throw new Error("Falha ao guardar");
      showFlash();
      onSaved();
    } catch {
      toast.error("Erro ao guardar referência");
      cancel();
    } finally {
      setSaving(false);
    }
  }, [value, reference, quoteId, cancel, setSaving, showFlash, onSaved]);

  if (editing) {
    return (
      <span className="flex items-center gap-1">
        <FileText className="h-3.5 w-3.5 flex-shrink-0 text-[var(--color-muted-foreground)]" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          onBlur={save}
          disabled={saving}
          placeholder="Referência..."
          className="w-32 rounded border border-[var(--color-primary)] bg-transparent px-1.5 py-0.5 text-sm focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:outline-none"
        />
        {saving && (
          <Loader2 className="h-3 w-3 animate-spin text-[var(--color-muted-foreground)]" />
        )}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      className={`group flex items-center gap-1 text-sm transition-colors ${
        flash
          ? "text-green-600"
          : reference
            ? "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            : "text-[var(--color-muted-foreground)]/60 hover:text-[var(--color-primary)]"
      }`}
    >
      <FileText className="h-3.5 w-3.5" />
      <span>{reference ?? "Adicionar referência"}</span>
      <Pencil className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
    </button>
  );
}

// Editable contact field with search dropdown
function EditableContact({
  quoteId,
  contact,
  onSaved,
}: {
  quoteId: string;
  contact: Contact | null;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    // Load contacts when dropdown opens
    setLoading(true);
    fetch("/api/contacts")
      .then((r) => r.json())
      .then((data) => {
        setContacts(Array.isArray(data) ? data : (data.contacts ?? []));
      })
      .catch(() => {
        toast.error("Erro ao carregar contactos");
      })
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (open && searchRef.current) {
      searchRef.current.focus();
    }
  }, [open]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q)
    );
  });

  const handleSelect = useCallback(
    async (selectedContact: Contact) => {
      setOpen(false);
      setSearch("");
      if (selectedContact.id === contact?.id) return;
      setSaving(true);
      try {
        const res = await fetch(`/api/quotes/${quoteId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contactId: selectedContact.id }),
        });
        if (!res.ok) throw new Error("Falha ao guardar");
        toast.success("Contacto actualizado");
        onSaved();
      } catch {
        toast.error("Erro ao actualizar contacto");
      } finally {
        setSaving(false);
      }
    },
    [quoteId, contact, onSaved]
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={saving}
        className="group flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)] disabled:opacity-50"
      >
        {saving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Pencil className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-60" />
        )}
        {contact ? (
          <span className="font-medium text-[var(--color-foreground)]">
            {contact.name ?? contact.email ?? "Contacto"}
          </span>
        ) : (
          <span className="text-[var(--color-muted-foreground)]/60 hover:text-[var(--color-primary)]">
            Adicionar contacto
          </span>
        )}
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-72 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] shadow-lg">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3 py-2">
            <Search className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar contacto..."
              className="flex-1 bg-transparent text-sm focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setOpen(false);
                  setSearch("");
                }
              }}
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-[var(--color-muted-foreground)]" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="px-3 py-3 text-sm text-[var(--color-muted-foreground)]">
                Nenhum contacto encontrado
              </p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelect(c)}
                  className={`flex w-full flex-col px-3 py-2 text-left transition-colors hover:bg-[var(--color-muted)] ${
                    c.id === contact?.id ? "bg-[var(--color-muted)]" : ""
                  }`}
                >
                  <span className="text-sm font-medium">{c.name ?? c.email}</span>
                  {c.company && (
                    <span className="text-xs text-[var(--color-muted-foreground)]">
                      {c.company}
                    </span>
                  )}
                  {c.email && !c.name && (
                    <span className="text-xs text-[var(--color-muted-foreground)]">{c.email}</span>
                  )}
                  {c.id === contact?.id && (
                    <Check className="absolute right-3 h-3.5 w-3.5 text-[var(--color-primary)]" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function QuoteEditableHeader({ quote, statusConfig, nextAction }: QuoteEditableHeaderProps) {
  const router = useRouter();

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <EditableTitle quoteId={quote.id} title={quote.title} onSaved={refresh} />
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
          {nextAction && (
            <Badge
              variant={nextAction.variant === "warning" ? "warning" : "outline"}
              className="gap-1"
            >
              <Clock className="h-3 w-3" />
              {nextAction.label} · {nextAction.timing}
            </Badge>
          )}
          {/* Quick tags */}
          {quote.tags.length > 0 &&
            quote.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag === "urgente"
                  ? "Urgente"
                  : tag === "obra"
                    ? "Obra"
                    : tag === "manutencao"
                      ? "Manutenção"
                      : tag === "it"
                        ? "IT"
                        : tag === "residencial"
                          ? "Residencial"
                          : tag === "comercial"
                            ? "Comercial"
                            : tag}
              </Badge>
            ))}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--color-muted-foreground)]">
          <EditableReference quoteId={quote.id} reference={quote.reference} onSaved={refresh} />
          {quote.contact?.company && (
            <span className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              {quote.contact.company}
            </span>
          )}
          <EditableContact quoteId={quote.id} contact={quote.contact} onSaved={refresh} />
          {quote.sentAt && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Enviado {format(new Date(quote.sentAt), "d MMM yyyy", { locale: pt })}
            </span>
          )}
        </div>
      </div>

      {/* Value — always shown (clickable even if null) */}
      <div className="text-right">
        <EditableValue
          quoteId={quote.id}
          value={quote.value}
          currency={quote.currency}
          onSaved={refresh}
        />
        {quote.serviceType && (
          <p className="text-sm text-[var(--color-muted-foreground)]">{quote.serviceType}</p>
        )}
      </div>
    </div>
  );
}
