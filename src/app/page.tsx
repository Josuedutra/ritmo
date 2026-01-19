"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, ListChecks, FileText, Zap } from "lucide-react";

// Clean, subtle animations
const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: "easeOut" }
};

const staggerContainer = {
    animate: {
        transition: {
            staggerChildren: 0.1
        }
    }
};

export default function LandingPage() {
    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary/10 selection:text-primary">

            {/* Header */}
            <header className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
                <div className="container mx-auto flex h-16 items-center justify-between px-6">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <span className="text-xs font-bold">R</span>
                        </div>
                        <span className="text-lg font-bold tracking-tight">Ritmo</span>
                    </div>

                    <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
                        <a href="#how-it-works" className="hover:text-foreground transition-colors">Como funciona</a>
                        <a href="#features" className="hover:text-foreground transition-colors">Funcionalidades</a>
                        <a href="#pricing" className="hover:text-foreground transition-colors">Preços</a>
                    </nav>

                    <div className="flex items-center gap-4">
                        <Link href="/login" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                            Entrar
                        </Link>
                        <Link href="/signup">
                            <Button size="sm" className="rounded-full font-semibold">
                                Começar agora
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="flex-1">

                {/* HERO SECTION */}
                <section className="relative px-6 pb-20 pt-32 md:pb-32 md:pt-48">
                    {/* Background decorations - Subtle gradient blobs */}
                    <div className="absolute left-[50%] top-0 -z-10 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/5 blur-[100px]" />

                    <motion.div
                        initial="initial"
                        animate="animate"
                        variants={staggerContainer}
                        className="container mx-auto max-w-5xl text-center"
                    >
                        <motion.div variants={fadeInUp} className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary backdrop-blur-sm">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
                            </span>
                            Novidade: Captura automática por BCC
                        </motion.div>

                        <motion.h1 variants={fadeInUp} className="mb-8 text-5xl font-bold tracking-tight text-foreground md:text-7xl">
                            Follow-up automático. <br className="hidden md:block" />
                            <span className="text-muted-foreground">Sem perder o toque humano.</span>
                        </motion.h1>

                        <motion.p variants={fadeInUp} className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
                            O Ritmo gere a cadência dos seus orçamentos para que nunca perca uma oportunidade. Simples, eficaz e sem configurações complexas.
                        </motion.p>

                        <motion.div variants={fadeInUp} className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                            <Link href="/signup">
                                <Button size="lg" className="h-12 rounded-full px-8 text-base shadow-lg transition-all hover:scale-105">
                                    Começar Trial Grátis
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                            <Button variant="outline" size="lg" className="h-12 rounded-full px-8 text-neutral-600 dark:text-neutral-300">
                                Ver demonstração
                            </Button>
                        </motion.div>

                        <motion.div variants={fadeInUp} className="mt-12 flex items-center justify-center gap-6 text-sm text-muted-foreground">
                            <span className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-green-500" /> Sem cartão
                            </span>
                            <span className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-green-500" /> 14 dias trial
                            </span>
                            <span className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-green-500" /> Cancel anytime
                            </span>
                        </motion.div>
                    </motion.div>
                </section>

                {/* FEATURES GRID */}
                <section id="features" className="bg-muted/30 px-6 py-24">
                    <div className="container mx-auto max-w-6xl">
                        <div className="mb-16 text-center">
                            <h2 className="mb-6 text-3xl font-bold md:text-5xl">O seu cockpit de vendas.</h2>
                            <p className="mx-auto max-w-2xl text-muted-foreground">
                                Substitua o caos por clareza. Um sistema desenhado para fechar negócios, não para preencher formulários.
                            </p>
                        </div>

                        <div className="grid gap-6 md:grid-cols-3">
                            {[
                                {
                                    icon: ListChecks,
                                    title: "Ações de Hoje",
                                    desc: "Foque-se no que importa. O Ritmo diz-lhe exatamente quem contactar e quando."
                                },
                                {
                                    icon: Zap,
                                    title: "Automação Inteligente",
                                    desc: "Emails personalizados que pausam automaticamente quando o cliente responde."
                                },
                                {
                                    icon: FileText,
                                    title: "Contexto Total",
                                    desc: "Centralize propostas, emails e notas. Tudo à mão, sem perder tempo."
                                }
                            ].map((feature, i) => (
                                <div
                                    key={i}
                                    className="group rounded-2xl border border-border bg-card p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                                >
                                    <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110">
                                        <feature.icon className="h-6 w-6" />
                                    </div>
                                    <h3 className="mb-3 text-xl font-semibold">{feature.title}</h3>
                                    <p className="leading-relaxed text-muted-foreground">
                                        {feature.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* PRICING */}
                <section id="pricing" className="border-t border-border px-6 py-24">
                    <div className="container mx-auto max-w-6xl">
                        <div className="mb-16 text-center">
                            <h2 className="mb-6 text-3xl font-bold md:text-5xl">Planos simples.</h2>
                            <p className="text-muted-foreground">Comece gratuitamente. Cresça quando precisar.</p>
                        </div>

                        <div className="mx-auto grid max-w-5xl items-center gap-8 md:grid-cols-3">

                            {/* Free Plan */}
                            <div className="rounded-2xl border border-border bg-card p-8 shadow-sm transition-all hover:border-primary/50">
                                <h3 className="mb-2 text-xl font-medium text-foreground">Gratuito</h3>
                                <div className="mb-6 text-4xl font-bold text-foreground">€0</div>
                                <ul className="mb-8 space-y-4 text-sm text-muted-foreground">
                                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> 5 envios / mês</li>
                                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Modo manual</li>
                                    <li className="flex items-center gap-2 text-muted-foreground/50"><Check className="h-4 w-4" /> Sem automação</li>
                                </ul>
                                <Link href="/signup">
                                    <Button variant="outline" className="w-full rounded-full border-border hover:bg-muted">
                                        Começar Grátis
                                    </Button>
                                </Link>
                            </div>

                            {/* Pro Plan (Highlighted) */}
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                className="relative rounded-2xl border border-primary bg-primary/5 p-10 shadow-xl"
                            >
                                <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary px-4 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground">
                                    Mais Popular
                                </div>
                                <h3 className="mb-2 text-xl font-medium text-foreground">Starter / Pro</h3>
                                <div className="mb-6 text-4xl font-bold text-foreground">€29<span className="text-lg font-normal text-muted-foreground">/mês</span></div>
                                <ul className="mb-8 space-y-4 text-sm text-foreground">
                                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Até 250 envios / mês</li>
                                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Emails automáticos</li>
                                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Captura por BCC</li>
                                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Suporte prioritário</li>
                                </ul>
                                <Link href="/signup">
                                    <Button className="h-12 w-full rounded-full font-semibold shadow-md">
                                        Começar Trial (14 dias)
                                    </Button>
                                </Link>
                            </motion.div>

                            {/* Enterprise */}
                            <div className="rounded-2xl border border-border bg-card p-8 shadow-sm transition-all hover:border-primary/50">
                                <h3 className="mb-2 text-xl font-medium text-foreground">Enterprise</h3>
                                <div className="mb-6 text-2xl font-bold text-foreground">Sob consulta</div>
                                <ul className="mb-8 space-y-4 text-sm text-muted-foreground">
                                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Volume ilimitado</li>
                                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Onboarding dedicado</li>
                                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> API Access</li>
                                </ul>
                                <Button variant="outline" className="w-full rounded-full border-border hover:bg-muted">
                                    Falar com Vendas
                                </Button>
                            </div>

                        </div>
                    </div>
                </section>

                {/* CTA FINAL */}
                <section className="relative overflow-hidden px-6 py-32 text-center">
                    <div className="container relative z-10 mx-auto max-w-4xl">
                        <h2 className="mb-8 text-4xl font-bold tracking-tight text-foreground md:text-6xl">
                            Pronto para fechar mais negócios?
                        </h2>
                        <p className="mx-auto mb-12 max-w-2xl text-xl text-muted-foreground">
                            Junte-se a empresas que recuperaram o controlo do seu funil de vendas. Simples, rápido e eficaz.
                        </p>
                        <Link href="/signup">
                            <Button size="lg" className="h-14 rounded-full px-10 text-lg font-semibold shadow-xl">
                                Criar conta gratuita
                            </Button>
                        </Link>
                    </div>
                </section>

            </main>

            <footer className="border-t border-border bg-muted/30 py-8 text-center text-sm text-muted-foreground">
                <div className="container mx-auto">
                    <p>© 2026 Ritmo. Todos os direitos reservados.</p>
                    <div className="mt-4 flex justify-center gap-6">
                        <a href="#" className="hover:text-foreground">Privacidade</a>
                        <a href="#" className="hover:text-foreground">Termos</a>
                        <a href="#" className="hover:text-foreground">Contacto</a>
                    </div>
                </div>
            </footer>

        </div>
    );
}
