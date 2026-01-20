import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppHeader, PageHeader } from "@/components/layout";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { QuoteForm } from "./quote-form";

export default async function NewQuotePage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

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
                    description="Preencha os dados mínimos e inicie o follow-up"
                />

                <QuoteForm />
            </main>
        </div>
    );
}
