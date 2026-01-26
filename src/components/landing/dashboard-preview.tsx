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
    Bell
} from "lucide-react";

export function DashboardPreview() {
    return (
        <div className="relative w-full max-w-5xl mx-auto bg-white dark:bg-zinc-950 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden transform rotate-x-12 perspective-1000">
            {/* Minimal App Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-100 dark:border-zinc-900 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm">
                <div className="flex items-center gap-6">
                    <Logo size="sm" />
                    <div className="hidden md:flex items-center gap-4 text-sm text-zinc-500">
                        <span className="text-zinc-900 font-medium">Dashboard</span>
                        <span>Orçamentos</span>
                        <span>Templates</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
                        <Search className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
                        <Bell className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600"></div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex h-[500px]">
                {/* Sidebar (Mini) */}
                <div className="w-16 border-r border-zinc-100 dark:border-zinc-900 flex flex-col items-center py-6 gap-6 bg-zinc-50/50 dark:bg-zinc-900/50">
                    <LayoutDashboard className="w-5 h-5 text-primary" />
                    <FileText className="w-5 h-5 text-zinc-400" />
                    <Mail className="w-5 h-5 text-zinc-400" />
                    <Settings className="w-5 h-5 text-zinc-400" />
                </div>

                {/* Main Content */}
                <div className="flex-1 p-8 bg-zinc-50/30 dark:bg-black/20">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Dashboard</h2>
                            <p className="text-zinc-500">Visão geral das suas ações</p>
                        </div>
                        <div className="px-4 py-2 bg-zinc-900 text-white dark:bg-white dark:text-black rounded-lg text-sm font-medium flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Novo Orçamento
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-4 mb-8">
                        {[
                            { label: "Ações hoje", value: "12", icon: Clock },
                            { label: "Enviados", value: "45", icon: FileText },
                            { label: "Sem resposta", value: "8", icon: AlertCircle },
                            { label: "Em pipeline", value: "€124k", icon: TrendingUp },
                        ].map((stat, i) => (
                            <div key={i} className="bg-white dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-zinc-500 font-medium">{stat.label}</span>
                                    <stat.icon className="w-4 h-4 text-zinc-400" />
                                </div>
                                <div className="text-2xl font-bold text-zinc-900 dark:text-white">{stat.value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Action List (Fake) */}
                    <div className="bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm p-6">
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                            <Clock className="w-4 h-4" /> Ações Prioritárias
                        </h3>
                        <div className="space-y-3">
                            {[1, 2, 3].map((_, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800 hover:border-primary/30 transition-colors cursor-pointer group">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${i === 0 ? "bg-red-500" : "bg-blue-500"}`} />
                                        <div>
                                            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-200">Follow-up: Quinta do Lago</div>
                                            <div className="text-xs text-zinc-500">Orçamento #1942 • €24,500</div>
                                        </div>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 px-3 py-1 bg-white border shadow-sm rounded text-xs font-medium text-zinc-700">
                                        Enviar Email
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Reflection/Glass Effect overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
        </div>
    );
}
