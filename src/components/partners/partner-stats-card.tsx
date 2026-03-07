import { prisma } from "@/lib/prisma";

export async function PartnerStatsCard({ partnerId }: { partnerId: string }) {
  const [referralCount, totalCommissionCents] = await Promise.all([
    prisma.referralAttribution.count({ where: { partnerId } }),
    prisma.boosterLedger.aggregate({
      where: { partnerId, status: "PAID" },
      _sum: { amountCents: true },
    }),
  ]);

  const totalCommission = (totalCommissionCents._sum.amountCents ?? 0) / 100;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <span className="text-sm text-zinc-500">Referências</span>
        <p className="mt-1 text-2xl font-semibold text-zinc-900">{referralCount}</p>
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <span className="text-sm text-zinc-500">Comissões pagas</span>
        <p className="mt-1 text-2xl font-semibold text-zinc-900">{totalCommission.toFixed(2)} €</p>
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <span className="text-sm text-zinc-500">Taxa de comissão</span>
        <p className="mt-1 text-2xl font-semibold text-zinc-900">15%</p>
      </div>
    </div>
  );
}
