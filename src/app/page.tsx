"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui";
import { ArrowRight, Check, ListChecks, FileText, Zap, Bell, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Footer } from "@/components/marketing";
import { RoiCalculator } from "@/components/marketing/roi-calculator";

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.15,
    },
  },
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

const pricing = {
  free: { monthly: 0, annual: 0 },
  starter: { monthly: 39, annual: 31.2 },
  pro: { monthly: 99, annual: 79.2 },
} as const;

function formatPrice(price: number): string {
  if (price === 0) return "€0";
  return price % 1 === 0 ? `€${price}` : `€${price.toFixed(2).replace(".", ",")}`;
}

function PricingToggleSection() {
  const [isAnnual, setIsAnnual] = useState(false);

  const freePrice = isAnnual ? pricing.free.annual : pricing.free.monthly;
  const starterPrice = isAnnual ? pricing.starter.annual : pricing.starter.monthly;
  const proPrice = isAnnual ? pricing.pro.annual : pricing.pro.monthly;

  return (
    <section id="pricing" className="border-t border-zinc-100 bg-zinc-50 px-6 py-24">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl leading-[1.1] font-medium tracking-tighter text-zinc-900 md:text-5xl">
            Planos para PMEs que enviam orçamentos.
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-zinc-500">
            Comece grátis e só pague quando o Ritmo já estiver a recuperar respostas.
          </p>

          {/* Billing cycle toggle */}
          <div className="inline-flex items-center gap-3 rounded-full border border-zinc-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => setIsAnnual(false)}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-medium transition-all duration-200",
                !isAnnual ? "bg-zinc-900 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-900"
              )}
            >
              Mensal
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={cn(
                "relative rounded-full px-5 py-2 text-sm font-medium transition-all duration-200",
                isAnnual ? "bg-zinc-900 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-900"
              )}
            >
              Anual
              <span className="ml-2 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                -20%
              </span>
            </button>
          </div>
        </div>

        <div className="mx-auto grid max-w-6xl items-start gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Free Plan */}
          <div className="relative flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-zinc-300 hover:shadow-lg">
            <h3 className="mb-1 text-lg font-bold text-zinc-900">Free</h3>
            <p className="mb-4 text-xs text-zinc-500">5 envios/mês · 1 utilizador</p>
            <div className="mb-4">
              <motion.span
                key={`free-${isAnnual}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="inline-block text-3xl font-bold tracking-tight text-zinc-900"
              >
                {formatPrice(freePrice)}
              </motion.span>
              <span className="text-sm font-medium text-zinc-500">/mês</span>
            </div>
            <p className="mb-6 text-sm text-zinc-600">Para testar o essencial, em modo manual.</p>
            <ul className="mb-6 flex-grow space-y-3 text-sm">
              <li className="flex items-start gap-2 text-zinc-600">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                Cadência e tarefas (manual)
              </li>
              <li className="flex items-start gap-2 text-zinc-600">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                Templates e scripts
              </li>
              <li className="flex items-start gap-2 text-zinc-400">
                <X className="mt-0.5 h-4 w-4 shrink-0" />
                Emails automáticos
              </li>
              <li className="flex items-start gap-2 text-zinc-400">
                <X className="mt-0.5 h-4 w-4 shrink-0" />
                Captura por BCC
              </li>
            </ul>
            <Link href="/signup" className="mt-auto">
              <Button
                variant="outline"
                className="h-10 w-full rounded-full border-zinc-300 text-sm hover:bg-zinc-50"
              >
                Continuar grátis
              </Button>
            </Link>
          </div>

          {/* Starter Plan - Popular */}
          <div
            className="relative flex h-full flex-col rounded-2xl border-2 border-transparent bg-white p-6 shadow-xl"
            style={{ borderImage: "linear-gradient(to right, #60a5fa, #34d399) 1" }}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="rounded-full bg-gradient-to-r from-blue-400 to-emerald-400 px-3 py-1 text-xs font-bold text-white uppercase shadow-lg shadow-emerald-500/20">
                Mais Popular
              </span>
            </div>
            <h3 className="mt-2 mb-1 text-lg font-bold text-zinc-900">Starter</h3>
            <p className="mb-4 text-xs text-zinc-500">80 envios/mês · 2 utilizadores</p>
            <div className="mb-4">
              <motion.span
                key={`starter-${isAnnual}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="inline-block text-3xl font-bold tracking-tight text-zinc-900"
              >
                {formatPrice(starterPrice)}
              </motion.span>
              <span className="text-sm font-medium text-zinc-500">/mês</span>
              {isAnnual && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.2 }}
                  className="mt-1 text-xs text-zinc-400"
                >
                  faturado anualmente
                </motion.p>
              )}
            </div>
            <p className="mb-6 text-sm text-zinc-600">Para o dono + 1 apoio, com automação.</p>
            <ul className="mb-6 flex-grow space-y-3 text-sm">
              <li className="flex items-start gap-2 text-zinc-600">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                Emails automáticos (D+1, D+3)
              </li>
              <li className="flex items-start gap-2 text-zinc-600">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                D+7 com chamada guiada + proposta a 1 clique
              </li>
              <li className="flex items-start gap-2 text-zinc-600">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                Captura de proposta por BCC (PDF/link)
              </li>
              <li className="flex items-start gap-2 text-zinc-600">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                Templates por etapa
              </li>
              <li className="flex items-start gap-2 text-zinc-600">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                Scoreboard (rotina e consistência)
              </li>
            </ul>
            <Link href="/signup" className="mt-auto">
              <Button className="h-10 w-full rounded-full border-0 bg-gradient-to-r from-blue-400 to-emerald-400 text-sm text-white shadow-lg shadow-emerald-500/20 hover:from-blue-500 hover:to-emerald-500">
                Começar trial grátis
              </Button>
            </Link>
          </div>

          {/* Pro Plan */}
          <div className="relative flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-zinc-300 hover:shadow-lg">
            <h3 className="mb-1 text-lg font-bold text-zinc-900">Pro</h3>
            <p className="mb-4 text-xs text-zinc-500">250 envios/mês · 5 utilizadores</p>
            <div className="mb-4">
              <motion.span
                key={`pro-${isAnnual}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="inline-block text-3xl font-bold tracking-tight text-zinc-900"
              >
                {formatPrice(proPrice)}
              </motion.span>
              <span className="text-sm font-medium text-zinc-500">/mês</span>
              {isAnnual && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.2 }}
                  className="mt-1 text-xs text-zinc-400"
                >
                  faturado anualmente
                </motion.p>
              )}
            </div>
            <p className="mb-6 text-sm text-zinc-600">Para equipas e maior volume, com controlo.</p>
            <ul className="mb-6 flex-grow space-y-3 text-sm">
              <li className="flex items-start gap-2 text-zinc-600">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                Tudo do Starter
              </li>
              <li className="flex items-start gap-2 text-zinc-600">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                Benchmark por setor
              </li>
              <li className="flex items-start gap-2 text-zinc-600">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                Relatórios (pipeline, aging, follow-up rate)
              </li>
              <li className="flex items-start gap-2 text-zinc-600">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                Regras avançadas (prioridade/atribuição)
              </li>
              <li className="flex items-start gap-2 text-zinc-600">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                Suporte prioritário
              </li>
            </ul>
            <Link href="/signup" className="mt-auto">
              <Button
                variant="outline"
                className="h-10 w-full rounded-full border-zinc-300 text-sm hover:bg-zinc-50"
              >
                Começar trial grátis
              </Button>
            </Link>
          </div>

          {/* Enterprise Plan */}
          <div className="relative flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-zinc-300 hover:shadow-lg">
            <h3 className="mb-1 text-lg font-bold text-zinc-900">Enterprise</h3>
            <p className="mb-4 text-xs text-zinc-500">Limites personalizados</p>
            <div className="mb-4">
              <span className="text-2xl font-bold text-zinc-900">Sob consulta</span>
            </div>
            <p className="mb-6 text-sm text-zinc-600">
              Para operações maiores e requisitos especiais.
            </p>
            <ul className="mb-6 flex-grow space-y-3 text-sm">
              <li className="flex items-start gap-2 text-zinc-600">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                Utilizadores ilimitados
              </li>
              <li className="flex items-start gap-2 text-zinc-600">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                Onboarding assistido + migração
              </li>
              <li className="flex items-start gap-2 text-zinc-600">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                Governance avançada (perfis, auditoria)
              </li>
              <li className="flex items-start gap-2 text-zinc-600">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                Integrações/API + export avançado
              </li>
              <li className="flex items-start gap-2 text-zinc-600">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                SLA e suporte dedicado
              </li>
            </ul>
            <a href="mailto:ritmo@useritmo.pt" className="mt-auto">
              <Button
                variant="outline"
                className="h-10 w-full rounded-full border-zinc-300 text-sm hover:bg-zinc-50"
              >
                Falar connosco
              </Button>
            </a>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-zinc-400">
            Aos preços indicados acresce IVA à taxa legal em vigor. As atualizações são gratuitas e
            automáticas.
          </p>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <div className="bg-hero-premium flex min-h-screen flex-col bg-[#FAFAF9] font-sans text-zinc-950 selection:bg-blue-100 selection:text-blue-900">
      {/* Handle signed_out toast with Suspense boundary */}
      <Suspense fallback={null}>
        <SignedOutToast />
      </Suspense>

      {/* Header */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: 'O Ritmo vai "parecer robô" com emails automáticos?',
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Não. Os templates são curtos, humanos e editáveis. E o Ritmo alterna email com ações de chamada (D+7) para evitar pressão excessiva.",
                },
              },
              {
                "@type": "Question",
                name: 'O que conta como "envio"?',
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Conta apenas o 1º envio por orçamento quando o marca como Enviado. Reenvios não contam. Isto evita medo de testar e ajustar.",
                },
              },
              {
                "@type": "Question",
                name: "Preciso anexar a proposta no Ritmo para começar?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Não. Pode continuar a criar o orçamento em Excel/Word e enviar por Outlook/Gmail. O Ritmo entra para garantir o follow-up. A proposta pode ser adicionada depois (link ou upload).",
                },
              },
              {
                "@type": "Question",
                name: "Como funciona a captura de propostas por BCC?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Basta colocar o endereço BCC do Ritmo no email de envio. Se a proposta vier em PDF (ou link), o Ritmo associa ao orçamento automaticamente.",
                },
              },
              {
                "@type": "Question",
                name: "Posso usar sem automação?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Sim. O plano Free funciona em modo manual: o Ritmo cria a cadência e as tarefas, mas decide quando enviar.",
                },
              },
              {
                "@type": "Question",
                name: "Posso ter mais do que um utilizador?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Sim. Free tem 1 utilizador, Starter 2, Pro 5. Se precisar de mais, fale connosco.",
                },
              },
              {
                "@type": "Question",
                name: "O trial é mesmo sem cartão?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Sim. 14 dias, 20 envios, 2 utilizadores, sem cartão. No fim, escolhe se quer continuar no Free ou fazer upgrade.",
                },
              },
              {
                "@type": "Question",
                name: "Posso cancelar quando quiser?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Sim. Pode gerir a subscrição na página de faturação e cancelar a qualquer momento.",
                },
              },
              {
                "@type": "Question",
                name: "Os emails de follow-up saem do meu endereço de email?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Sim. Todos os emails automáticos são enviados a partir do seu Gmail ou Outlook — o cliente vê o seu nome e email, não o Ritmo.",
                },
              },
              {
                "@type": "Question",
                name: "Tenho de ter um CRM para usar o Ritmo?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Não. O Ritmo funciona de forma independente. Se já usar um CRM, pode registar os orçamentos em ambos — são ferramentas complementares, não concorrentes.",
                },
              },
              {
                "@type": "Question",
                name: "O que acontece quando o cliente responde?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "O Ritmo para o follow-up automaticamente nesse orçamento. Pode marcá-lo como 'Em negociação', 'Ganho' ou 'Perdido' com 1 clique.",
                },
              },
            ],
          }),
        }}
      />

      <header className="fixed top-0 z-50 w-full border-b border-transparent bg-[#FAFAF9]/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <Logo href="/" size="md" />

          <nav className="hidden items-center gap-10 text-sm font-medium text-zinc-600 md:flex">
            <a href="#how-it-works" className="transition-colors hover:text-black">
              Como funciona
            </a>
            <a href="#cockpit" className="transition-colors hover:text-black">
              Cockpit
            </a>
            <a href="#pricing" className="transition-colors hover:text-black">
              Preços
            </a>
            <a href="#faq" className="transition-colors hover:text-black">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-black"
            >
              Entrar
            </Link>
            <Link href="/signup">
              <Button className="rounded-full bg-black px-6 font-medium text-white hover:bg-zinc-800">
                Começar Trial
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 pt-32">
        {/* HERO SECTION */}
        <section className="relative px-6 pb-20 md:pb-32">
          <div className="container mx-auto max-w-7xl">
            <div className="mx-auto max-w-4xl">
              <motion.div
                initial="initial"
                animate="animate"
                variants={staggerContainer}
                className="text-center"
              >
                <motion.h1
                  variants={fadeInUp}
                  className="mb-8 text-5xl leading-[1] font-medium tracking-tighter text-zinc-900 md:text-7xl"
                >
                  Envie orçamentos como sempre. <br />O Ritmo faz o follow-up.
                </motion.h1>

                <motion.p
                  variants={fadeInUp}
                  className="mx-auto mb-10 max-w-2xl text-xl leading-relaxed font-light text-zinc-600"
                >
                  Pare de perder negócios por falta de tempo. O Ritmo gere a cadência dos seus
                  orçamentos para que a sua equipa se foque em fechar vendas.
                </motion.p>

                <motion.div
                  variants={fadeInUp}
                  className="mb-6 flex flex-col items-center justify-center gap-4 sm:flex-row"
                >
                  <Link href="/signup">
                    <Button
                      size="lg"
                      className="h-14 rounded-full bg-gradient-to-r from-blue-400 to-emerald-400 px-10 text-lg text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 hover:from-blue-500 hover:to-emerald-500 hover:shadow-xl"
                    >
                      Começar trial grátis
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/signup?provider=google">
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-14 gap-3 rounded-full border-zinc-300 px-10 text-lg shadow-sm transition-all hover:scale-105 hover:bg-zinc-50"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
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
        <section className="mb-[-1px] border-y border-zinc-100 bg-zinc-50 px-6 py-24">
          <div className="container mx-auto max-w-6xl">
            <div className="group relative overflow-hidden rounded-3xl bg-zinc-900 shadow-2xl ring-1 ring-white/10">
              {/* Animated Background Gradients */}
              <div className="pointer-events-none absolute top-0 right-0 h-[600px] w-[600px] translate-x-1/4 -translate-y-1/2 rounded-full bg-blue-500/10 blur-[100px]" />
              <div className="pointer-events-none absolute bottom-0 left-0 h-[500px] w-[500px] -translate-x-1/4 translate-y-1/3 rounded-full bg-emerald-500/5 blur-[80px]" />

              <div className="relative z-10 grid items-center gap-12 p-8 md:p-16 lg:grid-cols-2">
                {/* Left: Text Content */}
                <div className="space-y-8 text-left">
                  <div className="space-y-4">
                    <h2 className="text-3xl leading-[1.1] font-medium tracking-tighter text-white md:text-5xl">
                      <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                        Funciona com o que
                      </span>{" "}
                      <br />
                      <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                        já utiliza.
                      </span>
                    </h2>
                    <p className="max-w-md text-lg leading-relaxed text-zinc-400">
                      Sem CRM pesado. Sem mudar processos. <br />
                      Simplesmente conecte o Ritmo ao seu fluxo de trabalho habitual e deixe o
                      follow-up connosco.
                    </p>
                  </div>

                  <Link href="/signup">
                    <Button className="mt-4 h-12 rounded-full bg-white px-8 font-medium text-zinc-900 hover:bg-zinc-100">
                      Começar agora
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>

                {/* Right: Orbit Visual */}
                <div className="relative flex h-[450px] w-full items-center justify-center perspective-[1000px]">
                  {/* Orbits */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="absolute h-[220px] w-[220px] animate-[spin_40s_linear_infinite] rounded-full border border-white/5" />
                    <div className="absolute h-[340px] w-[340px] animate-[spin_60s_linear_infinite_reverse] rounded-full border border-white/5" />
                    <div className="absolute h-[460px] w-[460px] animate-[spin_80s_linear_infinite] rounded-full border border-white/5 opacity-40" />
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
                        "drop-shadow(0 0 20px rgba(59,130,246,0.3))",
                      ],
                    }}
                    transition={{
                      duration: 0.5,
                      scale: { duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 },
                      filter: { duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 },
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
                    className="absolute z-10 flex h-12 w-12 items-center justify-center"
                    style={{ top: "28%", left: "35%" }}
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Image
                      src="/icons/excel.png"
                      alt="Excel"
                      width={40}
                      height={40}
                      className="h-10 w-10 drop-shadow-lg"
                    />
                  </motion.div>

                  {/* Word - Middle Orbit */}
                  <motion.div
                    className="absolute z-10 flex h-12 w-12 items-center justify-center"
                    style={{ bottom: "25%", left: "20%" }}
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  >
                    <Image
                      src="/icons/word.png"
                      alt="Word"
                      width={40}
                      height={40}
                      className="h-10 w-10 drop-shadow-lg"
                    />
                  </motion.div>

                  {/* Gmail - Middle Orbit */}
                  <motion.div
                    className="absolute z-10 flex h-12 w-12 items-center justify-center"
                    style={{ top: "20%", right: "25%" }}
                    animate={{ y: [0, -12, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  >
                    <Image
                      src="/icons/gmail.png"
                      alt="Gmail"
                      width={40}
                      height={40}
                      className="h-10 w-10 drop-shadow-lg"
                    />
                  </motion.div>

                  {/* Outlook - Outer Orbit */}
                  <motion.div
                    className="absolute z-10 flex h-12 w-12 items-center justify-center"
                    style={{ bottom: "35%", right: "15%" }}
                    animate={{ y: [0, 15, 0] }}
                    transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
                  >
                    <Image
                      src="/icons/outlook.png"
                      alt="Outlook"
                      width={40}
                      height={40}
                      className="h-10 w-10 drop-shadow-lg"
                    />
                  </motion.div>

                  {/* PDF - Outer Orbit */}
                  <motion.div
                    className="absolute z-10 flex h-12 w-12 items-center justify-center"
                    style={{ top: "10%", left: "45%" }}
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                  >
                    <Image
                      src="/icons/pdf.png"
                      alt="PDF"
                      width={40}
                      height={40}
                      className="h-10 w-10 drop-shadow-lg"
                    />
                  </motion.div>

                  {/* Decorative Particles */}
                  <div className="absolute top-1/4 right-1/4 h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400 opacity-50" />
                  <div className="absolute right-1/3 bottom-1/3 h-1 w-1 animate-pulse rounded-full bg-emerald-400 opacity-50 delay-700" />
                  <div className="absolute top-1/3 left-1/4 h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400 opacity-50 delay-1000" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS (3 Steps) */}
        <section id="how-it-works" className="border-y border-zinc-100 bg-zinc-50 px-6 py-24">
          <div className="container mx-auto max-w-7xl">
            <div className="mb-16 text-center">
              <h2 className="mb-4 text-3xl leading-[1.1] font-medium tracking-tighter text-zinc-900 md:text-5xl">
                Entra no seu processo atual em 3 passos.
              </h2>
              <p className="mx-auto max-w-3xl text-xl text-zinc-500">
                Sem configurações complexas. Continua a usar Excel/Word/Sistemas e Outlook/Gmail – o
                Ritmo só organiza o follow-up.
              </p>
            </div>

            <div className="mx-auto mt-20 max-w-7xl space-y-32">
              {/* Step 1: Text Left (30%), Image Right (70%) */}
              <div className="flex flex-col items-center gap-8 md:flex-row lg:gap-16">
                <div className="w-full space-y-6 text-left md:w-[30%]">
                  <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-lg font-bold text-zinc-900">
                    1
                  </div>
                  <h3 className="text-3xl leading-[1.1] font-medium tracking-tighter text-zinc-900 md:text-4xl">
                    Registe o orçamento
                  </h3>
                  <p className="text-lg leading-relaxed text-zinc-600">
                    <strong className="mb-2 block font-semibold text-zinc-900">
                      Cliente, valor e referência.
                    </strong>
                    Basta colar o link da proposta ou anexar o PDF mais tarde. Simples e rápido.
                  </p>
                </div>
                <div className="w-full md:w-[70%]">
                  <div className="hover:shadow-3xl relative aspect-[16/10] transform overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-900 shadow-2xl transition-all duration-700 hover:-translate-y-1">
                    <Image
                      src="/landing_step1_v2.png"
                      alt="Register Quote"
                      fill
                      className="object-cover object-top"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  </div>
                </div>
              </div>

              {/* Step 2: Image Left (70%), Text Right (30%) */}
              <div className="flex flex-col items-center gap-8 md:flex-row-reverse lg:gap-16">
                <div className="w-full space-y-6 text-left md:w-[30%]">
                  <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-lg font-bold text-zinc-900">
                    2
                  </div>
                  <h3 className="text-3xl leading-[1.1] font-medium tracking-tighter text-zinc-900 md:text-4xl">
                    Envie como sempre
                  </h3>
                  <p className="text-lg leading-relaxed text-zinc-600">
                    <strong className="mb-2 block font-semibold text-zinc-900">
                      Continue com as suas ferramentas.
                    </strong>
                    Quando enviar, marque como &quot;Enviado&quot; no Ritmo com apenas 1 clique.
                  </p>
                </div>
                <div className="w-full md:w-[70%]">
                  <div className="hover:shadow-3xl relative aspect-[16/10] transform overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-900 shadow-2xl transition-all duration-700 hover:-translate-y-1">
                    <Image
                      src="/landing_step2_v2.png"
                      alt="Send as Usual"
                      fill
                      className="object-cover object-top"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  </div>
                </div>
              </div>

              {/* Step 3: Text Left (30%), Image Right (70%) */}
              <div className="flex flex-col items-center gap-8 md:flex-row lg:gap-16">
                <div className="w-full space-y-6 text-left md:w-[30%]">
                  <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-lg font-bold text-zinc-900">
                    3
                  </div>
                  <h3 className="text-3xl leading-[1.1] font-medium tracking-tighter text-zinc-900 md:text-4xl">
                    Faça o que aparece hoje
                  </h3>
                  <p className="text-lg leading-relaxed text-zinc-600">
                    <strong className="mb-2 block font-semibold text-zinc-900">
                      Foco total na ação.
                    </strong>
                    Emails prontos a enviar e chamadas com o contexto certo. Nada de procurar
                    ficheiros perdidos.
                  </p>
                </div>
                <div className="w-full md:w-[70%]">
                  <div className="hover:shadow-3xl relative aspect-[16/10] transform overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-900 shadow-2xl transition-all duration-700 hover:-translate-y-1">
                    <Image
                      src="/landing_step3_v2.png"
                      alt="Action Today"
                      fill
                      className="object-cover object-top"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 text-center">
              <p className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900">
                <Zap className="h-4 w-4" />
                Sem email/telefone? O Ritmo cria tarefas manuais para não travar.
              </p>
            </div>
          </div>
        </section>

        {/* COCKPIT SECTION */}
        <section id="cockpit" className="px-6 py-32">
          <div className="container mx-auto max-w-7xl">
            <div className="grid items-center gap-16 lg:grid-cols-2">
              <div>
                <h2 className="mb-8 text-4xl leading-[1] font-medium tracking-tighter text-zinc-900 md:text-6xl">
                  O cockpit de follow-up que faltava.
                </h2>
                <div className="space-y-8">
                  <div className="flex gap-6">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center">
                      <ListChecks className="h-8 w-8 text-zinc-900" />
                    </div>
                    <div>
                      <h3 className="mb-1 text-xl font-bold text-zinc-900">Ações de hoje</h3>
                      <p className="leading-relaxed text-zinc-600">
                        Lista curta. Prioridade por valor. Um clique para concluir.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center">
                      <FileText className="h-8 w-8 text-zinc-900" />
                    </div>
                    <div>
                      <h3 className="mb-1 text-xl font-bold text-zinc-900">
                        Proposta sempre à mão
                      </h3>
                      <p className="leading-relaxed text-zinc-600">
                        PDF ou link ligado ao orçamento — perfeito para o D+7.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center">
                      <Bell className="h-8 w-8 text-zinc-900" />
                    </div>
                    <div>
                      <h3 className="mb-1 text-xl font-bold text-zinc-900">
                        &apos;Sem resposta&apos; vira ação
                      </h3>
                      <p className="leading-relaxed text-zinc-600">
                        Gere a próxima ação recomendada em 1 clique.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="group relative aspect-[16/10] transform overflow-hidden rounded-3xl border border-zinc-200/50 bg-black shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] transition-all duration-700 hover:scale-[1.01]">
                {/* Video/Animation Loop */}
                <video
                  src="/workflow_demo.webm"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="h-full w-full object-cover opacity-90"
                  poster="/workflow_demo.webp"
                />
                {/* Overlay reflections to match glass style */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent" />
              </div>
            </div>
          </div>
        </section>

        {/* PRICING */}
      friday/feat-pricing-dark-cards
        <section id="pricing" className="relative overflow-hidden bg-zinc-950 px-6 py-24">
          {/* Subtle ambient glow */}
          <div className="pointer-events-none absolute top-0 left-1/2 h-[500px] w-[800px] -translate-x-1/2 bg-gradient-to-b from-blue-500/8 via-emerald-500/4 to-transparent blur-[100px]" />

          <div className="relative z-10 container mx-auto max-w-7xl">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl leading-[1.1] font-medium tracking-tighter text-white md:text-5xl">
                Planos para PMEs que enviam orçamentos.
              </h2>
              <p className="mx-auto mb-2 max-w-2xl text-lg text-zinc-400">
                Comece grátis e só pague quando o Ritmo já estiver a recuperar respostas.
              </p>
            </div>

            <div className="mx-auto grid max-w-6xl items-start gap-6 md:grid-cols-2 lg:grid-cols-4">
              {/* Free Plan */}
              <div className="relative flex h-full flex-col rounded-2xl border border-zinc-800 bg-zinc-900 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-zinc-700 hover:shadow-lg hover:shadow-zinc-900/50">
                <h3 className="mb-1 text-lg font-bold text-white">Free</h3>
                <p className="mb-4 text-xs text-zinc-500">5 envios/mês · 1 utilizador</p>
                <div className="mb-4">
                  <span className="text-3xl font-bold tracking-tight text-white">€0</span>
                  <span className="text-sm font-medium text-zinc-500">/mês</span>
                </div>
                <p className="mb-6 text-sm text-zinc-400">
                  Para testar o essencial, em modo manual.
                </p>
                <ul className="mb-6 flex-grow space-y-3 text-sm">
                  <li className="flex items-start gap-2 text-zinc-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    Cadência e tarefas (manual)
                  </li>
                  <li className="flex items-start gap-2 text-zinc-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    Templates e scripts
                  </li>
                  <li className="flex items-start gap-2 text-zinc-600">
                    <X className="mt-0.5 h-4 w-4 shrink-0" />
                    Emails automáticos
                  </li>
                  <li className="flex items-start gap-2 text-zinc-600">
                    <X className="mt-0.5 h-4 w-4 shrink-0" />
                    Captura por BCC
                  </li>
                </ul>
                <Link href="/signup" className="mt-auto">
                  <Button
                    variant="outline"
                    className="h-10 w-full rounded-full border-zinc-700 text-sm text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"
                  >
                    Continuar grátis
                  </Button>
                </Link>
              </div>

              {/* Starter Plan - Popular (Highlighted) */}
              <div className="relative rounded-2xl bg-gradient-to-b from-blue-500/60 to-emerald-500/60 p-[1px] shadow-lg shadow-blue-500/10">
                <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
                  <span className="rounded-full bg-gradient-to-r from-blue-400 to-emerald-400 px-3 py-1 text-xs font-bold text-white uppercase shadow-lg shadow-emerald-500/20">
                    Mais Popular
                  </span>
                </div>
                <div className="flex h-full flex-col rounded-[15px] bg-zinc-900 p-6">
                  <h3 className="mt-2 mb-1 text-lg font-bold text-white">Starter</h3>
                  <p className="mb-4 text-xs text-zinc-500">80 envios/mês · 2 utilizadores</p>
                  <div className="mb-4">
                    <span className="text-3xl font-bold tracking-tight text-white">€39</span>
                    <span className="text-sm font-medium text-zinc-500">/mês</span>
                  </div>
                  <p className="mb-6 text-sm text-zinc-400">
                    Para o dono + 1 apoio, com automação.
                  </p>
                  <ul className="mb-6 flex-grow space-y-3 text-sm">
                    <li className="flex items-start gap-2 text-zinc-300">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      Emails automáticos (D+1, D+3)
                    </li>
                    <li className="flex items-start gap-2 text-zinc-300">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      D+7 com chamada guiada + proposta a 1 clique
                    </li>
                    <li className="flex items-start gap-2 text-zinc-300">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      Captura de proposta por BCC (PDF/link)
                    </li>
                    <li className="flex items-start gap-2 text-zinc-300">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      Templates por etapa
                    </li>
                    <li className="flex items-start gap-2 text-zinc-300">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      Scoreboard (rotina e consistência)
                    </li>
                  </ul>
                  <Link href="/signup" className="mt-auto">
                    <Button className="h-10 w-full rounded-full border-0 bg-gradient-to-r from-blue-400 to-emerald-400 text-sm text-white shadow-lg shadow-emerald-500/20 hover:from-blue-500 hover:to-emerald-500">
                      Começar trial grátis
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Pro Plan */}
              <div className="relative flex h-full flex-col rounded-2xl border border-zinc-800 bg-zinc-900 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-zinc-700 hover:shadow-lg hover:shadow-zinc-900/50">
                <h3 className="mb-1 text-lg font-bold text-white">Pro</h3>
                <p className="mb-4 text-xs text-zinc-500">250 envios/mês · 5 utilizadores</p>
                <div className="mb-4">
                  <span className="text-3xl font-bold tracking-tight text-white">€99</span>
                  <span className="text-sm font-medium text-zinc-500">/mês</span>
                </div>
                <p className="mb-6 text-sm text-zinc-400">
                  Para equipas e maior volume, com controlo.
                </p>
                <ul className="mb-6 flex-grow space-y-3 text-sm">
                  <li className="flex items-start gap-2 text-zinc-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    Tudo do Starter
                  </li>
                  <li className="flex items-start gap-2 text-zinc-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    Benchmark por setor
                  </li>
                  <li className="flex items-start gap-2 text-zinc-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    Relatórios (pipeline, aging, follow-up rate)
                  </li>
                  <li className="flex items-start gap-2 text-zinc-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    Regras avançadas (prioridade/atribuição)
                  </li>
                  <li className="flex items-start gap-2 text-zinc-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    Suporte prioritário
                  </li>
                </ul>
                <Link href="/signup" className="mt-auto">
                  <Button
                    variant="outline"
                    className="h-10 w-full rounded-full border-zinc-700 text-sm text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"
                  >
                    Começar trial grátis
                  </Button>
                </Link>
              </div>

              {/* Enterprise Plan */}
              <div className="relative flex h-full flex-col rounded-2xl border border-zinc-800 bg-zinc-900 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-zinc-700 hover:shadow-lg hover:shadow-zinc-900/50">
                <h3 className="mb-1 text-lg font-bold text-white">Enterprise</h3>
                <p className="mb-4 text-xs text-zinc-500">Limites personalizados</p>
                <div className="mb-4">
                  <span className="text-2xl font-bold text-white">Sob consulta</span>
                </div>
                <p className="mb-6 text-sm text-zinc-400">
                  Para operações maiores e requisitos especiais.
                </p>
                <ul className="mb-6 flex-grow space-y-3 text-sm">
                  <li className="flex items-start gap-2 text-zinc-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    Utilizadores ilimitados
                  </li>
                  <li className="flex items-start gap-2 text-zinc-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    Onboarding assistido + migração
                  </li>
                  <li className="flex items-start gap-2 text-zinc-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    Governance avançada (perfis, auditoria)
                  </li>
                  <li className="flex items-start gap-2 text-zinc-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    Integrações/API + export avançado
                  </li>
                  <li className="flex items-start gap-2 text-zinc-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    SLA e suporte dedicado
                  </li>
                </ul>
                <a href="mailto:ritmo@useritmo.pt" className="mt-auto">
                  <Button
                    variant="outline"
                    className="h-10 w-full rounded-full border-zinc-700 text-sm text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"
                  >
                    Falar connosco
                  </Button>
                </a>
              </div>
            </div>

            <div className="mt-12 text-center">
              <p className="text-sm text-zinc-600">
                Aos preços indicados acresce IVA à taxa legal em vigor. As atualizações são
                gratuitas e automáticas.
              </p>
            </div>
          </div>
        </section>

        <PricingToggleSection />

        <RoiCalculator />

        {/* FAQ */}
        <section id="faq" className="border-t border-zinc-100 bg-zinc-50 px-6 py-24">
          <div className="container mx-auto max-w-6xl">
            <div className="grid gap-12 lg:grid-cols-12 lg:gap-24">
              {/* Left Column: Intro & Support */}
              <div className="space-y-8 lg:col-span-4">
                <div>
                  <h2 className="mb-6 text-left text-4xl leading-[1.1] font-medium tracking-tighter text-zinc-900 md:text-5xl">
                    Perguntas <br />
                    <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                      frequentes
                    </span>
                  </h2>
                  <h3 className="mb-3 text-xl font-bold text-zinc-900">Ainda tem dúvidas?</h3>
                  <p className="leading-relaxed text-zinc-500">
                    Preparamos um conjunto de perguntas e respostas rápidas para esclarecer todas as
                    suas questões.
                  </p>
                </div>
              </div>

              {/* Right Column: Accordion Items (Cards) */}
              <div className="space-y-4 lg:col-span-8">
                <Accordion type="single" collapsible className="w-full space-y-4">
                  <AccordionItem
                    value="item-1"
                    className="overflow-hidden rounded-2xl border border-zinc-100 bg-white px-2 shadow-sm transition-shadow duration-200 hover:shadow-md"
                  >
                    <AccordionTrigger className="px-6 py-5 text-left hover:no-underline [&[data-state=open]]:text-[var(--color-primary)]">
                      <span className="text-base font-medium text-zinc-700">
                        O Ritmo vai &quot;parecer robô&quot; com emails automáticos?
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="bg-white px-6 pb-6 leading-relaxed text-zinc-600">
                      Não. Os templates são curtos, humanos e editáveis. E o Ritmo alterna email com
                      ações de chamada (D+7) para evitar pressão excessiva.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem
                    value="item-2"
                    className="overflow-hidden rounded-2xl border border-zinc-100 bg-white px-2 shadow-sm transition-shadow duration-200 hover:shadow-md"
                  >
                    <AccordionTrigger className="px-6 py-5 text-left hover:no-underline [&[data-state=open]]:text-[var(--color-primary)]">
                      <span className="text-base font-medium text-zinc-700">
                        O que conta como &quot;envio&quot;?
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="bg-white px-6 pb-6 leading-relaxed text-zinc-600">
                      Conta apenas o 1º envio por orçamento quando o marca como Enviado. Reenvios
                      não contam. Isto evita medo de testar e ajustar.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem
                    value="item-3"
                    className="overflow-hidden rounded-2xl border border-zinc-100 bg-white px-2 shadow-sm transition-shadow duration-200 hover:shadow-md"
                  >
                    <AccordionTrigger className="px-6 py-5 text-left hover:no-underline [&[data-state=open]]:text-[var(--color-primary)]">
                      <span className="text-base font-medium text-zinc-700">
                        Preciso anexar a proposta no Ritmo para começar?
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="bg-white px-6 pb-6 leading-relaxed text-zinc-600">
                      Não. Pode continuar a criar o orçamento em Excel/Word e enviar por
                      Outlook/Gmail. O Ritmo entra para garantir o follow-up. A proposta pode ser
                      adicionada depois (link ou upload).
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem
                    value="item-4"
                    className="overflow-hidden rounded-2xl border border-zinc-100 bg-white px-2 shadow-sm transition-shadow duration-200 hover:shadow-md"
                  >
                    <AccordionTrigger className="px-6 py-5 text-left hover:no-underline [&[data-state=open]]:text-[var(--color-primary)]">
                      <span className="text-base font-medium text-zinc-700">
                        Como funciona a captura de propostas por BCC?
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="bg-white px-6 pb-6 leading-relaxed text-zinc-600">
                      Basta colocar o endereço BCC do Ritmo no email de envio. Se a proposta vier em
                      PDF (ou link), o Ritmo associa ao orçamento automaticamente.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem
                    value="item-5"
                    className="overflow-hidden rounded-2xl border border-zinc-100 bg-white px-2 shadow-sm transition-shadow duration-200 hover:shadow-md"
                  >
                    <AccordionTrigger className="px-6 py-5 text-left hover:no-underline [&[data-state=open]]:text-[var(--color-primary)]">
                      <span className="text-base font-medium text-zinc-700">
                        Posso usar sem automação?
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="bg-white px-6 pb-6 leading-relaxed text-zinc-600">
                      Sim. O plano Free funciona em modo manual: o Ritmo cria a cadência e as
                      tarefas, mas decide quando enviar.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem
                    value="item-6"
                    className="overflow-hidden rounded-2xl border border-zinc-100 bg-white px-2 shadow-sm transition-shadow duration-200 hover:shadow-md"
                  >
                    <AccordionTrigger className="px-6 py-5 text-left hover:no-underline [&[data-state=open]]:text-[var(--color-primary)]">
                      <span className="text-base font-medium text-zinc-700">
                        Posso ter mais do que um utilizador?
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="bg-white px-6 pb-6 leading-relaxed text-zinc-600">
                      Sim. Free tem 1 utilizador, Starter 2, Pro 5. Se precisar de mais, fale
                      connosco.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem
                    value="item-7"
                    className="overflow-hidden rounded-2xl border border-zinc-100 bg-white px-2 shadow-sm transition-shadow duration-200 hover:shadow-md"
                  >
                    <AccordionTrigger className="px-6 py-5 text-left hover:no-underline [&[data-state=open]]:text-[var(--color-primary)]">
                      <span className="text-base font-medium text-zinc-700">
                        O trial é mesmo sem cartão?
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="bg-white px-6 pb-6 leading-relaxed text-zinc-600">
                      Sim. 14 dias, 20 envios, 2 utilizadores, sem cartão. No fim, escolhe se quer
                      continuar no Free ou fazer upgrade.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem
                    value="item-8"
                    className="overflow-hidden rounded-2xl border border-zinc-100 bg-white px-2 shadow-sm transition-shadow duration-200 hover:shadow-md"
                  >
                    <AccordionTrigger className="px-6 py-5 text-left hover:no-underline [&[data-state=open]]:text-[var(--color-primary)]">
                      <span className="text-base font-medium text-zinc-700">
                        Posso cancelar quando quiser?
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="bg-white px-6 pb-6 leading-relaxed text-zinc-600">
                      Sim. Pode gerir a subscrição na página de faturação e cancelar a qualquer
                      momento.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem
                    value="item-9"
                    className="overflow-hidden rounded-2xl border border-zinc-100 bg-white px-2 shadow-sm transition-shadow duration-200 hover:shadow-md"
                  >
                    <AccordionTrigger className="px-6 py-5 text-left hover:no-underline [&[data-state=open]]:text-[var(--color-primary)]">
                      <span className="text-base font-medium text-zinc-700">
                        Os emails de follow-up saem do meu endereço de email?
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="bg-white px-6 pb-6 leading-relaxed text-zinc-600">
                      Sim. Todos os emails automáticos são enviados a partir do seu Gmail ou Outlook
                      — o cliente vê o seu nome e email, não o Ritmo.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem
                    value="item-10"
                    className="overflow-hidden rounded-2xl border border-zinc-100 bg-white px-2 shadow-sm transition-shadow duration-200 hover:shadow-md"
                  >
                    <AccordionTrigger className="px-6 py-5 text-left hover:no-underline [&[data-state=open]]:text-[var(--color-primary)]">
                      <span className="text-base font-medium text-zinc-700">
                        Tenho de ter um CRM para usar o Ritmo?
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="bg-white px-6 pb-6 leading-relaxed text-zinc-600">
                      Não. O Ritmo funciona de forma independente. Se já usar um CRM, pode registar
                      os orçamentos em ambos — são ferramentas complementares, não concorrentes.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem
                    value="item-11"
                    className="overflow-hidden rounded-2xl border border-zinc-100 bg-white px-2 shadow-sm transition-shadow duration-200 hover:shadow-md"
                  >
                    <AccordionTrigger className="px-6 py-5 text-left hover:no-underline [&[data-state=open]]:text-[var(--color-primary)]">
                      <span className="text-base font-medium text-zinc-700">
                        O que acontece quando o cliente responde?
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="bg-white px-6 pb-6 leading-relaxed text-zinc-600">
                      O Ritmo para o follow-up automaticamente nesse orçamento. Pode marcá-lo como
                      &quot;Em negociação&quot;, &quot;Ganho&quot; ou &quot;Perdido&quot; com 1
                      clique.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section className="relative overflow-hidden bg-black px-6 py-32 text-white">
          {/* Subtle gradient glow */}
          <div className="pointer-events-none absolute top-0 left-1/2 h-[400px] w-[800px] -translate-x-1/2 bg-gradient-to-b from-blue-500/10 via-emerald-500/5 to-transparent blur-3xl" />
          <div className="relative z-10 container mx-auto max-w-4xl text-center">
            <h2 className="mb-8 text-5xl font-medium tracking-tighter md:text-7xl">Comece hoje.</h2>
            <p className="mx-auto mb-12 max-w-2xl text-xl text-zinc-400">
              Em 10 minutos está a enviar e acompanhar follow-ups.
            </p>

            <div className="mb-4 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="h-16 rounded-full bg-gradient-to-r from-blue-400 to-emerald-400 px-12 text-lg font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 hover:from-blue-500 hover:to-emerald-500 hover:shadow-xl"
                >
                  Começar trial grátis
                </Button>
              </Link>
              <Link href="/signup?provider=google">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-16 gap-3 rounded-full border-zinc-600 px-12 text-lg font-bold text-white transition-transform hover:scale-105 hover:bg-zinc-800"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continuar com Google
                </Button>
              </Link>
            </div>
            <span className="text-sm text-zinc-500">14 dias · 20 envios · sem cartão</span>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
