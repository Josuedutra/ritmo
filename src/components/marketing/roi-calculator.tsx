"use client";
import { useState } from "react";
import Link from "next/link";

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
    <section className="bg-zinc-950 px-4 py-16">
      <div className="mx-auto max-w-2xl">
        <h2 className="mb-2 text-center text-2xl font-bold text-white">
          Calcule o seu retorno com o Ritmo
        </h2>
        <p className="mb-10 text-center text-sm text-zinc-400">
          Veja quanto pode recuperar em receita todos os meses.
        </p>

        {/* Bucket */}
        <div className="mb-6">
          <label className="mb-3 block text-sm font-medium text-zinc-300">
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
                className="w-40 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-white"
                placeholder="Ex: 2000"
              />
              <span className="ml-2 text-sm text-zinc-500">€</span>
            </div>
          )}
        </div>

        {/* Margin slider */}
        <div className="mb-6">
          <label className="mb-3 block text-sm font-medium text-zinc-300">
            Margem de recuperação estimada:{" "}
            <span className="font-bold text-blue-400">{margin}%</span>
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
        <div className="mb-10">
          <label className="mb-3 block text-sm font-medium text-zinc-300">
            Propostas recuperadas por mês:{" "}
            <span className="font-bold text-blue-400">{proposals}</span>
          </label>
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleChange("proposals", Math.max(1, proposals - 1))}
              className="h-10 w-10 rounded-full border border-zinc-700 text-lg font-bold text-zinc-300 hover:border-zinc-500"
            >
              −
            </button>
            <span className="w-8 text-center text-xl font-bold text-white">{proposals}</span>
            <button
              onClick={() => handleChange("proposals", Math.min(10, proposals + 1))}
              className="h-10 w-10 rounded-full border border-zinc-700 text-lg font-bold text-zinc-300 hover:border-zinc-500"
            >
              +
            </button>
          </div>
        </div>

        {/* Result */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="mb-4 text-center text-sm text-zinc-400">Retorno estimado com o Ritmo</p>
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-zinc-800 p-4 text-center">
              <p className="mb-1 text-xs text-zinc-500">Plano Starter</p>
              <p className="text-2xl font-bold text-white">
                +€{Math.max(0, Math.round(netStarter)).toLocaleString("pt-PT")}
                <span className="text-sm font-normal text-zinc-400">/mês</span>
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                Receita − €{PLAN_COSTS.starter.monthly}/mês
              </p>
            </div>
            <div className="rounded-xl border border-blue-500/30 bg-gradient-to-b from-blue-500/20 to-emerald-500/20 p-4 text-center">
              <p className="mb-1 text-xs font-medium text-blue-400">Plano Pro</p>
              <p className="text-2xl font-bold text-white">
                +€{Math.max(0, Math.round(netPro)).toLocaleString("pt-PT")}
                <span className="text-sm font-normal text-zinc-400">/mês</span>
              </p>
              <p className="mt-1 text-xs text-zinc-600">Receita − €{PLAN_COSTS.pro.monthly}/mês</p>
            </div>
          </div>
          <Link
            href="/#pricing"
            onClick={() => track("roi-calculator.cta_clicked", { netStarter, netPro })}
            className="block w-full rounded-xl bg-blue-600 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-blue-500"
          >
            Começar agora — planos a partir de €39/mês
          </Link>
        </div>
      </div>
    </section>
  );
}
