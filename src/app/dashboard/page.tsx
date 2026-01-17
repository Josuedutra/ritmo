import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppHeader, PageHeader, StatCard } from "@/components/layout";
import { Button, Card, CardHeader, CardTitle, CardContent, EmptyStateNoActions, Badge } from "@/components/ui";
import { Plus, FileText, Clock, TrendingUp, Phone, Mail } from "lucide-react";

export default async function DashboardPage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    // TODO: Fetch real data from API
    const stats = {
        actionsToday: 0,
        quotesSent: 0,
        pendingResponses: 0,
        pipelineValue: 0,
    };

    return (
        <div className="min-h-screen bg-[var(--color-background)]">
            <AppHeader user={session.user} />

            <main className="container-app py-6">
                <PageHeader
                    title="Dashboard"
                    description="Visão geral das suas ações de follow-up"
                >
                    <Link href="/quotes/new">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Novo orçamento
                        </Button>
                    </Link>
                </PageHeader>

                {/* Stats Grid */}
                <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        label="Ações hoje"
                        value={stats.actionsToday}
                        icon={<Clock className="h-4 w-4" />}
                    />
                    <StatCard
                        label="Orçamentos enviados"
                        value={stats.quotesSent}
                        icon={<FileText className="h-4 w-4" />}
                    />
                    <StatCard
                        label="Sem resposta"
                        value={stats.pendingResponses}
                        icon={<TrendingUp className="h-4 w-4" />}
                    />
                    <StatCard
                        label="Em pipeline"
                        value={`€${stats.pipelineValue.toLocaleString("pt-PT")}`}
                        icon={<TrendingUp className="h-4 w-4" />}
                    />
                </div>

                {/* Content Grid */}
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Actions Today */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                                    Ações de hoje
                                </CardTitle>
                                <div className="flex gap-2">
                                    <Badge variant="secondary">
                                        <Mail className="mr-1 h-3 w-3" />
                                        0 emails
                                    </Badge>
                                    <Badge variant="secondary">
                                        <Phone className="mr-1 h-3 w-3" />
                                        0 chamadas
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <EmptyStateNoActions />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Quick Actions */}
                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Acções rápidas</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Link
                                    href="/quotes/new"
                                    className="flex items-center gap-3 rounded-md border border-[var(--color-border)] p-3 transition-colors hover:bg-[var(--color-accent)]"
                                >
                                    <div className="rounded-md bg-[var(--color-primary)]/10 p-2">
                                        <Plus className="h-4 w-4 text-[var(--color-primary)]" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium">Novo orçamento</div>
                                        <div className="text-xs text-[var(--color-muted-foreground)]">
                                            Criar e acompanhar
                                        </div>
                                    </div>
                                </Link>

                                <Link
                                    href="/quotes"
                                    className="flex items-center gap-3 rounded-md border border-[var(--color-border)] p-3 transition-colors hover:bg-[var(--color-accent)]"
                                >
                                    <div className="rounded-md bg-[var(--color-secondary)] p-2">
                                        <FileText className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium">Ver orçamentos</div>
                                        <div className="text-xs text-[var(--color-muted-foreground)]">
                                            Lista completa
                                        </div>
                                    </div>
                                </Link>
                            </CardContent>
                        </Card>

                        {/* Usage Meter (placeholder) */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Utilização mensal</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="mb-2 flex items-baseline justify-between">
                                    <span className="text-2xl font-semibold">0</span>
                                    <span className="text-sm text-[var(--color-muted-foreground)]">/ 10 orçamentos</span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-muted)]">
                                    <div
                                        className="h-full rounded-full bg-[var(--color-primary)]"
                                        style={{ width: "0%" }}
                                    />
                                </div>
                                <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
                                    Plano gratuito · <Link href="/settings/billing" className="underline">Atualizar</Link>
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
