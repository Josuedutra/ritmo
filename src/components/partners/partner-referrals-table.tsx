"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";

interface Referral {
  id: string;
  date: string;
  signupAt: string | null;
  convertedAt: string | null;
  referredEmail: string | null;
  status: string;
  plan: string;
}

interface Pagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

interface PartnerReferralsTableProps {
  partnerId: string;
}

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const STATUS_LABELS: Record<string, string> = {
  CLICKED: "Clique",
  SIGNED_UP: "Registado",
  CONVERTED: "Convertido",
};

const STATUS_CLASSES: Record<string, string> = {
  CLICKED: "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]",
  SIGNED_UP:
    "bg-[var(--color-info)]/10 text-[var(--color-info)] border border-[var(--color-info)]/25",
  CONVERTED: "bg-green-500/10 text-green-600 border border-green-500/30",
};

export function PartnerReferralsTable({ partnerId }: PartnerReferralsTableProps) {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReferrals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/partners/${partnerId}/referrals?page=${page}&per_page=20`);
      if (!res.ok) throw new Error("Falha ao carregar referrals");
      const data = await res.json();
      setReferrals(data.referrals);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [partnerId, page]);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Referrals</CardTitle>
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
        ) : referrals.length === 0 ? (
          <div className="py-8 text-center text-sm text-[var(--color-muted-foreground)]">
            Sem referrals de momento
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Data</th>
                    <th className="pb-2 font-medium">Utilizador</th>
                    <th className="pb-2 font-medium">Plano</th>
                    <th className="pb-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((r) => (
                    <tr key={r.id} className="border-b">
                      <td className="py-3 text-xs">{formatDate(r.date)}</td>
                      <td className="py-3">{r.referredEmail ?? "—"}</td>
                      <td className="py-3">{r.plan}</td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[r.status] ?? STATUS_CLASSES.CLICKED}`}
                        >
                          {STATUS_LABELS[r.status] ?? r.status}
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
                  {pagination.total} referral{pagination.total !== 1 ? "s" : ""} — página{" "}
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
