"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, ListChecks, FileText, Zap, Bell, Mail, FileSpreadsheet, X, Gift, Users, BarChart3, Shield, Headphones } from "lucide-react";
import { AntigravityParticles } from "@/components/landing/antigravity-particles";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Footer, CookieBanner } from "@/components/marketing";

// Animation variants
const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
};

const staggerContainer = {
    animate: {
        transition: {
            staggerChildren: 0.15
        }
    }
};

export default function LandingPage() {
    return (
        <div className="flex min-h-screen flex-col bg-white text-zinc-950 font-sans selection:bg-blue-100 selection:text-blue-900">

            <AntigravityParticles />

            {/* Header */}
            <header className="fixed top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-transparent">
                <div className="container mx-auto flex h-16 items-center justify-between px-6">
                    <div className="flex items-center gap-2">
                        {/* Antigravity-like minimalist logo text */}
                        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
                            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent tracking-tight">Ritmo</span>
                        </Link>
                    </div>

                    <nav className="hidden items-center gap-10 text-sm font-medium text-zinc-600 md:flex">
                        <a href="#how-it-works" className="hover:text-black transition-colors">Como funciona</a>
                        <a href="#cockpit" className="hover:text-black transition-colors">Cockpit</a>
                        <a href="#pricing" className="hover:text-black transition-colors">Preços</a>
                        <a href="#faq" className="hover:text-black transition-colors">FAQ</a>
                    </nav>

                    <div className="flex items-center gap-4">
                        <Link href="/login" className="text-sm font-medium text-zinc-600 transition-colors hover:text-black">
                            Entrar
                        </Link>
                        <Link href="/signup">
                            <Button className="rounded-full bg-black text-white hover:bg-zinc-800 px-6 font-medium">
                                Começar Trial
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="flex-1 relative z-10 pt-32">

                {/* HERO SECTION */}
                <section className="relative px-6 pb-20 md:pb-32 text-center">
                    <motion.div
                        initial="initial"
                        animate="animate"
                        variants={staggerContainer}
                        className="container mx-auto max-w-5xl"
                    >
                        {/* Tagline */}
                        <motion.div variants={fadeInUp} className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-75"></span>
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
                            </span>
                            Follow-up de orçamentos, sem CRM pesado
                        </motion.div>

                        <motion.h1 variants={fadeInUp} className="mb-8 text-5xl md:text-7xl font-bold tracking-tighter text-zinc-900 leading-[1]">
                            Envie orçamentos como sempre. <br />
                            O Ritmo faz o follow-up.
                        </motion.h1>

                        <motion.p variants={fadeInUp} className="mx-auto mb-10 max-w-2xl text-xl leading-relaxed text-zinc-600 font-light">
                            Pare de perder negócios por falta de tempo. O Ritmo gere a cadência dos seus orçamentos para que a sua equipa se foque em fechar vendas.
                        </motion.p>

                        <motion.div variants={fadeInUp} className="flex flex-col items-center justify-center gap-4 sm:flex-row mb-6">
                            <Link href="/signup">
                                <Button size="lg" className="h-14 rounded-full px-10 text-lg bg-black text-white hover:bg-zinc-800 shadow-xl transition-all hover:scale-105">
                                    Começar trial grátis
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </Link>
                            <Link href="/signup?provider=google">
                                <Button size="lg" variant="outline" className="h-14 rounded-full px-10 text-lg border-zinc-300 hover:bg-zinc-50 shadow-sm transition-all hover:scale-105 gap-3">
                                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                    Continuar com Google
                                </Button>
                            </Link>
                        </motion.div>

                        {/* Microcopy */}
                        <motion.p variants={fadeInUp} className="text-sm text-zinc-500 mb-20">
                            14 dias · 20 envios · sem cartão
                        </motion.p>
                    </motion.div>
                </section>

                {/* WORKS WITH WHAT YOU USE */}
                <section className="py-16 px-6 bg-white">
                    <div className="container mx-auto max-w-4xl">
                        <div className="text-center mb-10">
                            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 mb-3">
                                Funciona com o que já usa
                            </h2>
                            <p className="text-lg text-zinc-500">
                                Sem CRM pesado. Sem mudar processos.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            <div className="flex flex-col items-center text-center p-6 rounded-xl bg-zinc-50 border border-zinc-100">
                                <div className="w-14 h-14 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                                    <FileSpreadsheet className="w-7 h-7" />
                                </div>
                                <h3 className="text-lg font-semibold text-zinc-900 mb-2">Excel / Word</h3>
                                <p className="text-sm text-zinc-500">Continue a fazer orçamentos nas suas ferramentas habituais.</p>
                            </div>

                            <div className="flex flex-col items-center text-center p-6 rounded-xl bg-zinc-50 border border-zinc-100">
                                <div className="w-14 h-14 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                                    <Mail className="w-7 h-7" />
                                </div>
                                <h3 className="text-lg font-semibold text-zinc-900 mb-2">Outlook / Gmail</h3>
                                <p className="text-sm text-zinc-500">Envie emails como sempre. O Ritmo trata do follow-up.</p>
                            </div>

                            <div className="flex flex-col items-center text-center p-6 rounded-xl bg-zinc-50 border border-zinc-100">
                                <div className="w-14 h-14 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                                    <FileText className="w-7 h-7" />
                                </div>
                                <h3 className="text-lg font-semibold text-zinc-900 mb-2">PDFs</h3>
                                <p className="text-sm text-zinc-500">Anexe propostas ao orçamento. Sempre à mão quando precisar.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* HOW IT WORKS (3 Steps) */}
                <section id="how-it-works" className="py-24 px-6 bg-zinc-50 border-y border-zinc-100">
                    <div className="container mx-auto max-w-7xl">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-zinc-900 mb-4">
                                Entra no seu processo atual em 3 passos.
                            </h2>
                            <p className="text-xl text-zinc-500 max-w-3xl mx-auto">
                                Sem configurações complexas. Continua a usar Excel/Word/Sistemas e Outlook/Gmail – o Ritmo só organiza o follow-up.
                            </p>
                        </div>

                        <div className="max-w-7xl mx-auto space-y-32 mt-20">
                            {/* Step 1: Text Left (30%), Image Right (70%) */}
                            <div className="flex flex-col md:flex-row items-center gap-8 lg:gap-16">
                                <div className="w-full md:w-[30%] space-y-6 text-left">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-100 text-zinc-900 font-bold text-lg mb-2">1</div>
                                    <h3 className="text-3xl md:text-4xl font-bold text-zinc-900 tracking-tight leading-tight">
                                        Registe o orçamento
                                    </h3>
                                    <p className="text-lg text-zinc-600 leading-relaxed">
                                        <strong className="text-zinc-900 font-semibold block mb-2">Cliente, valor e referência.</strong>
                                        Basta colar o link da proposta ou anexar o PDF mais tarde. Simples e rápido.
                                    </p>
                                </div>
                                <div className="w-full md:w-[70%]">
                                    <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-zinc-200 shadow-2xl bg-zinc-900 transform transition-all duration-700 hover:shadow-3xl hover:-translate-y-1">
                                        <Image
                                            src="/landing_step1_v2.png"
                                            alt="Register Quote"
                                            fill
                                            className="object-cover object-top"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Step 2: Image Left (70%), Text Right (30%) */}
                            <div className="flex flex-col md:flex-row-reverse items-center gap-8 lg:gap-16">
                                <div className="w-full md:w-[30%] space-y-6 text-left">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-100 text-zinc-900 font-bold text-lg mb-2">2</div>
                                    <h3 className="text-3xl md:text-4xl font-bold text-zinc-900 tracking-tight leading-tight">
                                        Envie como sempre
                                    </h3>
                                    <p className="text-lg text-zinc-600 leading-relaxed">
                                        <strong className="text-zinc-900 font-semibold block mb-2">Continue com as suas ferramentas.</strong>
                                        Quando enviar, marque como &quot;Enviado&quot; no Ritmo com apenas 1 clique.
                                    </p>
                                </div>
                                <div className="w-full md:w-[70%]">
                                    <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-zinc-200 shadow-2xl bg-zinc-900 transform transition-all duration-700 hover:shadow-3xl hover:-translate-y-1">
                                        <Image
                                            src="/landing_step2_v2.png"
                                            alt="Send as Usual"
                                            fill
                                            className="object-cover object-top"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Step 3: Text Left (30%), Image Right (70%) */}
                            <div className="flex flex-col md:flex-row items-center gap-8 lg:gap-16">
                                <div className="w-full md:w-[30%] space-y-6 text-left">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-100 text-zinc-900 font-bold text-lg mb-2">3</div>
                                    <h3 className="text-3xl md:text-4xl font-bold text-zinc-900 tracking-tight leading-tight">
                                        Faça o que aparece hoje
                                    </h3>
                                    <p className="text-lg text-zinc-600 leading-relaxed">
                                        <strong className="text-zinc-900 font-semibold block mb-2">Foco total na ação.</strong>
                                        Emails prontos a enviar e chamadas com o contexto certo. Nada de procurar ficheiros perdidos.
                                    </p>
                                </div>
                                <div className="w-full md:w-[70%]">
                                    <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-zinc-200 shadow-2xl bg-zinc-900 transform transition-all duration-700 hover:shadow-3xl hover:-translate-y-1">
                                        <Image
                                            src="/landing_step3_v2.png"
                                            alt="Action Today"
                                            fill
                                            className="object-cover object-top"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 text-center">
                            <p className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-50 text-zinc-600 rounded-full text-sm font-medium border border-zinc-200 transition-colors hover:bg-zinc-100 hover:text-zinc-900">
                                <Zap className="w-4 h-4" />
                                Sem email/telefone? O Ritmo cria tarefas manuais para não travar.
                            </p>
                        </div>
                    </div>
                </section>

                {/* COCKPIT SECTION */}
                <section id="cockpit" className="py-32 px-6">
                    <div className="container mx-auto max-w-7xl">
                        <div className="grid lg:grid-cols-2 gap-16 items-center">
                            <div>
                                <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-zinc-900 mb-8 leading-tight">
                                    O cockpit de follow-up que faltava.
                                </h2>
                                <div className="space-y-8">
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                            <ListChecks className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-zinc-900 mb-1">Ações de hoje</h3>
                                            <p className="text-zinc-600">Lista curta. Prioridade por valor. Um clique para concluir.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-zinc-900 mb-1">Proposta sempre à mão</h3>
                                            <p className="text-zinc-600">PDF ou link ligado ao orçamento — perfeito para o D+7.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                            <Bell className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-zinc-900 mb-1">‘Sem resposta’ vira ação</h3>
                                            <p className="text-zinc-600">Gere a próxima ação recomendada em 1 clique.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-zinc-200 bg-black aspect-[16/10] group">
                                {/* Video/Animation Loop */}
                                <video
                                    src="/workflow_demo.webm"
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    className="object-cover w-full h-full opacity-90"
                                    poster="/workflow_demo.webp"
                                />
                                {/* Overlay reflections to match glass style */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* PRICING */}
                <section id="pricing" className="py-24 px-6 bg-zinc-50 border-t border-zinc-100">
                    <div className="container mx-auto max-w-7xl">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-zinc-900 mb-4">
                                Planos para PMEs que enviam orçamentos.
                            </h2>
                            <p className="text-lg text-zinc-500 max-w-2xl mx-auto mb-2">
                                Sem CRM pesado. Comece grátis e só pague quando o Ritmo já estiver a recuperar respostas.
                            </p>
                            <p className="text-sm text-zinc-400">
                                Envio = apenas o 1º envio por orçamento (reenvios não contam).
                            </p>
                        </div>

                        <div className="grid lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
                            {/* Free Plan */}
                            <div className="relative rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-zinc-300 flex flex-col">
                                <h3 className="text-xl font-bold text-zinc-900 mb-1">Free</h3>
                                <p className="text-zinc-500 text-xs mb-4">5 envios/mês · 1 utilizador</p>
                                <div className="mb-6">
                                    <span className="text-4xl font-bold text-zinc-900 tracking-tight">€0</span>
                                    <span className="text-zinc-500 text-sm font-medium">/mês</span>
                                </div>
                                <p className="text-sm text-zinc-600 mb-6 min-h-[40px]">
                                    Para testar o essencial, em modo manual.
                                </p>
                                <ul className="space-y-3 mb-8 text-sm flex-1">
                                    <li className="flex items-start gap-2 text-zinc-600">
                                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                        Cadência e tarefas (manual)
                                    </li>
                                    <li className="flex items-start gap-2 text-zinc-600">
                                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                        Templates e scripts
                                    </li>
                                    <li className="flex items-start gap-2 text-zinc-400 opacity-60">
                                        <X className="w-4 h-4 mt-0.5 shrink-0" />
                                        Emails automáticos
                                    </li>
                                    <li className="flex items-start gap-2 text-zinc-400 opacity-60">
                                        <X className="w-4 h-4 mt-0.5 shrink-0" />
                                        Captura por BCC
                                    </li>
                                </ul>
                                <Link href="/signup">
                                    <Button variant="outline" className="w-full rounded-full text-sm h-11 border-zinc-300 hover:bg-zinc-50 text-zinc-900 font-medium">
                                        Continuar grátis
                                    </Button>
                                </Link>
                            </div>

                            {/* Starter Plan - Popular */}
                            <div className="relative rounded-3xl border border-indigo-100 bg-white p-8 shadow-2xl shadow-indigo-500/10 z-10 transform scale-105 ring-1 ring-indigo-500/20 flex flex-col">
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                    <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg shadow-blue-600/20 tracking-wide uppercase">
                                        Mais Popular
                                    </span>
                                </div>
                                <h3 className="text-xl font-bold text-zinc-900 mb-1 mt-2">Starter</h3>
                                <p className="text-zinc-500 text-xs mb-4">80 envios/mês · 2 utilizadores</p>
                                <div className="mb-6">
                                    <span className="text-4xl font-bold text-slate-900 tracking-tight">€39</span>
                                    <span className="text-zinc-500 text-sm font-medium">/mês</span>
                                </div>
                                <p className="text-sm text-zinc-600 mb-6 font-medium min-h-[40px]">
                                    Para o dono + 1 apoio, com automação.
                                </p>
                                <ul className="space-y-3 mb-8 text-sm flex-1">
                                    <li className="flex items-start gap-2 text-zinc-600">
                                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                        Emails automáticos (D+1, D+3)
                                    </li>
                                    <li className="flex items-start gap-2 text-zinc-600">
                                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                        D+7 com chamada guiada + proposta a 1 clique
                                    </li>
                                    <li className="flex items-start gap-2 text-zinc-600">
                                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                        Captura de proposta por BCC (PDF/link)
                                    </li>
                                    <li className="flex items-start gap-2 text-zinc-600">
                                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                        Templates por etapa
                                    </li>
                                    <li className="flex items-start gap-2 text-zinc-600">
                                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                        Scoreboard (rotina e consistência)
                                    </li>
                                </ul>
                                <Link href="/signup">
                                    <Button className="w-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-sm h-11 text-base shadow-lg shadow-blue-600/20 text-white border-0 font-medium">
                                        Escolher Starter
                                    </Button>
                                </Link>
                            </div>

                            {/* Pro Plan */}
                            <div className="relative rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-zinc-300 flex flex-col">
                                <h3 className="text-xl font-bold text-zinc-900 mb-1">Pro</h3>
                                <p className="text-zinc-500 text-xs mb-4">250 envios/mês · 5 utilizadores</p>
                                <div className="mb-6">
                                    <span className="text-4xl font-bold text-zinc-900 tracking-tight">€99</span>
                                    <span className="text-zinc-500 text-sm font-medium">/mês</span>
                                </div>
                                <p className="text-sm text-zinc-600 mb-6 min-h-[40px]">
                                    Para equipas e maior volume, com controlo.
                                </p>
                                <ul className="space-y-3 mb-8 text-sm flex-1">
                                    <li className="flex items-start gap-2 text-zinc-600">
                                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                        Tudo do Starter
                                    </li>
                                    <li className="flex items-start gap-2 text-zinc-600">
                                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                        Benchmark por setor
                                    </li>
                                    <li className="flex items-start gap-2 text-zinc-600">
                                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                        Relatórios (pipeline, aging, follow-up rate)
                                    </li>
                                    <li className="flex items-start gap-2 text-zinc-600">
                                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                        Regras avançadas (prioridade/atribuição)
                                    </li>
                                    <li className="flex items-start gap-2 text-zinc-600">
                                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                        Suporte prioritário
                                    </li>
                                </ul>
                                <Link href="/signup">
                                    <Button variant="outline" className="w-full rounded-full text-sm h-11 border-zinc-300 hover:bg-zinc-50 text-zinc-900 font-medium">
                                        Escolher Pro
                                    </Button>
                                </Link>
                            </div>

                            {/* Enterprise Plan */}
                            <div className="relative rounded-3xl border border-zinc-300 bg-zinc-50/50 p-8 shadow-sm transition-all duration-300 hover:bg-zinc-50/80 flex flex-col">
                                <h3 className="text-xl font-bold text-zinc-900 mb-1">Enterprise</h3>
                                <p className="text-zinc-500 text-xs mb-4">Limites personalizados</p>
                                <div className="mb-6">
                                    <span className="text-2xl font-bold text-zinc-900">Sob consulta</span>
                                </div>
                                <p className="text-sm text-zinc-600 mb-6 min-h-[40px]">
                                    Para operações maiores e requisitos especiais.
                                </p>
                                <ul className="space-y-3 mb-8 text-sm flex-1">
                                    <li className="flex items-start gap-2 text-zinc-600">
                                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                        Utilizadores ilimitados
                                    </li>
                                    <li className="flex items-start gap-2 text-zinc-600">
                                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                        Onboarding assistido + migração
                                    </li>
                                    <li className="flex items-start gap-2 text-zinc-600">
                                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                        Governance avançada (perfis, auditoria)
                                    </li>
                                    <li className="flex items-start gap-2 text-zinc-600">
                                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                        Integrações/API + export avançado
                                    </li>
                                    <li className="flex items-start gap-2 text-zinc-600">
                                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                        SLA e suporte dedicado
                                    </li>
                                </ul>
                                <a href="mailto:ola@ritmo.app">
                                    <Button variant="outline" className="w-full rounded-full text-sm h-11 border-zinc-400 hover:bg-zinc-200 text-zinc-900 font-medium">
                                        Falar connosco
                                    </Button>
                                </a>
                            </div>
                        </div>

                        {/* Nota sobre envios */}
                        <div className="mt-10 p-4 rounded-xl bg-blue-50 border border-blue-100 max-w-3xl mx-auto">
                            <p className="text-sm text-blue-800 text-center">
                                <strong>Como contamos &quot;envios&quot;:</strong> conta apenas o primeiro envio de cada orçamento quando marca como Enviado. Reenvios e ajustes não consomem quota.
                            </p>
                        </div>

                        {/* Como escolher */}
                        <div className="mt-8 text-center text-sm text-zinc-500">
                            <p className="font-medium text-zinc-700 mb-2">Como escolher?</p>
                            <p>1 pessoa + poucos orçamentos: <strong>Free</strong> · 2 pessoas + automação: <strong>Starter</strong> · Equipa + benchmark: <strong>Pro</strong></p>
                        </div>
                    </div>
                </section>

                {/* FAQ */}
                <section id="faq" className="py-24 px-6 bg-white border-t border-zinc-100">
                    <div className="container mx-auto max-w-3xl">
                        <h2 className="text-3xl font-bold text-center mb-12 text-zinc-900">Perguntas Frequentes</h2>
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="item-1">
                                <AccordionTrigger>O Ritmo vai &quot;parecer robô&quot; com emails automáticos?</AccordionTrigger>
                                <AccordionContent>
                                    Não. Os templates são curtos, humanos e editáveis. E o Ritmo alterna email com ações de chamada (D+7) para evitar pressão excessiva.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-2">
                                <AccordionTrigger>O que conta como &quot;envio&quot;?</AccordionTrigger>
                                <AccordionContent>
                                    Conta apenas o 1º envio por orçamento quando o marca como Enviado. Reenvios não contam. Isto evita medo de testar e ajustar.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-3">
                                <AccordionTrigger>Preciso anexar a proposta no Ritmo para começar?</AccordionTrigger>
                                <AccordionContent>
                                    Não. Pode continuar a criar o orçamento em Excel/Word e enviar por Outlook/Gmail. O Ritmo entra para garantir o follow-up. A proposta pode ser adicionada depois (link ou upload).
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-4">
                                <AccordionTrigger>Como funciona a captura de propostas por BCC?</AccordionTrigger>
                                <AccordionContent>
                                    Basta colocar o endereço BCC do Ritmo no email de envio. Se a proposta vier em PDF (ou link), o Ritmo associa ao orçamento automaticamente.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-5">
                                <AccordionTrigger>Posso usar sem automação?</AccordionTrigger>
                                <AccordionContent>
                                    Sim. O plano Free funciona em modo manual: o Ritmo cria a cadência e as tarefas, mas você decide quando enviar.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-6">
                                <AccordionTrigger>Posso ter mais do que um utilizador?</AccordionTrigger>
                                <AccordionContent>
                                    Sim. Free tem 1 utilizador, Starter 2, Pro 5. Se precisar de mais, fale connosco.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-7">
                                <AccordionTrigger>O trial é mesmo sem cartão?</AccordionTrigger>
                                <AccordionContent>
                                    Sim. 14 dias, 20 envios, 2 utilizadores, sem cartão. No fim, escolhe se quer continuar no Free ou fazer upgrade.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-8">
                                <AccordionTrigger>Posso cancelar quando quiser?</AccordionTrigger>
                                <AccordionContent>
                                    Sim. Pode gerir a subscrição na página de faturação e cancelar a qualquer momento.
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
                </section>

                {/* BOTTOM CTA */}
                <section className="relative py-32 px-6 bg-black text-white overflow-hidden">
                    <AntigravityParticles />
                    <div className="relative z-10 container mx-auto text-center max-w-4xl">
                        <h2 className="mb-8 text-5xl md:text-7xl font-bold tracking-tighter">
                            Comece hoje.
                        </h2>
                        <p className="mb-12 text-xl text-zinc-400 max-w-2xl mx-auto">
                            Em 10 minutos está a enviar e acompanhar follow-ups.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
                            <Link href="/signup">
                                <Button size="lg" className="h-16 rounded-full px-12 text-lg bg-white text-black hover:bg-zinc-200 font-bold transition-transform hover:scale-105">
                                    Começar trial grátis
                                </Button>
                            </Link>
                            <Link href="/signup?provider=google">
                                <Button size="lg" variant="outline" className="h-16 rounded-full px-12 text-lg border-zinc-600 text-white hover:bg-zinc-800 font-bold transition-transform hover:scale-105 gap-3">
                                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                    Continuar com Google
                                </Button>
                            </Link>
                        </div>
                        <span className="text-zinc-500 text-sm">14 dias · 20 envios · sem cartão</span>
                    </div>
                </section>

            </main>

            <Footer />
            <CookieBanner />
        </div>
    );
}
