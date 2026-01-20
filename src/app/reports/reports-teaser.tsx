"use client";

import Link from "next/link";
import { Card, CardContent, Button } from "@/components/ui";
import {
    Lock,
    ArrowRight,
    Send,
    CheckCircle,
    Target,
    Clock,
    BarChart3,
} from "lucide-react";

interface ReportsTeaserProps {
    planRequired: string;
}

export function ReportsTeaser({ planRequired }: ReportsTeaserProps) {
    return (
        <div className="space-y-6">
            {/* Teaser Header */}
            <Card className="relative overflow-hidden border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
                <CardContent className="py-12 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/10">
                        <BarChart3 className="h-8 w-8 text-purple-500" />
                    </div>
                    <h2 className="mb-2 text-xl font-semibold">
                        Relatórios Avançados
                    </h2>
                    <p className="mx-auto mb-6 max-w-md text-[var(--color-muted-foreground)]">
                        Acompanhe o desempenho da sua equipa com métricas detalhadas.
                        Veja tendências, taxas de conversão e identifique oportunidades.
                    </p>
                    <Link href="/settings/billing">
                        <Button className="gap-2">
                            Atualizar para {planRequired}
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </Link>
                </CardContent>
            </Card>

            {/* Blurred Preview */}
            <div className="relative">
                <div className="pointer-events-none select-none blur-sm opacity-60">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <PreviewKPI
                            title="Envios"
                            value="24"
                            icon={<Send className="h-5 w-5" />}
                        />
                        <PreviewKPI
                            title="Ações Concluídas"
                            value="89"
                            icon={<CheckCircle className="h-5 w-5" />}
                        />
                        <PreviewKPI
                            title="Taxa de Follow-up"
                            value="76%"
                            icon={<Target className="h-5 w-5" />}
                        />
                        <PreviewKPI
                            title="Sem Resposta >24h"
                            value="3"
                            icon={<Clock className="h-5 w-5" />}
                        />
                    </div>
                </div>

                {/* Lock overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="rounded-full bg-[var(--color-background)]/80 p-4 shadow-lg">
                        <Lock className="h-8 w-8 text-[var(--color-muted-foreground)]" />
                    </div>
                </div>
            </div>

            {/* Features List */}
            <Card>
                <CardContent className="py-6">
                    <h3 className="mb-4 text-sm font-medium text-[var(--color-muted-foreground)]">
                        Incluído no plano {planRequired}:
                    </h3>
                    <ul className="space-y-3 text-sm">
                        <FeatureItem>KPIs de envios e ações dos últimos 30 dias</FeatureItem>
                        <FeatureItem>Taxa de follow-up executado vs. agendado</FeatureItem>
                        <FeatureItem>Monitorização de orçamentos sem resposta</FeatureItem>
                        <FeatureItem>Gráficos de tendência diária</FeatureItem>
                        <FeatureItem>Breakdown por tipo de ação (emails, chamadas, tarefas)</FeatureItem>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}

function PreviewKPI({
    title,
    value,
    icon,
}: {
    title: string;
    value: string;
    icon: React.ReactNode;
}) {
    return (
        <Card>
            <CardContent className="pt-6">
                <div className="rounded-lg bg-[var(--color-muted)] p-2 w-fit">
                    {icon}
                </div>
                <div className="mt-4">
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-sm text-[var(--color-muted-foreground)]">{title}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function FeatureItem({ children }: { children: React.ReactNode }) {
    return (
        <li className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            {children}
        </li>
    );
}
