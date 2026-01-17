import Link from "next/link";

export default function HomePage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[var(--color-background)] via-[var(--color-card)] to-[var(--color-background)]">
            <div className="mx-auto max-w-2xl px-4 text-center">
                {/* Logo */}
                <div className="mb-8">
                    <h1 className="text-6xl font-bold tracking-tight">
                        <span className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-success)] bg-clip-text text-transparent">
                            Ritmo
                        </span>
                    </h1>
                    <p className="mt-2 text-xl text-[var(--color-muted-foreground)]">
                        Follow-up Inteligente para Orçamentos
                    </p>
                </div>

                {/* Description */}
                <p className="mb-8 text-lg text-[var(--color-muted-foreground)]">
                    Cadência automática + painel + envio para follow-up de orçamentos B2B.
                    <br />
                    Nunca mais perca uma oportunidade por falta de acompanhamento.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                    <Link
                        href="/login"
                        className="inline-flex items-center justify-center rounded-lg bg-[var(--color-primary)] px-8 py-3 text-lg font-semibold text-white transition-all hover:opacity-90"
                    >
                        Começar Agora
                    </Link>
                    <Link
                        href="/health"
                        className="inline-flex items-center justify-center rounded-lg border border-[var(--color-border)] px-8 py-3 text-lg font-semibold text-[var(--color-foreground)] transition-all hover:bg-[var(--color-card)]"
                    >
                        Ver Status
                    </Link>
                </div>

                {/* Features */}
                <div className="mt-16 grid gap-6 sm:grid-cols-3">
                    <div className="rounded-xl bg-[var(--color-card)] p-6 text-left">
                        <div className="mb-3 text-3xl">📧</div>
                        <h3 className="mb-2 font-semibold">Emails Automáticos</h3>
                        <p className="text-sm text-[var(--color-muted-foreground)]">
                            D+1, D+3, D+14 - follow-ups enviados na hora certa
                        </p>
                    </div>
                    <div className="rounded-xl bg-[var(--color-card)] p-6 text-left">
                        <div className="mb-3 text-3xl">📞</div>
                        <h3 className="mb-2 font-semibold">Chamadas D+7</h3>
                        <p className="text-sm text-[var(--color-muted-foreground)]">
                            Tarefa de chamada com script e proposta à mão
                        </p>
                    </div>
                    <div className="rounded-xl bg-[var(--color-card)] p-6 text-left">
                        <div className="mb-3 text-3xl">📊</div>
                        <h3 className="mb-2 font-semibold">Dashboard Claro</h3>
                        <p className="text-sm text-[var(--color-muted-foreground)]">
                            Vê o que fazer hoje num só ecrã
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="absolute bottom-4 text-sm text-[var(--color-muted-foreground)]">
                © 2026 Ritmo · MVP v0.1.0
            </footer>
        </div>
    );
}
