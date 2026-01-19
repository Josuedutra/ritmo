"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, ListChecks, FileText, Zap, ChevronDown, Plus, Mail, Bell } from "lucide-react";
import { AntigravityParticles } from "@/components/landing/antigravity-particles";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

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
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                        </div>
                        <span className="text-xl font-bold tracking-tight ml-2">Ritmo</span>
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
                            An AI Co-Pilot for your Sales Team
                        </motion.div>

                        <motion.h1 variants={fadeInUp} className="mb-8 text-6xl md:text-8xl font-bold tracking-tighter text-zinc-900 leading-[0.95]">
                            Experience liftoff with <br />
                            automatic follow-ups.
                        </motion.h1>

                        <motion.p variants={fadeInUp} className="mx-auto mb-10 max-w-2xl text-xl leading-relaxed text-zinc-600 font-light">
                            Pare de perder negócios por falta de tempo. O Ritmo gere a cadência dos seus orçamentos para que a sua equipa se foque em fechar vendas.
                        </motion.p>

                        <motion.div variants={fadeInUp} className="flex flex-col items-center justify-center gap-4 sm:flex-row mb-20">
                            <Link href="/signup">
                                <Button size="lg" className="h-14 rounded-full px-10 text-lg bg-black text-white hover:bg-zinc-800 shadow-xl transition-all hover:scale-105">
                                    Começar Agora
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </Link>
                            <Button variant="ghost" size="lg" className="h-14 rounded-full px-8 text-zinc-600 hover:text-black hover:bg-zinc-100">
                                Ver Demonstração
                            </Button>
                        </motion.div>
                    </motion.div>
                </section>

                {/* HOW IT WORKS (3 Steps) */}
                <section id="how-it-works" className="py-24 px-6 bg-zinc-50 border-y border-zinc-100">
                    <div className="container mx-auto max-w-7xl">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-zinc-900 mb-4">
                                Entra no seu processo atual em 3 passos.
                            </h2>
                            <p className="text-xl text-zinc-500 max-w-2xl mx-auto">
                                Sem configurações complexas de CRM. Continua a usar o que já usa, mas com superpoderes.
                            </p>
                        </div>

                        <div className="max-w-6xl mx-auto space-y-32 mt-20">
                            {/* Step 1: Text Left, Image Right */}
                            <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-20">
                                <div className="flex-1 space-y-6 text-left">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-100 text-zinc-900 font-bold text-lg mb-2">1</div>
                                    <h3 className="text-3xl md:text-4xl font-bold text-zinc-900 tracking-tight leading-tight">
                                        Registe o orçamento
                                    </h3>
                                    <p className="text-lg text-zinc-600 leading-relaxed">
                                        <strong className="text-zinc-900 font-semibold block mb-2">Cliente, valor e referência.</strong>
                                        Basta colar o link da proposta ou anexar o PDF mais tarde. Simples e rápido.
                                    </p>
                                </div>
                                <div className="flex-1 w-full">
                                    <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-zinc-200 shadow-2xl bg-zinc-900 transform transition-all duration-700 hover:shadow-3xl hover:-translate-y-1">
                                        <Image
                                            src="/landing_step1_dark.png"
                                            alt="Register Quote"
                                            fill
                                            className="object-cover object-top"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Step 2: Image Left, Text Right */}
                            <div className="flex flex-col md:flex-row-reverse items-center gap-12 lg:gap-20">
                                <div className="flex-1 space-y-6 text-left">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-100 text-zinc-900 font-bold text-lg mb-2">2</div>
                                    <h3 className="text-3xl md:text-4xl font-bold text-zinc-900 tracking-tight leading-tight">
                                        Envie como sempre
                                    </h3>
                                    <p className="text-lg text-zinc-600 leading-relaxed">
                                        <strong className="text-zinc-900 font-semibold block mb-2">Continue com as suas ferramentas.</strong>
                                        Excel, Word, Outlook ou Gmail. Quando enviar, marque como "Enviado" no Ritmo com apenas 1 clique.
                                    </p>
                                </div>
                                <div className="flex-1 w-full">
                                    <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-zinc-200 shadow-2xl bg-zinc-900 transform transition-all duration-700 hover:shadow-3xl hover:-translate-y-1">
                                        <Image
                                            src="/landing_step2_dark.png"
                                            alt="Send as Usual"
                                            fill
                                            className="object-cover object-top"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Step 3: Text Left, Image Right */}
                            <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-20">
                                <div className="flex-1 space-y-6 text-left">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-100 text-zinc-900 font-bold text-lg mb-2">3</div>
                                    <h3 className="text-3xl md:text-4xl font-bold text-zinc-900 tracking-tight leading-tight">
                                        Faça o que aparece hoje
                                    </h3>
                                    <p className="text-lg text-zinc-600 leading-relaxed">
                                        <strong className="text-zinc-900 font-semibold block mb-2">Foco total na ação.</strong>
                                        Emails prontos a enviar e chamadas com o contexto certo. Nada de procurar ficheiros perdidos.
                                    </p>
                                </div>
                                <div className="flex-1 w-full">
                                    <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-zinc-200 shadow-2xl bg-zinc-900 transform transition-all duration-700 hover:shadow-3xl hover:-translate-y-1">
                                        <Image
                                            src="/landing_step3_dark.png"
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
                                <img
                                    src="/workflow_demo.webp"
                                    alt="Workflow Demo"
                                    className="object-cover w-full h-full opacity-90"
                                />
                                {/* Overlay reflections to match glass style */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* FAQ */}
                <section id="faq" className="py-24 px-6 bg-zinc-50 border-t border-zinc-100">
                    <div className="container mx-auto max-w-3xl">
                        <h2 className="text-3xl font-bold text-center mb-12 text-zinc-900">Perguntas Frequentes</h2>
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="item-1">
                                <AccordionTrigger>O que conta como envio?</AccordionTrigger>
                                <AccordionContent>
                                    Apenas os orçamentos que você marca ativamente como &quot;Enviado&quot;. Orçamentos em rascunho ou perdidos não contam para o limite do seu plano.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-2">
                                <AccordionTrigger>Preciso mudar o meu processo (Excel/Outlook/Gmail)?</AccordionTrigger>
                                <AccordionContent>
                                    Não. O Ritmo funciona em paralelo. Você cria a proposta e envia o email como sempre fez. Só precisa de registar no Ritmo para ativar o &quot;piloto automático&quot; do follow-up.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-3">
                                <AccordionTrigger>O Ritmo envia emails automaticamente?</AccordionTrigger>
                                <AccordionContent>
                                    Sim, nos planos Pagos. O sistema gera e envia os emails de follow-up nos momentos certos (ex: D+2, D+5). Pode sempre rever antes de enviar ou configurar para envio totalmente automático.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-4">
                                <AccordionTrigger>Como funciona o BCC?</AccordionTrigger>
                                <AccordionContent>
                                    Cada conta tem um endereço único (ex: sua-empresa@ritmo.app). Ao colocar este email em BCC quando envia a proposta, o Ritmo cria automaticamente o orçamento e inicia a cadência.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-5">
                                <AccordionTrigger>E se o contacto não tiver email?</AccordionTrigger>
                                <AccordionContent>
                                    O Ritmo cria tarefas de chamada telefónica ("Ligar ao Cliente") na data agendada, garantindo que o follow-up acontece mesmo por telefone.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-6">
                                <AccordionTrigger>O email parece robô?</AccordionTrigger>
                                <AccordionContent>
                                    Não. Os templates são 100% personalizáveis e usam texto simples, parecendo um email escrito manualmente por si. Nada de layouts complexos de marketing.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-7">
                                <AccordionTrigger>Posso cancelar?</AccordionTrigger>
                                <AccordionContent>
                                    A qualquer momento. Não há fidelização. Se cancelar, a sua conta reverte para o plano Gratuito no final do ciclo de faturação.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-8">
                                <AccordionTrigger>É seguro?</AccordionTrigger>
                                <AccordionContent>
                                    Sim. Usamos encriptação de nível bancário e servidores seguros na Europa. Os seus dados são seus e nunca serão partilhados.
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
                            Ready to lift off?
                        </h2>
                        <p className="mb-12 text-xl text-zinc-400 max-w-2xl mx-auto">
                            Join high-performing sales teams using Ritmo to close more deals with less effort.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                            <Link href="/signup">
                                <Button size="lg" className="h-16 rounded-full px-12 text-lg bg-white text-black hover:bg-zinc-200 font-bold transition-transform hover:scale-105">
                                    Criar Conta Gratuita
                                </Button>
                            </Link>
                            <span className="text-zinc-500 text-sm">No credit card required</span>
                        </div>
                    </div>
                </section>

            </main>

            <footer className="py-12 bg-white border-t border-zinc-100 text-center text-sm text-zinc-500">
                <div className="container mx-auto">
                    <p>© 2026 Ritmo. Todos os direitos reservados.</p>
                    <div className="mt-6 flex justify-center gap-8">
                        <a href="#" className="hover:text-black transition-colors">Privacidade</a>
                        <a href="#" className="hover:text-black transition-colors">Termos</a>
                        <a href="#" className="hover:text-black transition-colors">Twitter</a>
                    </div>
                </div>
            </footer>

        </div>
    );
}
