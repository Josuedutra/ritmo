"use client";
import { useState } from "react";

const PLAN_COSTS = {
  starter: { monthly: 39, annual: 31.2 },
  pro: { monthly: 99, annual: 79.2 },
};

const BUCKETS = [
  { label: "€500 – €1.000", value: 750 },
  { label: "€1.000 – €2.500", value: 1750 },
  { label: "€2.500 – €5.000", value: 3750 },
  { label: "> €5.000", value: 6000 },
  { label: "Personalizado", value: 0 },
];

function track(event: string, props?: Record<string, unknown>) {
  if (typeof window !== "undefined" && "posthog" in window) {
    (window as unknown as { posthog: { capture: (e: string, p?: Record<string, unknown>) => void } }).posthog.capture(event, props);
  }
}

export function RoiCalculator() {
  const [bucketIdx, setBucketIdx] = useState(0);
  const [customTicket, setCustomTicket] = useState(1000);
  const [margin, setMargin] = useState(20);
  const [proposals, setProposals] = useState(3);

  const ticket = BUCKETS[bucketIdx].value || customTicket;
  const recovered = ticket * (margin / 100) * proposals;
  const netStarter = recovered - PLAN_COSTS.starter.monthly;
  const netPro = recovered - PLAN_COSTS.pro.monthly;

  function handleChange(field: string, value: number) {
    if (field === "bucket") setBucketIdx(value);
    if (field === "custom") setCustomTicket(value);
    if (field === "margin") setMargin(value);
    if (field === "proposals") setProposals(value);
    track("roi-calculator.changed", { field, value });
  }

  return (
    <section className="bg-zinc-950 py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-white text-center mb-2">
          Calcule o seu retorno com o Ritmo
        </h2>
        <p className="text-zinc-400 text-center mb-10 text-sm">
          Veja quanto pode recuperar em receita todos os meses.
        </p>

        {/* Bucket */}
        <div className="mb-6">
          <label className="block text-zinc-300 text-sm font-medium mb-3">
            Ticket médio das suas propostas
          </label>
          <div className="flex flex-wrap gap-2">
            {BUCKETS.map((b, i) => (
              <button
                key={i}
                onClick={() => handleChange("bucket", i)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                  bucketIdx === i
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
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
                className="bg-zinc-900 border border-zinc-700 text-white rounded-lg px-4 py-2 w-40 text-sm"
                placeholder="Ex: 2000"
              />
              <span className="text-zinc-500 text-sm ml-2">€</span>
            </div>
          )}
        </div>

        {/* Margin slider */}
        <div className="mb-6">
          <label className="block text-zinc-300 text-sm font-medium mb-3">
            Margem de recuperação estimada:{" "}
            <span className="text-blue-400 font-bold">{margin}%</span>
          </label>
          <input
            type="range"
            min={5}
            max={60}
            value={margin}
            onChange={(e) => handleChange("margin", Number(e.target.value))}
            className="w-full accent-blue-600"
          />
          <div className="flex justify-between text-zinc-600 text-xs mt-1">
            <span>5%</span><span>60%</span>
          </div>
        </div>

        {/* Proposals stepper */}
        <div className="mb-10">
          <label className="block text-zinc-300 text-sm font-medium mb-3">
            Propostas recuperadas por mês:{" "}
            <span className="text-blue-400 font-bold">{proposals}</span>
          </label>
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleChange("proposals", Math.max(1, proposals - 1))}
              className="w-10 h-10 rounded-full border border-zinc-700 text-zinc-300 hover:border-zinc-500 text-lg font-bold"
            >
              −
            </button>
            <span className="text-white text-xl font-bold w-8 text-center">{proposals}</span>
            <button
              onClick={() => handleChange("proposals", Math.min(10, proposals + 1))}
              className="w-10 h-10 rounded-full border border-zinc-700 text-zinc-300 hover:border-zinc-500 text-lg font-bold"
            >
              +
            </button>
          </div>
        </div>

        {/* Result */}
        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
          <p className="text-zinc-400 text-sm text-center mb-4">Retorno estimado com o Ritmo</p>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-zinc-800 rounded-xl p-4 text-center">
              <p className="text-zinc-500 text-xs mb-1">Plano Starter</p>
              <p className="text-2xl font-bold text-white">
                +€{Math.max(0, Math.round(netStarter)).toLocaleString("pt-PT")}
                <span className="text-sm font-normal text-zinc-400">/mês</span>
              </p>
              <p className="text-zinc-600 text-xs mt-1">Receita − €{PLAN_COSTS.starter.monthly}/mês</p>
            </div>
            <div className="bg-gradient-to-b from-blue-500/20 to-emerald-500/20 rounded-xl p-4 text-center border border-blue-500/30">
              <p className="text-blue-400 text-xs mb-1 font-medium">Plano Pro</p>
              <p className="text-2xl font-bold text-white">
                +€{Math.max(0, Math.round(netPro)).toLocaleString("pt-PT")}
                <span className="text-sm font-normal text-zinc-400">/mês</span>
              </p>
              <p className="text-zinc-600 text-xs mt-1">Receita − €{PLAN_COSTS.pro.monthly}/mês</p>
            </div>
          </div>
          <a
            href="/#pricing"
            onClick={() => track("roi-calculator.cta_clicked", { netStarter, netPro })}
            className="block w-full bg-blue-600 hover:bg-blue-500 text-white text-center py-3 rounded-xl font-semibold transition-colors text-sm"
          >
            Começar agora — planos a partir de €39/mês
          </a>
        </div>
      </div>
    </section>
  );
}
