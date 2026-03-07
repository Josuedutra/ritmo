import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  PartnerStatsCard,
  PartnerReferralsTable,
  PartnerCommissionsTable,
} from "@/components/partners";

export default async function PartnerCockpitPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/auth/signin");

  const partner = await prisma.partner.findUnique({
    where: { contactEmail: session.user.email },
  });

  if (!partner) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900">Acesso negado</h1>
          <p className="mt-2 text-zinc-500">Esta página é exclusiva para parceiros registados.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 py-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold text-zinc-900">Cockpit do Parceiro</h1>
        <div className="space-y-8">
          <PartnerStatsCard partnerId={partner.id} />
          <PartnerReferralsTable partnerId={partner.id} />
          <PartnerCommissionsTable partnerId={partner.id} />
        </div>
      </div>
    </div>
  );
}
