"use client";

import { motion } from "framer-motion";
import { Logo } from "@/components/brand";
import {
  LayoutDashboard,
  FileText,
  Mail,
  Settings,
  LogOut,
  Plus,
  Clock,
  TrendingUp,
  Menu,
  CheckCircle2,
  AlertCircle,
  Search,
  Bell,
} from "lucide-react";

export function DashboardPreview() {
  return (
    <div className="perspective-1000 relative mx-auto w-full max-w-5xl rotate-x-12 transform overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
      {/* Minimal App Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 bg-white/50 px-6 py-3 backdrop-blur-sm dark:border-zinc-900 dark:bg-zinc-950/50">
        <div className="flex items-center gap-6">
          <Logo size="sm" />
          <div className="hidden items-center gap-4 text-sm text-zinc-500 md:flex">
            <span className="font-medium text-zinc-900">Dashboard</span>
            <span>Orçamentos</span>
            <span>Templates</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900">
            <Search className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900">
            <Bell className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600"></div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex h-[500px]">
        {/* Sidebar (Mini) */}
        <div className="flex w-16 flex-col items-center gap-6 border-r border-zinc-100 bg-zinc-50/50 py-6 dark:border-zinc-900 dark:bg-zinc-900/50">
          <LayoutDashboard className="text-primary h-5 w-5" />
          <FileText className="h-5 w-5 text-zinc-400" />
          <Mail className="h-5 w-5 text-zinc-400" />
          <Settings className="h-5 w-5 text-zinc-400" />
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-zinc-50/30 p-8 dark:bg-black/20">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Dashboard</h2>
              <p className="text-zinc-500">Visão geral das suas ações</p>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black">
              <Plus className="h-4 w-4" /> Novo Orçamento
            </div>
          </div>

          {/* Stats */}
          <div className="mb-8 grid grid-cols-4 gap-4">
            {[
              { label: "Ações hoje", value: "12", icon: Clock },
              { label: "Enviados", value: "45", icon: FileText },
              { label: "Sem resposta", value: "8", icon: AlertCircle },
              { label: "Em pipeline", value: "€124k", icon: TrendingUp },
            ].map((stat, i) => (
              <div
                key={i}
                className="rounded-xl border border-zinc-100 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-500">{stat.label}</span>
                  <stat.icon className="h-4 w-4 text-zinc-400" />
                </div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-white">{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Action List (Fake) */}
          <div className="rounded-xl border border-zinc-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white">
              <Clock className="h-4 w-4" /> Ações Prioritárias
            </h3>
            <div className="space-y-3">
              {[1, 2, 3].map((_, i) => (
                <div
                  key={i}
                  className="hover:border-primary/30 group flex cursor-pointer items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 p-3 transition-colors dark:border-zinc-800 dark:bg-zinc-950/50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-2 w-2 rounded-full ${i === 0 ? "bg-red-500" : "bg-blue-500"}`}
                    />
                    <div>
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-200">
                        Follow-up: Quinta do Lago
                      </div>
                      <div className="text-xs text-zinc-500">Orçamento #1942 • €24,500</div>
                    </div>
                  </div>
                  <div className="rounded border bg-white px-3 py-1 text-xs font-medium text-zinc-700 opacity-0 shadow-sm group-hover:opacity-100">
                    Enviar Email
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Reflection/Glass Effect overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent" />
    </div>
  );
}
