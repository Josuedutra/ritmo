"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  Check,
  ChevronRight,
  Zap,
  BarChart3,
  Mail,
  Users,
  Headphones,
  FileText,
  ArrowRight,
} from "lucide-react";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Footer } from "@/components/marketing";

/* ─── Analytics helper ─── */
function trackEvent(name: string, label?: string) {
  try {
    if (typeof window !== "undefined" && "gtag" in window) {
      (window as unknown as { gtag: (...args: unknown[]) => void }).gtag("event", name, {
        event_label: label,
      });
    }
  } catch {
    // analytics should never break the page
  }
}

/* ─── Form state ─── */
interface FormData {
  name: string;
  email: string;
  company: string;
  nif: string;
  clients: string;
  source: string;
}

export default function PartnersPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    company: "",
    nif: "",
    clients: "",
    source: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function scrollToForm(ctaLabel: string) {
    trackEvent("partner_page_cta_click", ctaLabel);
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    trackEvent("partner_register_start");
    setSubmitting(true);

    // MVP: Send form data via mailto
    const subject = encodeURIComponent("Novo registo de parceiro — Programa Contabilistas");
    const body = encodeURIComponent(
      `Nome: ${formData.name}\nEmail: ${formData.email}\nEmpresa: ${formData.company}\nNIF: ${formData.nif || "(não indicado)"}\nNº clientes PME: ${formData.clients || "(não indicado)"}\nComo soube: ${formData.source || "(não indicado)"}`
    );

    window.location.href = `mailto:parceiros@useritmo.pt?subject=${subject}&body=${body}`;

    // Give the mail client time to open, then show success
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      trackEvent("partner_register_complete");
    }, 1000);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAF9] font-sans text-zinc-950 selection:bg-blue-100 selection:text-blue-900">
      {/* JSON-LD FAQPage Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "Quanto custa tornar-me parceiro?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Nada. O registo é gratuito e não há taxa de parceiro. Ganha comissão quando os seus clientes subscrevem um plano pago.",
                },
              },
              {
                "@type": "Question",
                name: "Como funciona o rastreamento de referências?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Cada parceiro tem um link único. Quando um cliente subscreve através desse link, a referência fica associada à sua conta automaticamente.",
                },
              },
              {
                "@type": "Question",
                name: "Quando recebo a comissão?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "As comissões são calculadas mensalmente e pagas no início do mês seguinte. Os detalhes estão no painel de parceiro.",
                },
              },
              {
                "@type": "Question",
                name: "O que acontece se um cliente cancelar?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "A comissão é proporcional ao tempo em que o cliente manteve o plano ativo. Se cancelar, deixa de haver comissão desse cliente — sem penalizações para si.",
                },
              },
              {
                "@type": "Question",
                name: "Posso ver os dados dos meus clientes no Ritmo?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Sim. Os clientes que ativarem a partilha de dados permitem-lhe aceder ao seu dashboard de cobranças — cobranças emitidas, pagas, em atraso — sem custo adicional.",
                },
              },
              {
                "@type": "Question",
                name: "O Ritmo emite fatura certificada (ATCUD)?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "O Ritmo integra-se com o InvoiceXpress para emissão de faturas certificadas. Os seus clientes podem continuar a usar o faturador que já têm.",
                },
              },
              {
                "@type": "Question",
                name: "Há um número mínimo de referências?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Não. Pode referenciar 1 ou 100 clientes. Não há mínimos nem quotas.",
                },
              },
            ],
          }),
        }}
      />

      {/* ─── Header ─── */}
      <header className="fixed top-0 z-50 w-full border-b border-transparent bg-[#FAFAF9]/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <Logo href="/" size="md" />
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-black"
            >
              Entrar
            </Link>
            <Button
              onClick={() => scrollToForm("header_cta")}
              className="rounded-full bg-black px-6 font-medium text-white hover:bg-zinc-800"
            >
              Tornar-me parceiro
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 pt-32">
        {/* ─── SECTION 1: HERO ─── */}
        <section className="relative px-6 pb-24 md:pb-32">
          <div className="container mx-auto max-w-4xl text-center">
            <span className="mb-6 inline-block rounded-full border border-blue-100/50 bg-gradient-to-r from-blue-50 to-emerald-50 px-5 py-2 text-sm font-medium text-zinc-700">
              Programa de Parceiros &middot; Para Contabilistas
            </span>

            <h1 className="mb-8 text-5xl leading-[1] font-medium tracking-tighter text-zinc-900 md:text-7xl">
              Ganhe por ajudar os seus clientes a{" "}
              <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                cobrar melhor.
              </span>
            </h1>

            <p className="mx-auto mb-10 max-w-2xl text-xl leading-relaxed font-light text-zinc-600">
              Recomende o Ritmo às suas PMEs de serviços. Receba 20% de comissão recorrente enquanto
              o cliente mantiver o plano. Grátis para si.
            </p>

            <Button
              size="lg"
              onClick={() => scrollToForm("hero_cta")}
              className="h-14 rounded-full bg-gradient-to-r from-blue-400 to-emerald-400 px-10 text-lg text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 hover:from-blue-500 hover:to-emerald-500 hover:shadow-xl"
            >
              Registar como parceiro &mdash; é grátis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-zinc-500">
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-500" />
                Sem custos de entrada
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-500" />
                Comissão recorrente
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-500" />
                Acesso ao painel dos seus clientes
              </span>
            </div>
          </div>
        </section>

        {/* ─── SECTION 2: O PROBLEMA DOS SEUS CLIENTES ─── */}
        <section className="border-y border-zinc-100 bg-zinc-50 px-6 py-24">
          <div className="container mx-auto max-w-4xl">
            <h2 className="mb-8 text-center text-3xl leading-[1.1] font-medium tracking-tighter text-zinc-900 md:text-5xl">
              Os seus clientes PME perdem horas a cobrar todos os meses.
            </h2>

            <p className="mx-auto mb-10 max-w-3xl text-center text-lg leading-relaxed text-zinc-600">
              Empresas de serviços — AVAC, informática, condomínios, formação, consultoria — têm
              clientes de contrato com cobranças mensais ou trimestrais. Hoje, a maioria ainda faz
              isso manualmente:
            </p>

            <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
              {[
                "Emissão de quotas uma a uma no faturador",
                "Follow-up por email ou telefone quando se lembram",
                "Excel para controlar quem pagou",
                "Descobrem atrasos semanas depois de acontecerem",
              ].map((pain) => (
                <div
                  key={pain}
                  className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-50 text-xs text-red-400">
                    ✕
                  </span>
                  <span className="text-sm leading-relaxed text-zinc-700">{pain}</span>
                </div>
              ))}
            </div>

            <p className="mx-auto mt-10 max-w-2xl text-center text-lg text-zinc-500">
              O resultado: horas de trabalho administrativo, fluxo de caixa imprevisível, e stress
              que não precisava de existir.
            </p>
          </div>
        </section>

        {/* ─── SECTION 3: A SOLUÇÃO ─── */}
        <section className="px-6 py-24">
          <div className="container mx-auto max-w-6xl">
            <div className="mb-16 text-center">
              <h2 className="mb-4 text-3xl leading-[1.1] font-medium tracking-tighter text-zinc-900 md:text-5xl">
                O Ritmo resolve isso em{" "}
                <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                  5 minutos
                </span>{" "}
                de configuração.
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-zinc-500">
                O Ritmo automatiza o ciclo completo de cobranças recorrentes para PMEs:
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {/* Pillar 1 */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-blue-100">
                  <Zap className="h-6 w-6 text-blue-500" />
                </div>
                <h3 className="mb-3 text-xl font-semibold text-zinc-900">Emissão automática</h3>
                <p className="text-sm leading-relaxed text-zinc-600">
                  Quotas e faturas emitidas automaticamente no dia certo, para todos os clientes de
                  contrato, sem intervenção manual.
                </p>
              </div>

              {/* Pillar 2 */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100">
                  <Mail className="h-6 w-6 text-emerald-500" />
                </div>
                <h3 className="mb-3 text-xl font-semibold text-zinc-900">Cobrança sem esforço</h3>
                <p className="text-sm leading-relaxed text-zinc-600">
                  Lembretes de pagamento por email automáticos. O cliente paga. O gestor não tem de
                  ligar nem enviar emails.
                </p>
              </div>

              {/* Pillar 3 */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-50 to-violet-100">
                  <BarChart3 className="h-6 w-6 text-violet-500" />
                </div>
                <h3 className="mb-3 text-xl font-semibold text-zinc-900">Visibilidade total</h3>
                <p className="text-sm leading-relaxed text-zinc-600">
                  Dashboard em tempo real: quem pagou, quem está em atraso, quanto está pendente.
                  Tudo num sítio.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── SECTION 4: BENEFÍCIOS DO PARCEIRO ─── */}
        <section className="border-y border-zinc-100 bg-zinc-50 px-6 py-24">
          <div className="container mx-auto max-w-6xl">
            <h2 className="mb-16 text-center text-3xl leading-[1.1] font-medium tracking-tighter text-zinc-900 md:text-5xl">
              O que ganha como parceiro Ritmo
            </h2>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Highlight benefit */}
              <div className="flex flex-col justify-between rounded-2xl bg-zinc-900 p-8 text-white md:col-span-2 lg:col-span-1 lg:row-span-2">
                <div>
                  <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-6xl font-bold tracking-tighter text-transparent md:text-7xl">
                    20%
                  </span>
                  <h3 className="mt-4 text-2xl font-semibold">Comissão recorrente</h3>
                  <p className="mt-4 leading-relaxed text-zinc-400">
                    Recebe 20% da subscrição mensal de cada cliente referenciado, mês após mês,
                    enquanto mantiver o plano.
                  </p>
                </div>
                <div className="mt-8 rounded-xl bg-zinc-800 p-4">
                  <p className="text-sm text-zinc-300">
                    <strong className="text-white">Exemplo:</strong> 10 clientes no plano Starter
                    (€39/mês) = <strong className="text-emerald-400">€78/mês</strong> sem esforço
                    adicional.
                  </p>
                </div>
              </div>

              {/* Benefit 2 */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-zinc-900">
                  Acesso de consulta incluído
                </h3>
                <p className="text-sm leading-relaxed text-zinc-600">
                  Visualize os dados financeiros dos seus clientes Ritmo — cobranças, atrasos,
                  previsão de caixa — sem custo adicional.
                </p>
              </div>

              {/* Benefit 3 */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50">
                  <Users className="h-5 w-5 text-violet-500" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-zinc-900">
                  Posicionamento diferenciado
                </h3>
                <p className="text-sm leading-relaxed text-zinc-600">
                  Deixa de ser só o contabilista. Passa a ser o parceiro que trouxe a solução que
                  eles não saberiam encontrar sozinhos.
                </p>
              </div>

              {/* Benefit 4 */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                  <Headphones className="h-5 w-5 text-emerald-500" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-zinc-900">Suporte dedicado</h3>
                <p className="text-sm leading-relaxed text-zinc-600">
                  Linha direta para contabilistas parceiros. Sem fila de suporte geral.
                </p>
              </div>

              {/* Benefit 5 */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                  <FileText className="h-5 w-5 text-amber-500" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-zinc-900">Materiais prontos</h3>
                <p className="text-sm leading-relaxed text-zinc-600">
                  1-pager, apresentação de 10 minutos, guião de conversa — tudo pronto para
                  apresentar ao cliente.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── SECTION 5: PLANOS E COMISSÕES ─── */}
        <section className="px-6 py-24">
          <div className="container mx-auto max-w-4xl">
            <h2 className="mb-4 text-center text-3xl leading-[1.1] font-medium tracking-tighter text-zinc-900 md:text-5xl">
              Planos dos seus clientes &middot; As suas comissões
            </h2>
            <p className="mx-auto mb-12 max-w-2xl text-center text-lg text-zinc-500">
              Quanto mais clientes referir, mais ganha — todos os meses.
            </p>

            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50">
                    <th className="px-6 py-4 text-sm font-semibold text-zinc-600">Plano</th>
                    <th className="px-6 py-4 text-sm font-semibold text-zinc-600">Preço</th>
                    <th className="hidden px-6 py-4 text-sm font-semibold text-zinc-600 sm:table-cell">
                      Para quem
                    </th>
                    <th className="px-6 py-4 text-sm font-semibold text-zinc-600">
                      Comissão parceiro
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-zinc-100 transition-colors hover:bg-zinc-50/50">
                    <td className="px-6 py-4 text-sm font-medium text-zinc-900">Free</td>
                    <td className="px-6 py-4 text-sm text-zinc-600">€0/mês</td>
                    <td className="hidden px-6 py-4 text-sm text-zinc-500 sm:table-cell">
                      Até 5 contratos, modo manual
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-400">&mdash;</td>
                  </tr>
                  <tr className="relative border-b border-zinc-100 bg-blue-50/30 transition-colors hover:bg-blue-50/50">
                    <td className="px-6 py-4 text-sm font-medium text-zinc-900">
                      <span className="flex items-center gap-2">
                        Starter
                        <span className="inline-flex rounded-full bg-gradient-to-r from-blue-400 to-emerald-400 px-2 py-0.5 text-[10px] leading-tight font-bold text-white uppercase">
                          Mais popular
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-zinc-900">€39/mês</td>
                    <td className="hidden px-6 py-4 text-sm text-zinc-500 sm:table-cell">
                      PME com 1–2 pessoas
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-emerald-600">€7,80/mês</td>
                  </tr>
                  <tr className="transition-colors hover:bg-zinc-50/50">
                    <td className="px-6 py-4 text-sm font-medium text-zinc-900">Pro</td>
                    <td className="px-6 py-4 text-sm font-semibold text-zinc-900">€99/mês</td>
                    <td className="hidden px-6 py-4 text-sm text-zinc-500 sm:table-cell">
                      Volume maior, equipas
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-emerald-600">€19,80/mês</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-6 text-center text-sm text-zinc-400">
              Comissões pagas mensalmente, automaticamente, para a conta bancária ou plataforma de
              pagamento configurada no painel de parceiro.
            </p>
          </div>
        </section>

        {/* ─── SECTION 6: COMO FUNCIONA — 3 PASSOS ─── */}
        <section className="border-y border-zinc-100 bg-zinc-50 px-6 py-24">
          <div className="container mx-auto max-w-4xl">
            <h2 className="mb-16 text-center text-3xl leading-[1.1] font-medium tracking-tighter text-zinc-900 md:text-5xl">
              Três passos para começar
            </h2>

            <div className="relative">
              {/* Timeline line */}
              <div className="absolute top-0 left-8 hidden h-full w-0.5 bg-gradient-to-b from-blue-200 via-emerald-200 to-emerald-100 md:block" />

              <div className="space-y-12">
                {[
                  {
                    num: "01",
                    title: "Registe-se gratuitamente",
                    text: "Preencha o formulário abaixo. Sem compromisso, sem custo de entrada.",
                    gradient: "from-blue-400 to-blue-500",
                  },
                  {
                    num: "02",
                    title: "Receba o seu link único",
                    text: "Um link rastreável para partilhar com os seus clientes. Cada subscrição via esse link é creditada à sua conta.",
                    gradient: "from-blue-400 to-emerald-400",
                  },
                  {
                    num: "03",
                    title: "Acompanhe e receba",
                    text: "Veja em tempo real quantos clientes subscreveram, que comissões gerou, e quando receberá o próximo pagamento.",
                    gradient: "from-emerald-400 to-emerald-500",
                  },
                ].map((step) => (
                  <div key={step.num} className="relative flex items-start gap-6 md:gap-8">
                    <div
                      className={`relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${step.gradient} text-xl font-bold text-white shadow-lg`}
                    >
                      {step.num}
                    </div>
                    <div className="pt-2">
                      <h3 className="mb-2 text-xl font-semibold text-zinc-900">{step.title}</h3>
                      <p className="max-w-lg leading-relaxed text-zinc-600">{step.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── SECTION 7: FAQ ─── */}
        <section className="px-6 py-24">
          <div className="container mx-auto max-w-6xl">
            <div className="grid gap-12 lg:grid-cols-12 lg:gap-24">
              <div className="space-y-6 lg:col-span-4">
                <h2 className="text-4xl leading-[1.1] font-medium tracking-tighter text-zinc-900 md:text-5xl">
                  Perguntas{" "}
                  <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                    frequentes
                  </span>
                </h2>
                <p className="leading-relaxed text-zinc-500">
                  Tudo o que precisa de saber antes de se registar como parceiro.
                </p>
              </div>

              <div className="space-y-4 lg:col-span-8">
                <Accordion type="single" collapsible className="w-full space-y-4">
                  {[
                    {
                      q: "Quanto custa tornar-me parceiro?",
                      a: "Nada. O registo é gratuito e não há taxa de parceiro. Ganha comissão quando os seus clientes subscrevem um plano pago.",
                    },
                    {
                      q: "Como funciona o rastreamento de referências?",
                      a: "Cada parceiro tem um link único. Quando um cliente subscreve através desse link, a referência fica associada à sua conta automaticamente.",
                    },
                    {
                      q: "Quando recebo a comissão?",
                      a: "As comissões são calculadas mensalmente e pagas no início do mês seguinte. Os detalhes estão no painel de parceiro.",
                    },
                    {
                      q: "O que acontece se um cliente cancelar?",
                      a: "A comissão é proporcional ao tempo em que o cliente manteve o plano ativo. Se cancelar, deixa de haver comissão desse cliente — sem penalizações para si.",
                    },
                    {
                      q: "Posso ver os dados dos meus clientes no Ritmo?",
                      a: "Sim. Os clientes que ativarem a partilha de dados permitem-lhe aceder ao seu dashboard de cobranças — cobranças emitidas, pagas, em atraso — sem custo adicional.",
                    },
                    {
                      q: "O Ritmo emite fatura certificada (ATCUD)?",
                      a: "O Ritmo integra-se com o InvoiceXpress para emissão de faturas certificadas. Os seus clientes podem continuar a usar o faturador que já têm.",
                    },
                    {
                      q: "Há um número mínimo de referências?",
                      a: "Não. Pode referenciar 1 ou 100 clientes. Não há mínimos nem quotas.",
                    },
                  ].map((faq, i) => (
                    <AccordionItem
                      key={i}
                      value={`faq-${i}`}
                      className="overflow-hidden rounded-2xl border border-zinc-100 bg-white px-2 shadow-sm transition-shadow duration-200 hover:shadow-md"
                    >
                      <AccordionTrigger className="px-6 py-5 text-left hover:no-underline [&[data-state=open]]:text-[var(--color-primary)]">
                        <span className="text-base font-medium text-zinc-700">{faq.q}</span>
                      </AccordionTrigger>
                      <AccordionContent className="bg-white px-6 pb-6 leading-relaxed text-zinc-600">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          </div>
        </section>

        {/* ─── SECTION 8: FORMULÁRIO DE REGISTO ─── */}
        <section id="partner-form" className="border-y border-zinc-100 bg-zinc-50 px-6 py-24">
          <div className="container mx-auto max-w-2xl">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl leading-[1.1] font-medium tracking-tighter text-zinc-900 md:text-5xl">
                Registar como parceiro
              </h2>
              <p className="text-lg text-zinc-500">
                Grátis. Sem compromisso. Em menos de 2 minutos.
              </p>
            </div>

            {submitted ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                  <Check className="h-7 w-7 text-emerald-600" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-zinc-900">Obrigado pelo registo!</h3>
                <p className="text-zinc-600">
                  O seu email deverá ter aberto com os dados preenchidos. Se não abriu, envie os
                  seus dados diretamente para{" "}
                  <a
                    href="mailto:parceiros@useritmo.pt"
                    className="font-medium text-blue-600 hover:underline"
                  >
                    parceiros@useritmo.pt
                  </a>
                  .
                </p>
              </div>
            ) : (
              <form
                ref={formRef}
                onSubmit={handleSubmit}
                className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm"
              >
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium text-zinc-700">
                      Nome completo <span className="text-red-400">*</span>
                    </label>
                    <Input
                      id="name"
                      required
                      placeholder="João Silva"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium text-zinc-700">
                      Email profissional <span className="text-red-400">*</span>
                    </label>
                    <Input
                      id="email"
                      type="email"
                      required
                      placeholder="joao@escritorio.pt"
                      value={formData.email}
                      onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="company" className="text-sm font-medium text-zinc-700">
                      Nome do escritório / empresa <span className="text-red-400">*</span>
                    </label>
                    <Input
                      id="company"
                      required
                      placeholder="Silva & Associados, Lda."
                      value={formData.company}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, company: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="nif" className="text-sm font-medium text-zinc-700">
                      NIF do escritório <span className="text-zinc-400">(opcional)</span>
                    </label>
                    <Input
                      id="nif"
                      placeholder="123456789"
                      value={formData.nif}
                      onChange={(e) => setFormData((prev) => ({ ...prev, nif: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700">
                      Número aproximado de clientes PME
                    </label>
                    <Select
                      onValueChange={(val) => setFormData((prev) => ({ ...prev, clients: val }))}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="<10">Menos de 10</SelectItem>
                        <SelectItem value="10-30">10 – 30</SelectItem>
                        <SelectItem value="30-100">30 – 100</SelectItem>
                        <SelectItem value="+100">Mais de 100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700">
                      Como soube do Ritmo?
                    </label>
                    <Select
                      onValueChange={(val) => setFormData((prev) => ({ ...prev, source: val }))}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recomendacao">Recomendação</SelectItem>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                        <SelectItem value="pesquisa">Pesquisa</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-12 w-full rounded-full bg-gradient-to-r from-blue-400 to-emerald-400 text-base font-medium text-white shadow-lg shadow-emerald-500/20 transition-all hover:from-blue-500 hover:to-emerald-500 hover:shadow-xl"
                >
                  {submitting ? "A abrir email..." : "Criar conta de parceiro — é grátis"}
                </Button>

                <p className="text-center text-xs text-zinc-400">
                  Ao criar conta, aceita os{" "}
                  <Link href="/termos" className="underline hover:text-zinc-600">
                    Termos do Programa de Parceiros
                  </Link>{" "}
                  e a{" "}
                  <Link href="/privacidade" className="underline hover:text-zinc-600">
                    Política de Privacidade
                  </Link>
                  .
                </p>

                <p className="text-center text-sm text-zinc-500">
                  Prefere falar primeiro?{" "}
                  <a
                    href="mailto:parceiros@useritmo.pt"
                    className="font-medium text-blue-600 hover:underline"
                  >
                    parceiros@useritmo.pt
                  </a>
                </p>
              </form>
            )}
          </div>
        </section>

        {/* ─── SECTION 9: CTA FINAL ─── */}
        <section className="relative overflow-hidden bg-black px-6 py-32 text-white">
          <div className="pointer-events-none absolute top-0 left-1/2 h-[400px] w-[800px] -translate-x-1/2 bg-gradient-to-b from-blue-500/10 via-emerald-500/5 to-transparent blur-3xl" />

          <div className="relative z-10 container mx-auto max-w-4xl text-center">
            <h2 className="mb-8 text-4xl leading-[1] font-medium tracking-tighter md:text-6xl">
              Os seus clientes já estão a perder tempo. Ajude-os hoje.
            </h2>
            <p className="mx-auto mb-12 max-w-2xl text-xl leading-relaxed text-zinc-400">
              O Ritmo é a ferramenta que faltava para as PMEs dos seus clientes. E a comissão
              recorrente é o seu reconhecimento por os ter colocado no caminho certo.
            </p>

            <Button
              size="lg"
              onClick={() => scrollToForm("final_cta")}
              className="h-16 rounded-full bg-gradient-to-r from-blue-400 to-emerald-400 px-12 text-lg font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 hover:from-blue-500 hover:to-emerald-500 hover:shadow-xl"
            >
              Registar como parceiro
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
