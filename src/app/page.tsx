"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui";
import { ArrowRight, Check, ListChecks, FileText, Zap, Bell, X } from "lucide-react";
import { Logo } from "@/components/brand";
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

// Component to handle signed_out toast (needs Suspense boundary)
function SignedOutToast() {
    const searchParams = useSearchParams();

    useEffect(() => {
        if (searchParams.get("signed_out") === "1") {
            toast.success("Sessão terminada.");
            // Clean up the URL
            window.history.replaceState({}, "", "/");
        }
    }, [searchParams]);

    return null;
}

export default function LandingPage() {

    return (
        <div className="flex min-h-screen flex-col bg-[#FAFAF9] bg-hero-premium text-zinc-950 font-sans selection:bg-blue-100 selection:text-blue-900">

            {/* Handle signed_out toast with Suspense boundary */}
            <Suspense fallback={null}>
                <SignedOutToast />
            </Suspense>

            {/* Header */}
            <header className="fixed top-0 z-50 w-full bg-[#FAFAF9]/80 backdrop-blur-md border-b border-transparent">
                <div className="container mx-auto flex h-16 items-center justify-between px-6">
                    <Logo href="/" size="md" />

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
                <section className="relative px-6 pb-20 md:pb-32">
                    <div className="container mx-auto max-w-7xl">
                        <div className="max-w-4xl mx-auto">
                            <motion.div
                                initial="initial"
                                animate="animate"
                                variants={staggerContainer}
                                className="text-center"
                            >
                                <motion.h1 variants={fadeInUp} className="mb-8 text-5xl md:text-7xl font-medium tracking-tighter text-zinc-900 leading-[1]">
                                    Envie orçamentos como sempre. <br />
                                    O Ritmo faz o follow-up.
                                </motion.h1>

                                <motion.p variants={fadeInUp} className="mb-10 max-w-2xl mx-auto text-xl leading-relaxed text-zinc-600 font-light">
                                    Pare de perder negócios por falta de tempo. O Ritmo gere a cadência dos seus orçamentos para que a sua equipa se foque em fechar vendas.
                                </motion.p>

                                <motion.div variants={fadeInUp} className="flex flex-col items-center justify-center gap-4 sm:flex-row mb-6">
                                    <Link href="/signup">
                                        <Button size="lg" className="h-14 rounded-full px-10 text-lg bg-gradient-to-r from-blue-400 to-emerald-400 hover:from-blue-500 hover:to-emerald-500 text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 hover:shadow-xl">
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

                                <motion.p variants={fadeInUp} className="text-sm text-zinc-500">
                                    14 dias · 20 envios · sem cartão
                                </motion.p>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* WORKS WITH WHAT YOU USE */}
                <section className="py-24 px-6 bg-zinc-50 border-y border-zinc-100 mb-[-1px]">
                    <div className="container mx-auto max-w-6xl">
                        <div className="relative rounded-3xl bg-zinc-900 overflow-hidden shadow-2xl ring-1 ring-white/10 group">

                            {/* Animated Background Gradients */}
                            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4 pointer-events-none" />

                            <div className="relative z-10 grid lg:grid-cols-2 gap-12 p-8 md:p-16 items-center">
                                {/* Left: Text Content */}
                                <div className="text-left space-y-8">

                                    <div className="space-y-4">
                                        <h2 className="text-3xl md:text-5xl font-medium tracking-tighter text-white leading-[1.1]">
                                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Funciona com o que</span> <br />
                                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">você já usa.</span>
                                        </h2>
                                        <p className="text-lg text-zinc-400 max-w-md leading-relaxed">
                                            Sem CRM pesado. Sem mudar processos. <br />
                                            Simplesmente conecte o Ritmo ao seu fluxo de trabalho habitual e deixe o follow-up connosco.
                                        </p>
                                    </div>

                                    <Link href="/signup">
                                        <Button className="mt-4 rounded-full bg-white text-zinc-900 hover:bg-zinc-100 font-medium px-8 h-12">
                                            Começar agora
                                            <ArrowRight className="ml-2 w-4 h-4" />
                                        </Button>
                                    </Link>
                                </div>

                                {/* Right: Orbit Visual */}
                                <div className="relative flex items-center justify-center h-[450px] w-full perspective-[1000px]">

                                    {/* Orbits */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="absolute w-[220px] h-[220px] rounded-full border border-white/5 animate-[spin_40s_linear_infinite]" />
                                        <div className="absolute w-[340px] h-[340px] rounded-full border border-white/5 animate-[spin_60s_linear_infinite_reverse]" />
                                        <div className="absolute w-[460px] h-[460px] rounded-full border border-white/5 opacity-40 animate-[spin_80s_linear_infinite]" />
                                    </div>

                                    {/* Center Hub - 3D R Logo */}
                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        whileInView={{ scale: 1, opacity: 1 }}
                                        animate={{
                                            scale: [1, 1.05, 1],
                                            filter: [
                                                "drop-shadow(0 0 20px rgba(59,130,246,0.3))",
                                                "drop-shadow(0 0 30px rgba(59,130,246,0.5))",
                                                "drop-shadow(0 0 20px rgba(59,130,246,0.3))"
                                            ]
                                        }}
                                        transition={{
                                            duration: 0.5,
                                            scale: { duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 },
                                            filter: { duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }
                                        }}
                                        className="relative z-20 flex items-center justify-center"
                                    >
                                        <Image
                                            src="/brand/r-3d-transparent.png"
                                            alt="Ritmo"
                                            width={120}
                                            height={120}
                                            className="object-contain mix-blend-lighten"
                                        />
                                    </motion.div>

                                    {/* Orbiting Elements - Individual Icons - Using Reliable Wikipedia Sources */}

                                    {/* Excel - Inner Orbit */}
                                    <motion.div
                                        className="absolute z-10 w-12 h-12 flex items-center justify-center"
                                        style={{ top: '28%', left: '35%' }}
                                        animate={{ y: [0, -10, 0] }}
                                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                    >
                                        <img src="https://img.icons8.com/fluency/96/microsoft-excel-2019.png" alt="Excel" className="w-10 h-10 drop-shadow-lg" />
                                    </motion.div>

                                    {/* Word - Middle Orbit */}
                                    <motion.div
                                        className="absolute z-10 w-12 h-12 flex items-center justify-center"
                                        style={{ bottom: '25%', left: '20%' }}
                                        animate={{ y: [0, 10, 0] }}
                                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                                    >
                                        <img src="https://img.icons8.com/fluency/96/microsoft-word-2019.png" alt="Word" className="w-10 h-10 drop-shadow-lg" />
                                    </motion.div>

                                    {/* Gmail - Middle Orbit */}
                                    <motion.div
                                        className="absolute z-10 w-12 h-12 flex items-center justify-center"
                                        style={{ top: '20%', right: '25%' }}
                                        animate={{ y: [0, -12, 0] }}
                                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                                    >
                                        <img src="https://img.icons8.com/fluency/96/gmail-new.png" alt="Gmail" className="w-10 h-10 drop-shadow-lg" />
                                    </motion.div>

                                    {/* Outlook - Outer Orbit */}
                                    <motion.div
                                        className="absolute z-10 w-12 h-12 flex items-center justify-center"
                                        style={{ bottom: '35%', right: '15%' }}
                                        animate={{ y: [0, 15, 0] }}
                                        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
                                    >
                                        <img src="https://img.icons8.com/fluency/96/microsoft-outlook-2019.png" alt="Outlook" className="w-10 h-10 drop-shadow-lg" />
                                    </motion.div>

                                    {/* PDF - Outer Orbit */}
                                    <motion.div
                                        className="absolute z-10 w-12 h-12 flex items-center justify-center"
                                        style={{ top: '10%', left: '45%' }}
                                        animate={{ y: [0, -8, 0] }}
                                        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                                    >
                                        <img src="https://img.icons8.com/fluency/96/adobe-acrobat.png" alt="PDF" className="w-10 h-10 drop-shadow-lg" />
                                    </motion.div>

                                    {/* Decorative Particles */}
                                    <div className="absolute top-1/4 right-1/4 w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse opacity-50" />
                                    <div className="absolute bottom-1/3 right-1/3 w-1 h-1 bg-emerald-400 rounded-full animate-pulse delay-700 opacity-50" />
                                    <div className="absolute top-1/3 left-1/4 w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse delay-1000 opacity-50" />

                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* HOW IT WORKS (3 Steps) */}
                <section id="how-it-works" className="py-24 px-6 bg-zinc-50 border-y border-zinc-100">
                    <div className="container mx-auto max-w-7xl">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-medium tracking-tighter text-zinc-900 mb-4 leading-[1.1]">
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
                                    <h3 className="text-3xl md:text-4xl font-medium text-zinc-900 tracking-tighter leading-[1.1]">
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
                                    <h3 className="text-3xl md:text-4xl font-medium text-zinc-900 tracking-tighter leading-[1.1]">
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
                                    <h3 className="text-3xl md:text-4xl font-medium text-zinc-900 tracking-tighter leading-[1.1]">
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
                                <h2 className="text-4xl md:text-6xl font-medium tracking-tighter text-zinc-900 mb-8 leading-[1]">
                                    O cockpit de follow-up que faltava.
                                </h2>
                                <div className="space-y-8">
                                    <div className="flex gap-6">
                                        <div className="w-12 h-12 flex items-center justify-center shrink-0">
                                            <ListChecks className="w-8 h-8 text-zinc-900" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-zinc-900 mb-1">Ações de hoje</h3>
                                            <p className="text-zinc-600 leading-relaxed">Lista curta. Prioridade por valor. Um clique para concluir.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-6">
                                        <div className="w-12 h-12 flex items-center justify-center shrink-0">
                                            <FileText className="w-8 h-8 text-zinc-900" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-zinc-900 mb-1">Proposta sempre à mão</h3>
                                            <p className="text-zinc-600 leading-relaxed">PDF ou link ligado ao orçamento — perfeito para o D+7.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-6">
                                        <div className="w-12 h-12 flex items-center justify-center shrink-0">
                                            <Bell className="w-8 h-8 text-zinc-900" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-zinc-900 mb-1">&apos;Sem resposta&apos; vira ação</h3>
                                            <p className="text-zinc-600 leading-relaxed">Gere a próxima ação recomendada em 1 clique.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="relative rounded-3xl overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-zinc-200/50 bg-black aspect-[16/10] group transform transition-all duration-700 hover:scale-[1.01]">
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
                            <h2 className="text-3xl md:text-5xl font-medium tracking-tighter text-zinc-900 mb-4 leading-[1.1]">
                                Planos para PMEs que enviam orçamentos.
                            </h2>
                            <p className="text-lg text-zinc-500 max-w-2xl mx-auto mb-2">
                                Comece grátis e só pague quando o Ritmo já estiver a recuperar respostas.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto items-start">
                            {/* Free Plan */}
                            <div className="relative rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-zinc-300 flex flex-col h-full">
                                <h3 className="text-lg font-bold text-zinc-900 mb-1">Free</h3>
                                <p className="text-zinc-500 text-xs mb-4">5 envios/mês · 1 utilizador</p>
                                <div className="mb-4">
                                    <span className="text-3xl font-bold text-zinc-900 tracking-tight">€0</span>
                                    <span className="text-zinc-500 text-sm font-medium">/mês</span>
                                </div>
                                <p className="text-sm text-zinc-600 mb-6">
                                    Para testar o essencial, em modo manual.
                                </p>
                                <ul className="space-y-3 mb-6 text-sm flex-grow">
                                    <li className="flex items-start gap-2 text-zinc-600">
                                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                        Cadência e tarefas (manual)
                                    </li>
                                    <li className="flex items-start gap-2 text-zinc-600">
                                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                        Templates e scripts
                                    </li>
                                    <li className="flex items-start gap-2 text-zinc-400">
                                        <X className="w-4 h-4 mt-0.5 shrink-0" />
                                        Emails automáticos
                                    </li>
                                    <li className="flex items-start gap-2 text-zinc-400">
                                        <X className="w-4 h-4 mt-0.5 shrink-0" />
                                        Captura por BCC
                                    </li>
                                </ul>
                                <Link href="/signup" className="mt-auto">
                                    <Button variant="outline" className="w-full rounded-full text-sm h-10 border-zinc-300 hover:bg-zinc-50">
                                        Continuar grátis
                                    </Button>
                                </Link>
                            </div>

                            {/* Starter Plan - Popular */}
                            <div className="relative rounded-2xl border-2 border-transparent bg-white p-6 shadow-xl flex flex-col h-full" style={{ borderImage: 'linear-gradient(to right, #60a5fa, #34d399) 1' }}>
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                    <span className="bg-gradient-to-r from-blue-400 to-emerald-400 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-emerald-500/20 uppercase">
                                        Mais Popular
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-zinc-900 mb-1 mt-2">Starter</h3>
                                <p className="text-zinc-500 text-xs mb-4">80 envios/mês · 2 utilizadores</p>
                                <div className="mb-4">
                                    <span className="text-3xl font-bold text-zinc-900 tracking-tight">€39</span>
                                    <span className="text-zinc-500 text-sm font-medium">/mês</span>
                                </div>
                                <p className="text-sm text-zinc-600 mb-6">
                                    Para o dono + 1 apoio, com automação.
                                </p>
                                <ul className="space-y-3 mb-6 text-sm flex-grow">
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
                                <Link href="/signup" className="mt-auto">
                                    <Button className="w-full rounded-full bg-gradient-to-r from-blue-400 to-emerald-400 hover:from-blue-500 hover:to-emerald-500 text-sm h-10 shadow-lg shadow-emerald-500/20 text-white border-0">
                                        Começar trial grátis
                                    </Button>
                                </Link>
                            </div>

                            {/* Pro Plan */}
                            <div className="relative rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-zinc-300 flex flex-col h-full">
                                <h3 className="text-lg font-bold text-zinc-900 mb-1">Pro</h3>
                                <p className="text-zinc-500 text-xs mb-4">250 envios/mês · 5 utilizadores</p>
                                <div className="mb-4">
                                    <span className="text-3xl font-bold text-zinc-900 tracking-tight">€99</span>
                                    <span className="text-zinc-500 text-sm font-medium">/mês</span>
                                </div>
                                <p className="text-sm text-zinc-600 mb-6">
                                    Para equipas e maior volume, com controlo.
                                </p>
                                <ul className="space-y-3 mb-6 text-sm flex-grow">
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
                                <Link href="/signup" className="mt-auto">
                                    <Button variant="outline" className="w-full rounded-full text-sm h-10 border-zinc-300 hover:bg-zinc-50">
                                        Começar trial grátis
                                    </Button>
                                </Link>
                            </div>

                            {/* Enterprise Plan */}
                            <div className="relative rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-zinc-300 flex flex-col h-full">
                                <h3 className="text-lg font-bold text-zinc-900 mb-1">Enterprise</h3>
                                <p className="text-zinc-500 text-xs mb-4">Limites personalizados</p>
                                <div className="mb-4">
                                    <span className="text-2xl font-bold text-zinc-900">Sob consulta</span>
                                </div>
                                <p className="text-sm text-zinc-600 mb-6">
                                    Para operações maiores e requisitos especiais.
                                </p>
                                <ul className="space-y-3 mb-6 text-sm flex-grow">
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
                                <a href="mailto:ritmo@useritmo.pt" className="mt-auto">
                                    <Button variant="outline" className="w-full rounded-full text-sm h-10 border-zinc-300 hover:bg-zinc-50">
                                        Falar connosco
                                    </Button>
                                </a>
                            </div>
                        </div>

                        <div className="mt-12 text-center">
                            <p className="text-sm text-zinc-400">
                                Aos preços indicados acresce IVA à taxa legal em vigor. As atualizações são gratuitas e automáticas.
                            </p>
                        </div>
                    </div>
                </section>

                {/* FAQ */}
                <section id="faq" className="py-24 px-6 bg-zinc-50 border-t border-zinc-100">
                    <div className="container mx-auto max-w-6xl">
                        <div className="grid lg:grid-cols-12 gap-12 lg:gap-24">

                            {/* Left Column: Intro & Support */}
                            <div className="lg:col-span-4 space-y-8">
                                <div>
                                    <h2 className="text-4xl md:text-5xl font-medium tracking-tighter text-zinc-900 mb-6 text-left leading-[1.1]">
                                        Perguntas <br />
                                        <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">frequentes</span>
                                    </h2>
                                    <h3 className="text-xl font-bold text-zinc-900 mb-3">Ainda tens dúvidas?</h3>
                                    <p className="text-zinc-500 leading-relaxed">
                                        Preparamos um conjunto de perguntas e respostas rápidas para esclarecer todas as tuas questões.
                                    </p>
                                </div>
                            </div>

                            {/* Right Column: Accordion Items (Cards) */}
                            <div className="lg:col-span-8 space-y-4">
                                <Accordion type="single" collapsible className="w-full space-y-4">
                                    <AccordionItem value="item-1" className="bg-white rounded-2xl border border-zinc-100 shadow-sm px-2 overflow-hidden hover:shadow-md transition-shadow duration-200">
                                        <AccordionTrigger className="px-6 py-5 text-left hover:no-underline [&[data-state=open]]:text-[var(--color-primary)]">
                                            <span className="text-base font-medium text-zinc-700">O Ritmo vai &quot;parecer robô&quot; com emails automáticos?</span>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-6 pb-6 text-zinc-600 leading-relaxed bg-white">
                                            Não. Os templates são curtos, humanos e editáveis. E o Ritmo alterna email com ações de chamada (D+7) para evitar pressão excessiva.
                                        </AccordionContent>
                                    </AccordionItem>

                                    <AccordionItem value="item-2" className="bg-white rounded-2xl border border-zinc-100 shadow-sm px-2 overflow-hidden hover:shadow-md transition-shadow duration-200">
                                        <AccordionTrigger className="px-6 py-5 text-left hover:no-underline [&[data-state=open]]:text-[var(--color-primary)]">
                                            <span className="text-base font-medium text-zinc-700">O que conta como &quot;envio&quot;?</span>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-6 pb-6 text-zinc-600 leading-relaxed bg-white">
                                            Conta apenas o 1º envio por orçamento quando o marca como Enviado. Reenvios não contam. Isto evita medo de testar e ajustar.
                                        </AccordionContent>
                                    </AccordionItem>

                                    <AccordionItem value="item-3" className="bg-white rounded-2xl border border-zinc-100 shadow-sm px-2 overflow-hidden hover:shadow-md transition-shadow duration-200">
                                        <AccordionTrigger className="px-6 py-5 text-left hover:no-underline [&[data-state=open]]:text-[var(--color-primary)]">
                                            <span className="text-base font-medium text-zinc-700">Preciso anexar a proposta no Ritmo para começar?</span>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-6 pb-6 text-zinc-600 leading-relaxed bg-white">
                                            Não. Pode continuar a criar o orçamento em Excel/Word e enviar por Outlook/Gmail. O Ritmo entra para garantir o follow-up. A proposta pode ser adicionada depois (link ou upload).
                                        </AccordionContent>
                                    </AccordionItem>

                                    <AccordionItem value="item-4" className="bg-white rounded-2xl border border-zinc-100 shadow-sm px-2 overflow-hidden hover:shadow-md transition-shadow duration-200">
                                        <AccordionTrigger className="px-6 py-5 text-left hover:no-underline [&[data-state=open]]:text-[var(--color-primary)]">
                                            <span className="text-base font-medium text-zinc-700">Como funciona a captura de propostas por BCC?</span>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-6 pb-6 text-zinc-600 leading-relaxed bg-white">
                                            Basta colocar o endereço BCC do Ritmo no email de envio. Se a proposta vier em PDF (ou link), o Ritmo associa ao orçamento automaticamente.
                                        </AccordionContent>
                                    </AccordionItem>

                                    <AccordionItem value="item-5" className="bg-white rounded-2xl border border-zinc-100 shadow-sm px-2 overflow-hidden hover:shadow-md transition-shadow duration-200">
                                        <AccordionTrigger className="px-6 py-5 text-left hover:no-underline [&[data-state=open]]:text-[var(--color-primary)]">
                                            <span className="text-base font-medium text-zinc-700">Posso usar sem automação?</span>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-6 pb-6 text-zinc-600 leading-relaxed bg-white">
                                            Sim. O plano Free funciona em modo manual: o Ritmo cria a cadência e as tarefas, mas você decide quando enviar.
                                        </AccordionContent>
                                    </AccordionItem>

                                    <AccordionItem value="item-6" className="bg-white rounded-2xl border border-zinc-100 shadow-sm px-2 overflow-hidden hover:shadow-md transition-shadow duration-200">
                                        <AccordionTrigger className="px-6 py-5 text-left hover:no-underline [&[data-state=open]]:text-[var(--color-primary)]">
                                            <span className="text-base font-medium text-zinc-700">Posso ter mais do que um utilizador?</span>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-6 pb-6 text-zinc-600 leading-relaxed bg-white">
                                            Sim. Free tem 1 utilizador, Starter 2, Pro 5. Se precisar de mais, fale connosco.
                                        </AccordionContent>
                                    </AccordionItem>

                                    <AccordionItem value="item-7" className="bg-white rounded-2xl border border-zinc-100 shadow-sm px-2 overflow-hidden hover:shadow-md transition-shadow duration-200">
                                        <AccordionTrigger className="px-6 py-5 text-left hover:no-underline [&[data-state=open]]:text-[var(--color-primary)]">
                                            <span className="text-base font-medium text-zinc-700">O trial é mesmo sem cartão?</span>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-6 pb-6 text-zinc-600 leading-relaxed bg-white">
                                            Sim. 14 dias, 20 envios, 2 utilizadores, sem cartão. No fim, escolhe se quer continuar no Free ou fazer upgrade.
                                        </AccordionContent>
                                    </AccordionItem>

                                    <AccordionItem value="item-8" className="bg-white rounded-2xl border border-zinc-100 shadow-sm px-2 overflow-hidden hover:shadow-md transition-shadow duration-200">
                                        <AccordionTrigger className="px-6 py-5 text-left hover:no-underline [&[data-state=open]]:text-[var(--color-primary)]">
                                            <span className="text-base font-medium text-zinc-700">Posso cancelar quando quiser?</span>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-6 pb-6 text-zinc-600 leading-relaxed bg-white">
                                            Sim. Pode gerir a subscrição na página de faturação e cancelar a qualquer momento.
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </div>
                        </div>
                    </div>
                </section>

                {/* BOTTOM CTA */}
                <section className="relative py-32 px-6 bg-black text-white overflow-hidden">
                    {/* Subtle gradient glow */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-blue-500/10 via-emerald-500/5 to-transparent blur-3xl pointer-events-none" />
                    <div className="relative z-10 container mx-auto text-center max-w-4xl">
                        <h2 className="mb-8 text-5xl md:text-7xl font-medium tracking-tighter">
                            Comece hoje.
                        </h2>
                        <p className="mb-12 text-xl text-zinc-400 max-w-2xl mx-auto">
                            Em 10 minutos está a enviar e acompanhar follow-ups.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
                            <Link href="/signup">
                                <Button size="lg" className="h-16 rounded-full px-12 text-lg bg-gradient-to-r from-blue-400 to-emerald-400 hover:from-blue-500 hover:to-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 hover:shadow-xl">
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
