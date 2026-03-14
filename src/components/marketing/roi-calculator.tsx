"use client";
import { useState } from "react";
import Link from "next/link";

const PLAN_COSTS = {
  starter: { monthly: 39, annual: 31.2 },
  pro: { monthly: 99, annual: 79.2 },
};

const PRO_AUTOMATION_BONUS_PP = 5;

const BUCKETS = [
  { label: "€500 – €1.000", value: 750 },
  { label: "€1.000 – €2.500", value: 1750 },
  { label: "€2.500 – €5.000", value: 3750 },
  { label: "> €5.000", value: 6000 },
  { label: "Personalizado", value: 0 },
];

function track(event: string, props?: Record<string, unknown>) {
  if (typeof window !== "undefined" && "posthog" in window) {
    (
      window as unknown as {
        posthog: { capture: (e: string, p?: Record<string, unknown>) => void };
      }
    ).posthog.capture(event, props);
  }
}

export function RoiCalculator() {
  const [bucketIdx, setBucketIdx] = useState(0);
  const [customTicket, setCustomTicket] = useState(1000);
  const [margin, setMargin] = useState(20);
  const [proposals, setProposals] = useState(15);
  const [selectedPlan, setSelectedPlan] = useState<"starter" | "pro">("pro");
  const [teamSize, setTeamSize] = useState(1);
  const [isAnnual] = useState(false);

  const ticket = BUCKETS[bucketIdx].value || customTicket;

  const effectiveMargin =
    selectedPlan === "pro" ? Math.min(margin + PRO_AUTOMATION_BONUS_PP, 95) : margin;

  const monthlyProfit = ticket * (effectiveMargin / 100) * proposals;

  const monthlyCost = PLAN_COSTS[selectedPlan][isAnnual ? "annual" : "monthly"];

  const netStarter = ticket * (margin / 100) * proposals - PLAN_COSTS.starter.monthly;
  const balance = monthlyProfit - monthlyCost;

  function handleChange(field: string, value: number) {
    if (field === "bucket") setBucketIdx(value);
    if (field === "custom") setCustomTicket(value);
    if (field === "margin") setMargin(value);
    if (field === "proposals") setProposals(value);
    if (field === "teamSize") setTeamSize(value);
    track("roi-calculator.changed", {
      field,
      value,
      teamSize,
      proAutomationBonus: selectedPlan === "pro",
      gainDifferential: balance - netStarter,
    });
  }

  const proAhead = balance > netStarter;

  return (
    <section className="bg-zinc-50 px-4 py-16">
      <div className="mx-auto max-w-2xl">
        <h2 className="mb-2 text-center text-2xl font-bold text-zinc-900">
          Calcule o seu retorno com o Ritmo
        </h2>
        <p className="mb-6 text-center text-sm text-zinc-500">
          Veja quanto pode recuperar em receita todos os meses.
        </p>

        {/* Plan selector */}
        <div className="mb-8 flex justify-center gap-2">
          <button
            onClick={() => setSelectedPlan("starter")}
            className={`rounded-full border px-5 py-2 text-sm font-medium transition-colors ${
              selectedPlan === "starter"
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-zinc-300 text-zinc-600 hover:border-zinc-400"
            }`}
          >
            Starter — €39/mês
          </button>
          <button
            onClick={() => setSelectedPlan("pro")}
            className={`rounded-full border px-5 py-2 text-sm font-medium transition-colors ${
              selectedPlan === "pro"
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-zinc-300 text-zinc-600 hover:border-zinc-400"
            }`}
          >
            Pro — €99/mês · automações avançadas + equipa
          </button>
        </div>

        {/* Bucket */}
        <div className="mb-6">
          <label className="mb-3 block text-sm font-medium text-zinc-700">
            Ticket médio das suas propostas
          </label>
          <div className="flex flex-wrap gap-2">
            {BUCKETS.map((b, i) => (
              <button
                key={i}
                onClick={() => handleChange("bucket", i)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  bucketIdx === i
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-zinc-300 text-zinc-600 hover:border-zinc-400"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
          {BUCKETS[bucketIdx].value === 0 && (
            <div className="mt-3">
              <input
                type="number"
                min={100}
                max={50000}
                value={customTicket}
                onChange={(e) => handleChange("custom", Number(e.target.value))}
                className="w-40 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900"
                placeholder="Ex: 2000"
              />
              <span className="ml-2 text-sm text-zinc-500">€</span>
            </div>
          )}
        </div>

        {/* Margin slider */}
        <div className="mb-6">
          <label className="mb-3 block text-sm font-medium text-zinc-700">
            Margem de recuperação estimada:{" "}
            <span className="font-bold text-blue-600">{margin}%</span>
          </label>
          <input
            type="range"
            min={5}
            max={60}
            value={margin}
            onChange={(e) => handleChange("margin", Number(e.target.value))}
            className="w-full accent-blue-600"
          />
          <div className="mt-1 flex justify-between text-xs text-zinc-600">
            <span>5%</span>
            <span>60%</span>
          </div>
        </div>

        {/* Proposals stepper */}
        <div className="mb-6">
          <label className="mb-3 block text-sm font-medium text-zinc-700">
            Orçamentos enviados por mês:{" "}
            <span className="font-bold text-blue-600">{proposals}</span>
          </label>
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleChange("proposals", Math.max(1, proposals - 1))}
              className="h-10 w-10 rounded-full border border-zinc-300 text-lg font-bold text-zinc-600 hover:border-zinc-400"
            >
              −
            </button>
            <span className="w-8 text-center text-xl font-bold text-zinc-900">{proposals}</span>
            <button
              onClick={() => handleChange("proposals", Math.min(50, proposals + 1))}
              className="h-10 w-10 rounded-full border border-zinc-300 text-lg font-bold text-zinc-600 hover:border-zinc-400"
            >
              +
            </button>
          </div>
        </div>

        {/* Team size stepper — Pro only, space reserved to avoid layout jump */}
        <div className={`mb-10 ${selectedPlan === "pro" ? "" : "invisible"}`}>
          <label className="mb-3 block text-sm font-medium text-zinc-700">
            Utilizadores na equipa: <span className="font-bold text-blue-600">{teamSize}</span>
          </label>
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleChange("teamSize", Math.max(1, teamSize - 1))}
              className="h-10 w-10 rounded-full border border-zinc-300 text-lg font-bold text-zinc-600 hover:border-zinc-400"
            >
              −
            </button>
            <span className="w-8 text-center text-xl font-bold text-zinc-900">{teamSize}</span>
            <button
              onClick={() => handleChange("teamSize", Math.min(5, teamSize + 1))}
              className="h-10 w-10 rounded-full border border-zinc-300 text-lg font-bold text-zinc-600 hover:border-zinc-400"
            >
              +
            </button>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            O Pro inclui até 5 utilizadores, cada um com o seu próprio pipeline.
          </p>
        </div>

        {/* Result */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="mb-4 text-center text-sm text-zinc-500">
            Retorno estimado com o Ritmo — Plano {selectedPlan === "pro" ? "Pro" : "Starter"}
          </p>

          {/* Effective margin — Pro only */}
          {selectedPlan === "pro" && (
            <div className="mb-4 flex items-center justify-between rounded-lg bg-zinc-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-zinc-700">Margem efectiva</p>
                <p className="text-xs text-zinc-400">{margin}% base + 5% automações Pro</p>
              </div>
              <p className="text-lg font-bold text-blue-600">{effectiveMargin}%</p>
            </div>
          )}

          {/* Main result */}
          <div className="mb-4 rounded-xl border border-blue-500/30 bg-gradient-to-b from-blue-500/10 to-emerald-500/10 p-5 text-center">
            <p className="mb-1 text-xs font-medium text-blue-600">Ganho estimado/mês</p>
            <p className="text-3xl font-bold text-zinc-900">
              {balance >= 0 ? "+" : ""}€{Math.round(balance).toLocaleString("pt-PT")}
              <span className="text-sm font-normal text-zinc-500">/mês</span>
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              €{Math.round(monthlyProfit).toLocaleString("pt-PT")} recuperados − €{monthlyCost} do
              plano = €{Math.round(balance).toLocaleString("pt-PT")}
            </p>
          </div>

          {/* Pro vs Starter comparison banner */}
          {selectedPlan === "pro" && proAhead && (
            <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-2 text-center text-sm text-emerald-700">
              Pro recupera +€{Math.round(balance - netStarter).toLocaleString("pt-PT")}/mês vs
              Starter neste cenário
            </div>
          )}

          {/* Negative balance on Starter */}
          {selectedPlan === "starter" && balance < 0 && (
            <div className="mb-4 rounded-lg bg-amber-50 px-4 py-2 text-center text-sm text-amber-700">
              Com este volume, o Starter tem retorno negativo. O Pro, com automações, pode alterar
              esse cálculo.
            </div>
          )}

          <Link
            href="/#pricing"
            onClick={() =>
              track("roi-calculator.cta_clicked", {
                netStarter,
                balance,
                selectedPlan,
                teamSize,
                proAutomationBonus: selectedPlan === "pro",
                gainDifferential: balance - netStarter,
              })
            }
            className="block w-full rounded-xl bg-blue-600 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-blue-500"
          >
            Começar agora — planos a partir de €39/mês
          </Link>

          <p className="mt-4 text-center text-xs text-zinc-400">
            Estimativa baseada em orçamentos recuperados por acção de follow-up. Resultados reais
            dependem do sector, ticket real e taxa de resposta dos seus clientes.
          </p>
        </div>
      </div>
    </section>
  );
}
