import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    return (
        <div className="min-h-screen bg-[var(--color-background)]">
            {/* Header */}
            <header className="border-b border-[var(--color-border)] bg-[var(--color-sidebar)]">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
                    <h1 className="text-xl font-bold">
                        <span className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-success)] bg-clip-text text-transparent">
                            Ritmo
                        </span>
                    </h1>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-[var(--color-muted-foreground)]">
                            {session.user.email}
                        </span>
                        <Link
                            href="/api/auth/signout"
                            className="rounded-lg bg-[var(--color-secondary)] px-3 py-1.5 text-sm hover:bg-[var(--color-accent)]"
                        >
                            Sair
                        </Link>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="mx-auto max-w-7xl p-4">
                {/* Stats */}
                <div className="mb-8 grid gap-4 sm:grid-cols-4">
                    <div className="rounded-xl bg-[var(--color-card)] p-6">
                        <div className="text-3xl font-bold text-[var(--color-primary)]">0</div>
                        <div className="text-sm text-[var(--color-muted-foreground)]">
                            Ações Hoje
                        </div>
                    </div>
                    <div className="rounded-xl bg-[var(--color-card)] p-6">
                        <div className="text-3xl font-bold text-[var(--color-success)]">0</div>
                        <div className="text-sm text-[var(--color-muted-foreground)]">
                            Orçamentos Enviados
                        </div>
                    </div>
                    <div className="rounded-xl bg-[var(--color-card)] p-6">
                        <div className="text-3xl font-bold text-[var(--color-warning)]">0</div>
                        <div className="text-sm text-[var(--color-muted-foreground)]">
                            Sem Resposta
                        </div>
                    </div>
                    <div className="rounded-xl bg-[var(--color-card)] p-6">
                        <div className="text-3xl font-bold">€0</div>
                        <div className="text-sm text-[var(--color-muted-foreground)]">
                            Em Pipeline
                        </div>
                    </div>
                </div>

                {/* Actions Today */}
                <div className="mb-8">
                    <h2 className="mb-4 text-lg font-semibold">📋 Ações de Hoje</h2>
                    <div className="rounded-xl bg-[var(--color-card)] p-8 text-center text-[var(--color-muted-foreground)]">
                        <div className="mb-2 text-4xl">🎉</div>
                        <p>Nenhuma ação pendente para hoje.</p>
                        <p className="mt-2 text-sm">
                            As ações aparecerão aqui quando tiver orçamentos com follow-ups agendados.
                        </p>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid gap-4 sm:grid-cols-3">
                    <Link
                        href="/quotes/new"
                        className="flex items-center gap-3 rounded-xl bg-[var(--color-card)] p-4 transition-colors hover:bg-[var(--color-accent)]"
                    >
                        <div className="text-2xl">➕</div>
                        <div>
                            <div className="font-medium">Novo Orçamento</div>
                            <div className="text-sm text-[var(--color-muted-foreground)]">
                                Criar e acompanhar
                            </div>
                        </div>
                    </Link>
                    <Link
                        href="/quotes"
                        className="flex items-center gap-3 rounded-xl bg-[var(--color-card)] p-4 transition-colors hover:bg-[var(--color-accent)]"
                    >
                        <div className="text-2xl">📄</div>
                        <div>
                            <div className="font-medium">Ver Orçamentos</div>
                            <div className="text-sm text-[var(--color-muted-foreground)]">
                                Todos os orçamentos
                            </div>
                        </div>
                    </Link>
                    <Link
                        href="/settings"
                        className="flex items-center gap-3 rounded-xl bg-[var(--color-card)] p-4 transition-colors hover:bg-[var(--color-accent)]"
                    >
                        <div className="text-2xl">⚙️</div>
                        <div>
                            <div className="font-medium">Definições</div>
                            <div className="text-sm text-[var(--color-muted-foreground)]">
                                Configurar conta
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Debug Info (Sprint 0) */}
                <div className="mt-8 rounded-xl bg-[var(--color-card)] p-4">
                    <h3 className="mb-2 text-sm font-medium text-[var(--color-muted-foreground)]">
                        🔧 Debug Info (Sprint 0)
                    </h3>
                    <pre className="overflow-auto text-xs text-[var(--color-muted-foreground)]">
                        {JSON.stringify(
                            {
                                user: session.user.email,
                                organizationId: session.user.organizationId,
                                role: session.user.role,
                            },
                            null,
                            2
                        )}
                    </pre>
                </div>
            </main>
        </div>
    );
}
