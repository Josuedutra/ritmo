import { prisma } from "@/lib/prisma";

export async function PartnerReferralsTable({ partnerId }: { partnerId: string }) {
  const referrals = await prisma.referralAttribution.findMany({
    where: { partnerId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 px-4 py-3">
        <h2 className="text-lg font-semibold text-zinc-900">Referências</h2>
      </div>
      {referrals.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-zinc-500">Sem referências ainda.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-zinc-500">
              <th className="px-4 py-2 font-medium">Data</th>
              <th className="px-4 py-2 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {referrals.map((r) => (
              <tr key={r.id} className="border-b border-zinc-100">
                <td className="px-4 py-2 text-zinc-900">
                  {r.createdAt.toLocaleDateString("pt-PT")}
                </td>
                <td className="px-4 py-2">
                  <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
