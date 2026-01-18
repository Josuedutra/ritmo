import Link from "next/link";
import { Button } from "@/components/ui";
import {
    LandingHeader,
    LandingSection,
    PricingCard,
    FAQAccordion,
    FeatureCard,
    StepCard,
} from "@/components/landing";
import { ArrowRight, ListChecks, FileText, MousePointerClick } from "lucide-react";

// FAQ Data
const faqItems = [
    {
        question: 'O que conta como "envio"?',
        answer: "Conta apenas o primeiro envio de cada orçamento. Reenvios não consomem quota.",
    },
    {
        question: "Preciso mudar o meu processo atual (Excel/Outlook/Gmail)?",
        answer: "Não. O Ritmo adapta-se: pode continuar a enviar como sempre e usar BCC para associar a proposta.",
    },
    {
        question: "O Ritmo envia emails automaticamente?",
        answer: "No trial e planos pagos, sim. No plano gratuito, o Ritmo cria tarefas e facilita copiar os templates.",
    },
    {
        question: "Como funciona o BCC?",
        answer: "Ao enviar a proposta, coloca um endereço BCC do Ritmo. O Ritmo associa automaticamente o PDF/link ao orçamento.",
    },
    {
        question: "E se o contacto não tiver email?",
        answer: "O Ritmo recomenda chamada e cria tarefas manuais para não travar.",
    },
    {
        question: "Posso cancelar?",
        answer: "Sim. Pode cancelar a qualquer momento na página de faturação.",
    },
    {
        question: "O email parece robô?",
        answer: "Os templates são personalizados e escritos num tom natural. Pode ajustar ao seu estilo.",
    },
    {
        question: "É seguro?",
        answer: "Opt-out e listas de supressão estão incluídos. Dados de email e credenciais são protegidos.",
    },
];

