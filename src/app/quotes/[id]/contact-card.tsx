"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Building2, Pencil, Receipt } from "lucide-react";
import { ContactEditForm } from "./contact-edit-form";

interface Contact {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  taxId: string | null;
}

interface ContactCardProps {
  contact: Contact;
}

export function ContactCard({ contact }: ContactCardProps) {
  const [editing, setEditing] = useState(false);
  const [localContact, setLocalContact] = useState(contact);

  const handleSave = () => {
    setEditing(false);
    // router.refresh() is called inside ContactEditForm, page data will reload
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Contacto</CardTitle>
          {!editing && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => setEditing(true)}
              title="Editar contacto"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {editing ? (
          <ContactEditForm
            contact={localContact}
            onSave={handleSave}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                {localContact.name?.charAt(0).toUpperCase() || "?"}
              </div>
              <div>
                <p className="font-medium">{localContact.name}</p>
                {localContact.company && (
                  <p className="flex items-center gap-1 text-sm text-[var(--color-muted-foreground)]">
                    <Building2 className="h-3 w-3" />
                    {localContact.company}
                  </p>
                )}
              </div>
            </div>

            {localContact.email && (
              <a
                href={`mailto:${localContact.email}`}
                className="flex items-center gap-2 text-sm hover:text-[var(--color-primary)]"
              >
                <Mail className="h-4 w-4 shrink-0" />
                {localContact.email}
              </a>
            )}

            {localContact.phone ? (
              <a
                href={`tel:${localContact.phone}`}
                className="flex items-center gap-2 text-sm hover:text-[var(--color-primary)]"
              >
                <Phone className="h-4 w-4 shrink-0" />
                {localContact.phone}
              </a>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
              >
                <Phone className="h-4 w-4 shrink-0" />
                <span className="italic">Sem telefone</span>
                <Pencil className="h-3 w-3" />
              </button>
            )}

            {localContact.taxId && (
              <div className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
                <Receipt className="h-4 w-4 shrink-0" />
                NIF: {localContact.taxId}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
