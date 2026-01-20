import Link from "next/link";
import { Metadata } from "next";
import { Building2, TrendingUp, Zap, ChevronRight, Mail } from "lucide-react";
import { Footer } from "@/components/marketing";

export const metadata: Metadata = {
    title: "Parcerias para Contabilidades | Ritmo",
    description:
        "Torne-se parceiro Ritmo e ajude os seus clientes a converter mais orçamentos em vendas. Comissão de 15% por cliente indicado.",
};

export default function PartnersPage() {
    return (
        <div className="min-h-screen bg-[var(--color-background)]">
            {/* Header */}
            <header className="border-b border-[var(--color-border)]">
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                    <Link href="/" className="text-xl font-bold text-[var(--color-primary)]">
                        Ritmo
                    </Link>
                    <Link
                        href="/login"
                        className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                    >
                        Entrar
                    </Link>
                </div>
            </header>

            {/* Hero */}
            <section className="py-20">
                <div className="container mx-auto px-4 text-center">
                    <span className="mb-4 inline-block rounded-full bg-[var(--color-primary)]/10 px-4 py-1.5 text-sm font-medium text-[var(--color-primary)]">
                        Programa de Parcerias
                    </span>
                    <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
                        Parcerias para{" "}
                        <span className="text-[var(--color-primary)]">Contabilidades</span>
                    </h1>
                    <p className="mx-auto mt-6 max-w-2xl text-lg text-[var(--color-muted-foreground)]">
                        Ajude os seus clientes a transformar orçamentos em vendas e receba uma comissão
                        por cada cliente indicado que subscreva.
                    </p>
                    <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                        <a
                            href="mailto:parcerias@ritmo.app?subject=Pedido%20de%20link%20de%20parceiro"
                            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-6 py-3 font-medium text-white transition-colors hover:bg-[var(--color-primary)]/90"
                        >
                            <Mail className="h-5 w-5" />
                            Pedir link de parceiro
                        </a>
                        <Link
                            href="/signup"
                            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-6 py-3 font-medium transition-colors hover:bg-[var(--color-accent)]"
                        >
                            Já tenho um link
                            <ChevronRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Value Props */}
            <section className="border-t border-[var(--color-border)] bg-[var(--color-muted)]/30 py-20">
                <div className="container mx-auto px-4">
                    <h2 className="mb-12 text-center text-2xl font-bold">
                        Porquê recomendar o Ritmo?
                    </h2>
                    <div className="grid gap-8 md:grid-cols-3">
                        {/* Benefit 1 */}
                        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
                            <div className="mb-4 inline-flex rounded-lg bg-green-500/10 p-3">
                                <TrendingUp className="h-6 w-6 text-green-500" />
                            </div>
                            <h3 className="mb-2 text-lg font-semibold">Mais respostas a orçamentos</h3>
                            <p className="text-sm text-[var(--color-muted-foreground)]">
                                Os seus clientes deixam de perder oportunidades por falta de follow-up.
                                O Ritmo automatiza lembretes em D+1, D+3, D+7 e D+14.
                            </p>
                        </div>

                        {/* Benefit 2 */}
                        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
                            <div className="mb-4 inline-flex rounded-lg bg-blue-500/10 p-3">
                                <Building2 className="h-6 w-6 text-blue-500" />
                            </div>
                            <h3 className="mb-2 text-lg font-semibold">Clientes com receita mais previsível</h3>
                            <p className="text-sm text-[var(--color-muted-foreground)]">
                                Empresas que fecham mais negócios têm cash flow mais estável.
                                Isso significa menos stress para si e para eles.
                            </p>
                        </div>

                        {/* Benefit 3 */}
                        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
                            <div className="mb-4 inline-flex rounded-lg bg-purple-500/10 p-3">
                                <Zap className="h-6 w-6 text-purple-500" />
                            </div>
                            <h3 className="mb-2 text-lg font-semibold">Zero fricção</h3>
                            <p className="text-sm text-[var(--color-muted-foreground)]">
                                Sem CRM pesado para configurar. O cliente começa a usar em 2 minutos.
                                Marca o orçamento como enviado e o follow-up é automático.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="py-20">
                <div className="container mx-auto px-4">
                    <h2 className="mb-12 text-center text-2xl font-bold">
                        Como funciona a parceria
                    </h2>
                    <div className="mx-auto max-w-3xl">
                        <div className="relative">
                            {/* Timeline line */}
                            <div className="absolute left-6 top-0 h-full w-0.5 bg-[var(--color-border)]" />

                            {/* Step 1 */}
                            <div className="relative mb-8 pl-16">
                                <div className="absolute left-0 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)] text-lg font-bold text-white">
                                    1
                                </div>
                                <h3 className="mb-2 text-lg font-semibold">Pede o seu link de parceiro</h3>
                                <p className="text-sm text-[var(--color-muted-foreground)]">
                                    Envie-nos um email e criamos um link exclusivo para a sua contabilidade
                                    em menos de 24 horas.
                                </p>
                            </div>

                            {/* Step 2 */}
                            <div className="relative mb-8 pl-16">
                                <div className="absolute left-0 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)] text-lg font-bold text-white">
                                    2
                                </div>
                                <h3 className="mb-2 text-lg font-semibold">Partilhe com os seus clientes</h3>
                                <p className="text-sm text-[var(--color-muted-foreground)]">
                                    Quando um cliente precisa de organizar os orçamentos ou quer melhorar
                                    o follow-up comercial, partilhe o link.
                                </p>
                            </div>

                            {/* Step 3 */}
                            <div className="relative mb-8 pl-16">
                                <div className="absolute left-0 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)] text-lg font-bold text-white">
                                    3
                                </div>
                                <h3 className="mb-2 text-lg font-semibold">Receba a sua comissão</h3>
                                <p className="text-sm text-[var(--color-muted-foreground)]">
                                    Por cada cliente que subscreve um plano pago, recebe{" "}
                                    <strong>15% do valor do primeiro pagamento</strong>.
                                    Sem limite de clientes.
                                </p>
                            </div>

                            {/* Step 4 */}
                            <div className="relative pl-16">
                                <div className="absolute left-0 flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-lg font-bold text-white">
                                    ✓
                                </div>
                                <h3 className="mb-2 text-lg font-semibold">Acompanhe tudo no painel</h3>
                                <p className="text-sm text-[var(--color-muted-foreground)]">
                                    Veja quantos clientes se registaram através do seu link e o valor
                                    das comissões pendentes e pagas.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Terms & Conditions */}
            <section className="border-t border-[var(--color-border)] py-16">
                <div className="container mx-auto px-4">
                    <h2 className="mb-8 text-center text-2xl font-bold">
                        Regras do Programa
                    </h2>
                    <div className="mx-auto max-w-2xl space-y-6">
                        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
                            <h3 className="mb-2 font-semibold">Janela de Atribuição</h3>
                            <p className="text-sm text-[var(--color-muted-foreground)]">
                                A atribuição é válida por <strong>30 dias</strong> após o clique no link de parceiro.
                                Se o cliente criar conta dentro deste período, a referência é registada.
                            </p>
                        </div>

                        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
                            <h3 className="mb-2 font-semibold">Cálculo do Booster</h3>
                            <p className="text-sm text-[var(--color-muted-foreground)]">
                                O booster corresponde a <strong>15% do primeiro pagamento</strong> (uma vez)
                                quando o cliente indicado ativa um plano pago. Exemplo: se o cliente subscreve
                                o plano Starter a €39/mês, o booster é de €5,85.
                            </p>
                        </div>

                        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
                            <h3 className="mb-2 font-semibold">Pagamento</h3>
                            <p className="text-sm text-[var(--color-muted-foreground)]">
                                Os boosters ficam no estado <strong>PENDING</strong> até serem processados manualmente
                                pelo admin e marcados como <strong>PAID</strong>. Os pagamentos são feitos por transferência
                                bancária após confirmação do valor acumulado.
                            </p>
                        </div>

                        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
                            <h3 className="mb-2 font-semibold">Limitações</h3>
                            <ul className="list-inside list-disc text-sm text-[var(--color-muted-foreground)] space-y-1">
                                <li>Auto-referência não é permitida (não pode indicar a si próprio)</li>
                                <li>Apenas o primeiro pagamento gera booster (one-time)</li>
                                <li>O link de parceiro pode ser pausado a qualquer momento</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="border-t border-[var(--color-border)] bg-[var(--color-primary)]/5 py-16">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="mb-4 text-2xl font-bold">Pronto para começar?</h2>
                    <p className="mb-8 text-[var(--color-muted-foreground)]">
                        Peça o seu link de parceiro e comece a ajudar os seus clientes hoje.
                    </p>
                    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                        <a
                            href="mailto:parcerias@ritmo.app?subject=Pedido%20de%20link%20de%20parceiro&body=Olá,%0A%0AGostava de me tornar parceiro Ritmo.%0A%0ANome da empresa:%0AEmail de contacto:%0A%0AObrigado!"
                            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-8 py-4 text-lg font-medium text-white transition-colors hover:bg-[var(--color-primary)]/90"
                        >
                            <Mail className="h-5 w-5" />
                            Pedir link de parceiro
                        </a>
                        <Link
                            href="/signup"
                            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-8 py-4 font-medium transition-colors hover:bg-[var(--color-accent)]"
                        >
                            Começar trial
                            <ChevronRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