export default function HomePage() {
    return (
        <div className="flex min-h-screen flex-col">
            <LandingHeader />

            <main className="flex-1">
                {/* Hero */}
                <section className="px-6 py-16 sm:py-20 lg:py-24">
                    <div className="mx-auto max-w-4xl text-center">
                        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl xl:text-6xl">
                            Orçamentos enviados.{" "}
                            <span className="text-gradient">Follow-up automático.</span>
                            <br />
                            Menos &quot;sem resposta&quot;.
                        </h1>

                        <p className="mx-auto mt-6 max-w-2xl text-lg text-[var(--color-muted-foreground)] sm:text-xl">
                            O Ritmo cria uma cadência simples (D+1, D+3, D+7, D+14) e mostra
                            exatamente o que fazer hoje — email ou chamada — com a proposta
                            sempre à mão.
                        </p>

                        {/* Bullets */}
                        <ul className="mx-auto mt-8 max-w-xl space-y-3 text-left sm:text-center">
                            <li className="flex items-start gap-3 sm:justify-center">
                                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary)]" />
                                <span className="text-[var(--color-muted-foreground)]">
                                    Cadência automática (emails ou tarefas) sem parecer robô
                                </span>
                            </li>
                            <li className="flex items-start gap-3 sm:justify-center">
                                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary)]" />
                                <span className="text-[var(--color-muted-foreground)]">
                                    Chamada D+7 preparada com resumo e proposta em 1 clique
                                </span>
                            </li>
                            <li className="flex items-start gap-3 sm:justify-center">
                                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary)]" />
                                <span className="text-[var(--color-muted-foreground)]">
                                    Captura da proposta por BCC (PDF ou link) para acelerar decisões
                                </span>
                            </li>
                        </ul>

                        {/* CTAs */}
                        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                            <Link href="/signup">
                                <Button size="lg" className="gap-2">
                                    Começar trial grátis
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </Link>
                            <a href="#como-funciona">
                                <Button variant="outline" size="lg">
                                    Ver como funciona
                                </Button>
                            </a>
                        </div>

                        {/* Microcopy */}
                        <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">
                            14 dias · 20 envios · sem cartão
                        </p>

                        {/* Trust line */}
                        <p className="mt-8 text-sm text-[var(--color-muted-foreground)]">
                            Feito para PMEs de serviços técnicos: AVAC, manutenção, IT, facilities e similares.
                        </p>
                    </div>
                </section>

                {/* Trust strip - sem cartão */}
                <div className="border-y border-[var(--color-border)] bg-[var(--color-primary)]/5 py-4">
                    <div className="container-app text-center">
                        <p className="text-sm font-medium text-[var(--color-primary)]">
                            Sem cartão de crédito · Cancele a qualquer momento · Dados seguros
                        </p>
                    </div>
                </div>

                {/* Como funciona */}
                <LandingSection
                    id="como-funciona"
                    title="Em 3 passos, o Ritmo entra na rotina."
                    background="muted"
                >
                    <div className="grid gap-8 md:grid-cols-3">
                        <StepCard
                            number={1}
                            title="Crie o orçamento"
                            description="Registe o cliente, valor e referência. Pode colar o link da proposta ou anexar PDF depois."
                        />
                        <StepCard
                            number={2}
                            title="Marque como enviado"
                            description="O Ritmo inicia a cadência: D+1, D+3, D+7, D+14 (dias úteis)."
                        />
                        <StepCard
                            number={3}
                            title="Execute as ações de hoje"
                            description="Copie o email (ou envie automaticamente), abra a proposta e faça a chamada — sem perder tempo a procurar ficheiros."
                        />
                    </div>
                    <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-[var(--color-muted-foreground)]">
                        Se faltar email/telefone, o Ritmo cria tarefas manuais para não travar o processo.
                    </p>
                </LandingSection>

                {/* O que muda na prática */}
                <LandingSection
                    title='O seu "cockpit" de follow-up.'
                >
                    <div className="grid gap-6 md:grid-cols-3">
                        <FeatureCard
                            icon={ListChecks}
                            title="Ações de hoje"
                            description="Tudo o que precisa fazer hoje, numa lista curta."
                        />
                        <FeatureCard
                            icon={FileText}
                            title="Proposta sempre disponível"
                            description="Link/PDF associado ao orçamento — ideal para o D+7."
                        />
                        <FeatureCard
                            icon={MousePointerClick}
                            title="Sem resposta vira ação"
                            description="1 clique para gerar a próxima ação recomendada."
                        />
                    </div>
                </LandingSection>

                {/* Planos */}
                <LandingSection
                    id="planos"
                    title="Planos"
                    subtitle="Escolha o nível certo para o seu volume de envios."
                    background="muted"
                >
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                        {/* Trial */}
                        <PricingCard
                            name="Trial (14 dias)"
                            highlighted
                            badge="Recomendado"
                            features={[
                                { text: "20 envios incluídos", included: true },
                                { text: "Emails automáticos", included: true },
                                { text: "Captura de proposta por BCC", included: true },
                                { text: "Sem cartão", included: true },
                            ]}
                            cta={{ text: "Começar trial", href: "/signup" }}
                            note="No fim do trial, pode escolher um plano ou ficar no modo gratuito."
                        />

                        {/* Gratuito */}
                        <PricingCard
                            name="Gratuito"
                            price="€0"
                            priceNote="/mês"
                            features={[
                                { text: "5 envios / mês", included: true },
                                { text: "Modo manual (tarefas + copiar templates)", included: true },
                                { text: "Sem emails automáticos", included: false },
                                { text: "Sem captura por BCC", included: false },
                            ]}
                            cta={{ text: "Experimentar modo manual", href: "/signup" }}
                        />

                        {/* Starter */}
                        <PricingCard
                            name="Starter"
                            price="€{{preço}}"
                            priceNote="/mês"
                            description="{{envios}} envios / mês"
                            features={[
                                { text: "Emails automáticos", included: true },
                                { text: "Captura por BCC", included: true },
                            ]}
                            cta={{ text: "Escolher Starter", href: "/signup" }}
                        />

                        {/* Pro */}
                        <PricingCard
                            name="Pro"
                            price="€{{preço}}"
                            priceNote="/mês"
                            description="{{envios}} envios / mês"
                            features={[
                                { text: "Emails automáticos", included: true },
                                { text: "Captura por BCC", included: true },
                            ]}
                            cta={{ text: "Escolher Pro", href: "/signup" }}
                        />

                        {/* Enterprise */}
                        <PricingCard
                            name="Enterprise"
                            price="Personalizado"
                            description="Volume ilimitado"
                            features={[
                                { text: "Emails automáticos", included: true },
                                { text: "Captura por BCC", included: true },
                                { text: "Suporte dedicado", included: true },
                            ]}
                            cta={{ text: "Falar connosco", href: "mailto:geral@ritmo.app?subject=Enterprise%20Ritmo" }}
                        />
                    </div>

                    {/* Nota sob pricing */}
                    <div className="mx-auto mt-12 max-w-xl rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-6">
                        <h3 className="font-semibold">O que conta como &quot;envio&quot;?</h3>
                        <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                            Conta apenas o primeiro envio de cada orçamento. Reenvios não consomem quota (com limite de segurança).
                        </p>
                    </div>
                </LandingSection>

                {/* FAQ */}
                <LandingSection
                    id="faq"
                    title="FAQ"
                >
                    <FAQAccordion items={faqItems} />
                </LandingSection>

                {/* CTA Final */}
                <LandingSection background="muted" className="text-center">
                    <h2 className="text-2xl font-bold sm:text-3xl lg:text-4xl">
                        Comece hoje. Em 10 minutos está a enviar e acompanhar follow-ups.
                    </h2>
                    <div className="mt-8">
                        <Link href="/signup">
                            <Button size="lg" className="gap-2">
                                Começar trial grátis
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                    <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">
                        14 dias · 20 envios · sem cartão
                    </p>
                </LandingSection>
            </main>

            {/* Footer */}
            <footer className="border-t border-[var(--color-border)] bg-[var(--color-background)] py-8">
                <div className="container-app">
                    <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                        <div className="flex items-center gap-6">
                            <span className="text-xl font-bold text-gradient">Ritmo</span>
                            <nav className="flex items-center gap-4 text-sm text-[var(--color-muted-foreground)]">
                                <Link href="/login" className="hover:text-[var(--color-foreground)]">
                                    Entrar
                                </Link>
                                <Link href="/privacidade" className="hover:text-[var(--color-foreground)]">
                                    Privacidade
                                </Link>
                                <Link href="/termos" className="hover:text-[var(--color-foreground)]">
                                    Termos
                                </Link>
                                <a href="mailto:geral@ritmo.app?subject=Contacto" className="hover:text-[var(--color-foreground)]">
                                    Contacto
                                </a>
                            </nav>
                        </div>
                        <p className="text-sm text-[var(--color-muted-foreground)]">
                            © 2026 Ritmo. Todos os direitos reservados.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
