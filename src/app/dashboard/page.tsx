import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { startOfDay, endOfDay } from "date-fns";
import { AppHeader, PageHeader, StatCard } from "@/components/layout";
import {
    Button,
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from "@/components/ui";
import { Plus, FileText, Clock, TrendingUp } from "lucide-react";
import { ActionsList } from "@/components/actions";

// Map event types to template codes
const EVENT_TO_TEMPLATE: Record<string, string> = {
    email_d1: "T2",
    email_d3: "T3",
    email_d14: "T5",
    call_d7: "CALL_SCRIPT",
};

async function getDashboardData(organizationId: string, timezone: string) {
    const nowInTz = toZonedTime(new Date(), timezone);
    const todayStart = fromZonedTime(startOfDay(nowInTz), timezone);
    const todayEnd = fromZonedTime(endOfDay(nowInTz), timezone);

    const [
        todayEvents,
        todayTasks,
        quotesSent,
        pendingQuotes,
        pipelineAgg,
        usageCounter,
        subscription,
        templates,
    ] = await Promise.all([
        // Today's cadence events
        prisma.cadenceEvent.findMany({
            where: {
                organizationId,
                scheduledFor: { gte: todayStart, lte: todayEnd },
                status: { in: ["scheduled", "claimed"] },
            },
            select: {
                id: true,
                eventType: true,
                scheduledFor: true,
                status: true,
                priority: true,
                quote: {
                    select: {
                        id: true,
                        title: true,
                        reference: true,
                        value: true,
                        firstSentAt: true,
                        proposalLink: true,
                        proposalFileId: true,
                        contact: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                company: true,
                                phone: true,
                            },
                        },
                    },
                },
            },
            orderBy: [{ priority: "desc" }, { scheduledFor: "asc" }],
        }),
        // Today's tasks
        prisma.task.findMany({
            where: {
                organizationId,
                dueAt: { gte: todayStart, lte: todayEnd },
                status: "pending",
            },
            select: {
                id: true,
                type: true,
                title: true,
                description: true,
                dueAt: true,
                priority: true,
                status: true,
                quote: {
                    select: {
                        id: true,
                        title: true,
                        reference: true,
                        value: true,
                        contact: {
                            select: {
                                id: true,
                                name: true,
                                company: true,
                                email: true,
                                phone: true,
                            },
                        },
                    },
                },
            },
            orderBy: [{ priority: "desc" }, { dueAt: "asc" }],
        }),
        // Quotes sent count
        prisma.quote.count({
            where: { organizationId, businessStatus: "sent" },
        }),
        // Pending responses
        prisma.quote.count({
            where: { organizationId, businessStatus: "sent" },
        }),
        // Pipeline value
        prisma.quote.aggregate({
            where: {
                organizationId,
                businessStatus: { in: ["sent", "negotiation"] },
            },
            _sum: { value: true },
        }),
        // Usage
        prisma.usageCounter.findFirst({
            where: {
                organizationId,
                periodStart: { lte: new Date() },
                periodEnd: { gte: new Date() },
            },
        }),
        // Subscription
        prisma.subscription.findUnique({
            where: { organizationId },
        }),
        // Templates for cadence events
        prisma.template.findMany({
            where: {
                organizationId,
                isActive: true,
                code: { in: Object.values(EVENT_TO_TEMPLATE) },
            },
            select: {
                code: true,
                name: true,
                subject: true,
                body: true,
            },
        }),
    ]);

    // Create template lookup
    const templateMap = new Map(templates.map((t) => [t.code, t]));
    const getTemplate = (eventType: string) => {
        const code = EVENT_TO_TEMPLATE[eventType];
        return code ? templateMap.get(code) || null : null;
    };

    // Separate events by type and serialize
    const emailEvents = todayEvents
        .filter((e) => e.eventType.startsWith("email_"))
        .map((e) => ({
            id: e.id,
            type: "email" as const,
            eventType: e.eventType,
            scheduledFor: e.scheduledFor.toISOString(),
            status: e.status,
            priority: e.priority,
            quote: {
                id: e.quote.id,
                title: e.quote.title,
                reference: e.quote.reference,
                value: e.quote.value?.toNumber() ?? null,
                firstSentAt: e.quote.firstSentAt?.toISOString() ?? null,
                proposalLink: e.quote.proposalLink,
                hasProposalFile: !!e.quote.proposalFileId,
                contact: e.quote.contact,
            },
            template: getTemplate(e.eventType),
        }));

    const callEvents = todayEvents
        .filter((e) => e.eventType === "call_d7")
        .map((e) => ({
            id: e.id,
            type: "call" as const,
            eventType: e.eventType,
            scheduledFor: e.scheduledFor.toISOString(),
            status: e.status,
            priority: e.priority,
            quote: {
                id: e.quote.id,
                title: e.quote.title,
                reference: e.quote.reference,
                value: e.quote.value?.toNumber() ?? null,
                firstSentAt: e.quote.firstSentAt?.toISOString() ?? null,
                proposalLink: e.quote.proposalLink,
                hasProposalFile: !!e.quote.proposalFileId,
                contact: e.quote.contact,
            },
            template: getTemplate(e.eventType),
        }));

    const tasks = todayTasks.map((t) => ({
        id: t.id,
        type: "task" as const,
        taskType: t.type,
        title: t.title,
        description: t.description,
        dueAt: t.dueAt?.toISOString() ?? new Date().toISOString(),
        priority: t.priority,
        status: t.status,
        quote: {
            id: t.quote.id,
            title: t.quote.title,
            reference: t.quote.reference,
            value: t.quote.value?.toNumber() ?? null,
            contact: t.quote.contact,
        },
    }));

    return {
        stats: {
            actionsToday: todayEvents.length + todayTasks.length,
            quotesSent,
            pendingResponses: pendingQuotes,
            pipelineValue: pipelineAgg._sum.value?.toNumber() ?? 0,
        },
        actions: {
            emails: emailEvents,
            calls: callEvents,
            tasks,
        },
        usage: {
            quotesSent: usageCounter?.quotesSent ?? 0,
            quotesLimit: subscription?.quotesLimit ?? 10,
            percentUsed: Math.round(((usageCounter?.quotesSent ?? 0) / (subscription?.quotesLimit ?? 10)) * 100),
        },
        plan: subscription?.planId ?? "free",
    };
}

