import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canAccessReports } from "@/lib/entitlements";
import { AppHeader, PageHeader } from "@/components/layout";
import { ReportsClient } from "./reports-client";
import { ReportsTeaser } from "./reports-teaser";
import { checkIsPartner } from "@/lib/partner-utils";

export default async function ReportsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Check if user can access reports and partner status
  const [access, isPartner] = await Promise.all([
    canAccessReports(session.user.organizationId),
    session.user.email ? checkIsPartner(session.user.email) : Promise.resolve(false),
  ]);

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <AppHeader user={session.user} isPartner={isPartner} />

      <main className="container-app py-6">
        <PageHeader title="Relatórios" description="Métricas de desempenho dos últimos 30 dias" />

        {access.allowed ? <ReportsClient /> : <ReportsTeaser planRequired={access.planRequired} />}
      </main>
    </div>
  );
}
