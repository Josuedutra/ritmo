import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppHeader, PageHeader } from "@/components/layout";
import { TemplatesList } from "./templates-list";

async function getTemplates(organizationId: string) {
    return prisma.template.findMany({
        where: { organizationId },
        orderBy: { code: "asc" },
    });
}

export default async function TemplatesPage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    const templates = await getTemplates(session.user.organizationId);

    // Serialize for client component
    const serializedTemplates = templates.map((t) => ({
        id: t.id,
        code: t.code,
        name: t.name,
        subject: t.subject,
        body: t.body,
        isActive: t.isActive,
        updatedAt: t.updatedAt.toISOString(),
    }));

    return (
        <div className="min-h-screen bg-[var(--color-background)]">
            <AppHeader user={session.user} />

            <main className="container-app py-6">
                <PageHeader
                    title="Templates"
                    description="Gerir templates de email e scripts de chamada"
                />

                <TemplatesList templates={serializedTemplates} />
            </main>
        </div>
    );
}
