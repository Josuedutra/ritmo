"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { StarField } from "@/components/landing/star-field";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, ListChecks, FileText, MousePointerClick, Zap } from "lucide-react";
import { useState } from "react";

// Initial animations
const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
};

const staggerContainer = {
    animate: {
        transition: {
            staggerChildren: 0.1
        }
    }
};

export default function LandingPage() {
    const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);

    return (
        <div className="relative min-h-screen flex flex-col overflow-hidden text-neutral-100 bg-[#0a0a0a] selection:bg-purple-500/30">

            {/* Dynamic Background */}
            <div className="fixed inset-0 z-0">
                <StarField />
                {/* Subtle colored blobs for "Antigravity" vibe */}
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px] mix-blend-screen" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-900/20 rounded-full blur-[120px] mix-blend-screen" />
            </div>

            {/* Header */}
            <header className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                            <span className="font-bold text-white text-xs">R</span>
                        </div>
                        <span className="font-semibold text-lg tracking-tight">Ritmo</span>
                    </div>

                    <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-400">
                        <a href="#funciona" className="hover:text-white transition-colors">Como funciona</a>
                        <a href="#features" className="hover:text-white transition-colors">Funcionalidades</a>
                        <a href="#pricing" className="hover:text-white transition-colors">Preços</a>
                    </nav>

                    <div className="flex items-center gap-4">
                        <Link href="/login" className="text-sm font-medium text-neutral-300 hover:text-white transition-colors">
                            Entrar
                        </Link>
                        <Link href="/signup">
                            <Button size="sm" className="bg-white text-black hover:bg-neutral-200 font-semibold rounded-full px-5">
                                Começar agora
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="relative z-10 flex-1 flex flex-col">

                {/* HERO SECTION */}
                <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6">
                    <motion.div
                        initial="initial"
                        animate="animate"
                        variants={staggerContainer}
                        className="container mx-auto max-w-5xl text-center"
                    >
                        <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs font-medium text-purple-300 mb-8 backdrop-blur-sm">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                            </span>
                            Novidade: Captura automática por BCC
                        </motion.div>

                        <motion.h1 variants={fadeInUp} className="text-5xl md:text-7xl font-bold tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-neutral-500">
                            Follow-up automático <br className="hidden md:block" />
                            para orçamentos.
                        </motion.h1>

                        <motion.p variants={fadeInUp} className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                            Sem perder oportunidades. O Ritmo automatiza a cadência de contacto para que feche mais negócios, sem parecer um robô.
                        </motion.p>

                        <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link href="/signup">
                                <Button size="lg" className="h-12 px-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium text-base shadow-lg shadow-purple-500/25 transition-all hover:scale-105">
                                    Começar Trial Grátis
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </Link>
                            <Button variant="outline" size="lg" className="h-12 px-8 rounded-full border-neutral-700 hover:bg-white/5 hover:text-white text-neutral-300">
                                Ver demonstração
                            </Button>
                        </motion.div>

                        <motion.div variants={fadeInUp} className="mt-12 text-sm text-neutral-500 flex items-center justify-center gap-6">
                            <span className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-emerald-500" /> Sem cartão
                            </span>
                            <span className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-emerald-500" /> 14 dias trial
                            </span>
                            <span className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-emerald-500" /> Cancel anytime
                            </span>
                        </motion.div>
                    </motion.div>
                </section>

                {/* FEATURES GRID (Glassmorphism) */}
                <section id="features" className="py-24 px-6 relative">
                    <div className="container mx-auto max-w-6xl">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-bold mb-6">O seu cockpit de vendas.</h2>
                            <p className="text-neutral-400 max-w-2xl mx-auto">
                                Substitua o caos do Excel e do Outlook por um sistema que trabalha por si.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6">
                            {[
                                {
                                    icon: ListChecks,
                                    title: "Ações de Hoje",
                                    desc: "Diga adeus à paralisia de decisão. O Ritmo diz-lhe exatamente quem contactar agora."
                                },
                                {
                                    icon: Zap,
                                    title: "Automação Humana",
                                    desc: "Emails que parecem escritos por si. Pausa automática se o cliente responder."
                                },
                                {
                                    icon: FileText,
                                    title: "Contexto Total",
                                    desc: "A proposta está sempre à mão. Nunca mais procure PDFs em pastas perdidas."
                                }
                            ].map((feature, i) => (
                                <div
                                    key={i}
                                    className="group p-8 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 backdrop-blur-sm"
                                >
                                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-white/5">
                                        <feature.icon className="w-6 h-6 text-purple-400" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                                    <p className="text-neutral-400 leading-relaxed">
                                        {feature.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* PRICING */}
                <section id="pricing" className="py-24 px-6 border-t border-white/5 bg-black/40">
                    <div className="container mx-auto max-w-6xl">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-bold mb-6">Planos simples.</h2>
                            <p className="text-neutral-400">Comece gratuitamente. Cresça quando precisar.</p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-center">

                            {/* Free Plan */}
                            <div className="p-8 rounded-2xl border border-white/10 bg-transparent text-neutral-400 hover:border-white/20 transition-all">
                                <h3 className="text-xl font-medium text-white mb-2">Gratuito</h3>
                                <div className="text-4xl font-bold text-white mb-6">€0</div>
                                <ul className="space-y-4 mb-8 text-sm">
                                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-neutral-500" /> 5 envios / mês</li>
                                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-neutral-500" /> Modo manual</li>
                                    <li className="flex items-center gap-2 text-neutral-600"><Check className="w-4 h-4" /> Sem automação</li>
                                </ul>
                                <Link href="/signup">
                                    <Button variant="outline" className="w-full rounded-full border-neutral-700 hover:bg-neutral-800 hover:text-white">
                                        Começar Grátis
                                    </Button>
                                </Link>
                            </div>

                            {/* Pro Plan (Highlighted) */}
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                className="relative p-10 rounded-2xl border border-purple-500/30 bg-gradient-to-b from-purple-900/10 to-transparent backdrop-blur-md shadow-2xl shadow-purple-900/20"
                            >
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-xs font-bold text-white uppercase tracking-wider">
                                    Mais Popular
                                </div>
                                <h3 className="text-xl font-medium text-purple-200 mb-2">Starter / Pro</h3>
                                <div className="text-4xl font-bold text-white mb-6">€29<span className="text-lg text-neutral-400 font-normal">/mês</span></div>
                                <ul className="space-y-4 mb-8 text-sm text-neutral-200">
                                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-purple-400" /> Até 250 envios / mês</li>
                                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-purple-400" /> Emails automáticos</li>
                                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-purple-400" /> Captura por BCC</li>
                                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-purple-400" /> Suporte prioritário</li>
                                </ul>
                                <Link href="/signup">
                                    <Button className="w-full rounded-full h-12 bg-white text-black hover:bg-neutral-200 font-semibold">
                                        Começar Trial (14 dias)
                                    </Button>
                                </Link>
                            </motion.div>

                            {/* Enterprise */}
                            <div className="p-8 rounded-2xl border border-white/10 bg-transparent text-neutral-400 hover:border-white/20 transition-all">
                                <h3 className="text-xl font-medium text-white mb-2">Enterprise</h3>
                                <div className="text-2xl font-bold text-white mb-6">Sob consulta</div>
                                <ul className="space-y-4 mb-8 text-sm">
                                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-neutral-500" /> Volume ilimitado</li>
                                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-neutral-500" /> Onboarding dedicado</li>
                                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-neutral-500" /> API Access</li>
                                </ul>
                                <Button variant="outline" className="w-full rounded-full border-neutral-700 hover:bg-neutral-800 hover:text-white">
                                    Falar com Vendas
                                </Button>
                            </div>

                        </div>
                    </div>
                </section>

                {/* CTA FINAL */}
                <section className="py-32 px-6 text-center relative overflow-hidden">
                    <div className="container mx-auto relative z-10 max-w-4xl">
                        <h2 className="text-4xl md:text-6xl font-bold mb-8 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-500">
                            Pronto para levantar voo?
                        </h2>
                        <p className="text-xl text-neutral-400 mb-12 max-w-2xl mx-auto">
                            Junte-se a centenas de empresas que recuperaram o controlo do seu funil de vendas com o Ritmo.
                        </p>
                        <Link href="/signup">
                            <Button size="lg" className="h-14 px-10 rounded-full bg-white text-black hover:bg-gray-200 text-lg font-semibold shadow-xl shadow-white/10">
                                Criar conta gratuita
                            </Button>
                        </Link>
                    </div>

                    {/* Bottom glow */}
                    <div className="absolute bottom-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />
                </section>

            </main>

            <footer className="py-8 border-t border-white/5 bg-black text-center text-sm text-neutral-600">
                <p>© 2026 Ritmo. Todos os direitos reservados.</p>
                <div className="flex justify-center gap-6 mt-4">
                    <a href="#" className="hover:text-neutral-400">Privacidade</a>
                    <a href="#" className="hover:text-neutral-400">Termos</a>
                    <a href="#" className="hover:text-neutral-400">Contacto</a>
                </div>
            </footer>

        </div>
    );
}
