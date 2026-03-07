import { prisma } from "@/lib/prisma";

export async function PartnerCommissionsTable({ partnerId }: { partnerId: string }) {
  const entries = await prisma.boosterLedger.findMany({
    where: { partnerId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 px-4 py-3">
        <h2 className="text-lg font-semibold text-zinc-900">Comissões</h2>
      </div>
      {entries.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-zinc-500">Sem comissões ainda.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-zinc-500">
              <th className="px-4 py-2 font-medium">Data</th>
              <th className="px-4 py-2 font-medium">Valor</th>
              <th className="px-4 py-2 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-zinc-100">
                <td className="px-4 py-2 text-zinc-900">
                  {e.createdAt.toLocaleDateString("pt-PT")}
                </td>
                <td className="px-4 py-2 text-zinc-900">{(e.amountCents / 100).toFixed(2)} €</td>
                <td className="px-4 py-2">
                  <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                    {e.status}
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
