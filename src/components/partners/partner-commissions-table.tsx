"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";

interface Commission {
  id: string;
  month: string;
  amountCents: number;
  currency: string;
  rateBps: number;
  status: string;
  reason: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

interface PartnerCommissionsTableProps {
  partnerId: string;
}

const formatCurrency = (cents: number, currency = "EUR") =>
  new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovado",
  PAID: "Pago",
  VOID: "Anulado",
};

const STATUS_CLASSES: Record<string, string> = {
  PENDING:
    "bg-[var(--color-warning)]/10 text-[var(--color-warning)] border border-[var(--color-warning)]/30",
  APPROVED:
    "bg-[var(--color-info)]/10 text-[var(--color-info)] border border-[var(--color-info)]/25",
  PAID: "bg-green-500/10 text-green-600 border border-green-500/30",
  VOID: "bg-[var(--color-destructive)]/10 text-[var(--color-destructive)] border border-[var(--color-destructive)]/30",
};

export function PartnerCommissionsTable({ partnerId }: PartnerCommissionsTableProps) {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCommissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/partners/${partnerId}/commissions?page=${page}&per_page=20`);
      if (!res.ok) throw new Error("Falha ao carregar comissões");
      const data = await res.json();
      setCommissions(data.commissions);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [partnerId, page]);

  useEffect(() => {
    fetchCommissions();
  }, [fetchCommissions]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comissões</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
          </div>
        ) : error ? (
          <div className="py-8 text-center text-sm text-[var(--color-muted-foreground)]">
            {error}
          </div>
        ) : commissions.length === 0 ? (
          <div className="py-8 text-center text-sm text-[var(--color-muted-foreground)]">
            Sem comissões de momento
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Mês</th>
                    <th className="pb-2 font-medium">Valor</th>
                    <th className="pb-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((c) => (
                    <tr key={c.id} className="border-b">
                      <td className="py-3">{c.month}</td>
                      <td className="py-3 font-medium">
                        {formatCurrency(c.amountCents, c.currency)}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[c.status] ?? STATUS_CLASSES.PENDING}`}
                        >
                          {STATUS_LABELS[c.status] ?? c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {pagination.total} comiss{pagination.total !== 1 ? "ões" : "ão"} — página{" "}
                  {pagination.page} de {pagination.totalPages}
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded-md border border-[var(--color-border)] p-1.5 text-sm disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={page >= pagination.totalPages}
                    className="rounded-md border border-[var(--color-border)] p-1.5 text-sm disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
