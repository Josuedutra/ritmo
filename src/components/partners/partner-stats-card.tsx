"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui";
import { Users, UserCheck, DollarSign, Clock, Loader2 } from "lucide-react";

interface PartnerStats {
  partnerId: string;
  totalReferrals: number;
  activeReferrals: number;
  totalCommissionsCents: number;
  pendingCommissionsCents: number;
}

interface PartnerStatsCardProps {
  partnerId: string;
}

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);

export function PartnerStatsCard({ partnerId }: PartnerStatsCardProps) {
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch(`/api/partners/${partnerId}/stats`);
        if (!res.ok) throw new Error("Falha ao carregar estatísticas");
        const data = await res.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [partnerId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="py-8 text-center text-sm text-[var(--color-muted-foreground)]">
        {error ?? "Sem dados disponíveis"}
      </div>
    );
  }

  const items = [
    {
      label: "Total de Referrals",
      value: stats.totalReferrals,
      icon: Users,
      iconBg: "bg-[var(--color-info)]/10",
      iconColor: "text-[var(--color-info)]",
    },
    {
      label: "Referrals Ativos",
      value: stats.activeReferrals,
      icon: UserCheck,
      iconBg: "bg-green-500/10",
      iconColor: "text-green-600",
    },
    {
      label: "Comissões Acumuladas",
      value: formatCurrency(stats.totalCommissionsCents),
      icon: DollarSign,
      iconBg: "bg-green-500/10",
      iconColor: "text-green-600",
    },
    {
      label: "Comissões Pendentes",
      value: formatCurrency(stats.pendingCommissionsCents),
      icon: Clock,
      iconBg: "bg-[var(--color-warning)]/10",
      iconColor: "text-[var(--color-warning)]",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className={`rounded-full p-2 ${item.iconBg}`}>
                  <Icon className={`h-5 w-5 ${item.iconColor}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{item.value}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">{item.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
