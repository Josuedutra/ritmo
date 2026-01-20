import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canAccessReports } from "@/lib/entitlements";
import { AppHeader, PageHeader } from "@/components/layout";
import { ReportsClient } from "./reports-client";
import { ReportsTeaser } from "./reports-teaser";

export default async function ReportsPage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    // Check if user can access reports
    const access = await canAccessReports(session.user.organizationId);

    return (
        <div className="min-h-screen bg-[var(--color-background)]">
            <AppHeader user={session.user} />

            <main className="container-app py-6">
                <PageHeader
                    title="Relatórios"
                    description="Métricas de desempenho dos últimos 30 dias"
                />

                {access.allowed ? (
                    <ReportsClient />
                ) : (
                    <ReportsTeaser planRequired={access.planRequired} />
                )}
            </main>
        </div>
    );
}
