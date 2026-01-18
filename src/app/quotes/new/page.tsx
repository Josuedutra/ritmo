import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppHeader, PageHeader } from "@/components/layout";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { QuoteForm } from "./quote-form";

async function getContacts(organizationId: string) {
    return prisma.contact.findMany({
        where: { organizationId },
        orderBy: { name: "asc" },
        select: {
            id: true,
            name: true,
            email: true,
            company: true,
        },
    });
}

export default async function NewQuotePage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    const contacts = await getContacts(session.user.organizationId);

    return (
        <div className="min-h-screen bg-[var(--color-background)]">
            <AppHeader user={session.user} />

            <main className="container-app py-6">
                <Link
                    href="/quotes"
                    className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar aos orçamentos
                </Link>

                <PageHeader
                    title="Novo orçamento"
                    description="Criar um novo orçamento para acompanhar"
                />

                <QuoteForm contacts={contacts} />
            </main>
        </div>
    );
}