export default async function DashboardPage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    // Get organization timezone
    const org = await prisma.organization.findUnique({
        where: { id: session.user.organizationId },
        select: { timezone: true },
    });

    const timezone = org?.timezone ?? "Europe/Lisbon";
    const data = await getDashboardData(session.user.organizationId, timezone);

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
                        value={data.stats.actionsToday}
                        icon={<Clock className="h-4 w-4" />}
                    />
                    <StatCard
                        label="Orçamentos enviados"
                        value={data.stats.quotesSent}
                        icon={<FileText className="h-4 w-4" />}
                    />
                    <StatCard
                        label="Sem resposta"
                        value={data.stats.pendingResponses}
                        icon={<TrendingUp className="h-4 w-4" />}
                    />
                    <StatCard
                        label="Em pipeline"
                        value={`€${data.stats.pipelineValue.toLocaleString("pt-PT")}`}
                        icon={<TrendingUp className="h-4 w-4" />}
                    />
                </div>

                {/* Content Grid */}
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Actions Today */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                                    Ações de hoje
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ActionsList
                                    emails={data.actions.emails}
                                    calls={data.actions.calls}
                                    tasks={data.actions.tasks}
                                />
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

                        {/* Usage Meter */}
                        <Card className={data.usage.percentUsed >= 100 ? "border-red-500/50" : data.usage.percentUsed >= 80 ? "border-orange-500/50" : ""}>
                            <CardHeader>
                                <CardTitle className="text-sm">Utilização mensal</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="mb-2 flex items-baseline justify-between">
                                    <span className="text-2xl font-semibold">
                                        {data.usage.quotesSent}
                                    </span>
                                    <span className="text-sm text-[var(--color-muted-foreground)]">
                                        / {data.usage.quotesLimit} orçamentos
                                    </span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-muted)]">
                                    <div
                                        className={`h-full rounded-full ${
                                            data.usage.percentUsed >= 100
                                                ? "bg-red-500"
                                                : data.usage.percentUsed >= 80
                                                    ? "bg-orange-500"
                                                    : "bg-[var(--color-primary)]"
                                        }`}
                                        style={{
                                            width: `${Math.min(100, data.usage.percentUsed)}%`,
                                        }}
                                    />
                                </div>
                                {data.usage.percentUsed >= 100 ? (
                                    <div className="mt-3 rounded-md bg-red-500/10 p-2">
                                        <p className="text-xs font-medium text-red-500">
                                            Limite atingido. Atualize o plano para continuar.
                                        </p>
                                        <Link
                                            href="/settings/billing"
                                            className="mt-1 inline-flex items-center text-xs font-medium text-red-500 underline"
                                        >
                                            Atualizar plano →
                                        </Link>
                                    </div>
                                ) : data.usage.percentUsed >= 80 ? (
                                    <div className="mt-3 rounded-md bg-orange-500/10 p-2">
                                        <p className="text-xs text-orange-500">
                                            {100 - data.usage.percentUsed}% restante. Considere atualizar.
                                        </p>
                                        <Link
                                            href="/settings/billing"
                                            className="mt-1 inline-flex text-xs text-orange-500 underline"
                                        >
                                            Ver planos
                                        </Link>
                                    </div>
                                ) : (
                                    <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
                                        Plano {data.plan} ·{" "}
                                        <Link href="/settings/billing" className="underline">
                                            Atualizar
                                        </Link>
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
