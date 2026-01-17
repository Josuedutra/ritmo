import Link from "next/link";
import { Button } from "@/components/ui";
import { ArrowRight, Mail, Phone, BarChart3 } from "lucide-react";

export default function HomePage() {
    return (
        <div className="flex min-h-screen flex-col">
            {/* Header */}
            <header className="border-b border-[var(--color-border)] bg-[var(--color-sidebar)]">
                <div className="container-app flex h-14 items-center justify-between">
                    <span className="text-xl font-bold text-gradient">Ritmo</span>
                    <Link href="/login">
                        <Button variant="secondary" size="sm">
                            Entrar
                        </Button>
                    </Link>
                </div>
            </header>

            {/* Hero */}
            <main className="flex flex-1 flex-col">
                <section className="flex flex-1 items-center justify-center px-6 py-16">
                    <div className="mx-auto max-w-2xl text-center">
                        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                            Follow-up inteligente
                            <br />
                            <span className="text-gradient">para orçamentos B2B</span>
                        </h1>

                        <p className="mx-auto mt-4 max-w-lg text-lg text-[var(--color-muted-foreground)]">
                            Cadência automática + painel + envio. Nunca mais perca uma oportunidade por falta de acompanhamento.
                        </p>

                        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                            <Link href="/login">
                                <Button size="lg" className="w-full sm:w-auto">
                                    Começar agora
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                            <Link href="/health">
                                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                                    Ver status
                                </Button>
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Features */}
                <section className="border-t border-[var(--color-border)] bg-[var(--color-card)]">
                    <div className="container-app py-12">
                        <div className="grid gap-6 sm:grid-cols-3">
                            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-5">
                                <div className="mb-3 inline-flex rounded-md bg-[var(--color-primary)]/10 p-2">
                                    <Mail className="h-5 w-5 text-[var(--color-primary)]" />
                                </div>
                                <h3 className="mb-1 font-semibold">Emails automáticos</h3>
                                <p className="text-sm text-[var(--color-muted-foreground)]">
                                    D+1, D+3, D+14 — follow-ups enviados na hora certa
                                </p>
                            </div>

                            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-5">
                                <div className="mb-3 inline-flex rounded-md bg-[var(--color-success)]/10 p-2">
                                    <Phone className="h-5 w-5 text-[var(--color-success)]" />
                                </div>
                                <h3 className="mb-1 font-semibold">Chamadas D+7</h3>
                                <p className="text-sm text-[var(--color-muted-foreground)]">
                                    Tarefa de chamada com script e proposta à mão
                                </p>
                            </div>

                            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-5">
                                <div className="mb-3 inline-flex rounded-md bg-[var(--color-warning)]/10 p-2">
                                    <BarChart3 className="h-5 w-5 text-[var(--color-warning)]" />
                                </div>
                                <h3 className="mb-1 font-semibold">Dashboard claro</h3>
                                <p className="text-sm text-[var(--color-muted-foreground)]">
                                    Vê o que fazer hoje num só ecrã
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t border-[var(--color-border)] py-4">
                <div className="container-app text-center text-sm text-[var(--color-muted-foreground)]">
                    © 2026 Ritmo · MVP v0.1.0
                </div>
            </footer>
        </div>
    );
}
