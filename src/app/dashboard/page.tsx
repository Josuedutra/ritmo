import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOnboardingComplete } from "@/lib/onboarding-gate";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { startOfDay, endOfDay } from "date-fns";
import { AppHeader, PageHeader } from "@/components/layout";
import {
    Button,
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from "@/components/ui";
import { FileText, Clock, Plus } from "lucide-react";
import { ActionsList } from "@/components/actions";
import { OnboardingChecklist } from "@/components/onboarding";
import { LifecycleBanner } from "@/components/lifecycle";
import { ScoreboardCard, BenchmarkCard } from "@/components/scoreboard";
import { CockpitLoader } from "@/components/dashboard/cockpit-view";
import { getEntitlements, type Entitlements } from "@/lib/entitlements";

// Usage Meter Component - shows correct limits based on tier
function UsageMeter({ entitlements }: { entitlements: Entitlements }) {
    const { quotesUsed, effectivePlanLimit, tier, trialDaysRemaining, planName } = entitlements;
    const percentUsed = effectivePlanLimit > 0
        ? Math.round((quotesUsed / effectivePlanLimit) * 100)
        : 0;

    // P0-05: More descriptive tier labels
    const tierLabel = tier === "trial"
        ? "Trial"
        : tier === "paid"
            ? planName
            : "Gratuito";

    // P0-05: Subtitle with context
    const tierSubtitle = tier === "trial" && trialDaysRemaining
        ? `${trialDaysRemaining} dias restantes`
        : tier === "free"
            ? "modo manual"
            : null;

    return (
        <Card className={percentUsed >= 100 ? "border-red-500/50" : percentUsed >= 80 ? "border-orange-500/50" : ""}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Utilização</CardTitle>
                    <div className="flex items-center gap-2">
                        <span className="rounded bg-[var(--color-muted)] px-1.5 py-0.5 text-xs font-medium">
                            {tierLabel}
                        </span>
                        {tierSubtitle && (
                            <span className="text-xs text-[var(--color-muted-foreground)]">
                                {tierSubtitle}
                            </span>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="mb-2 flex items-baseline justify-between">
                    <span className="text-2xl font-semibold">{quotesUsed}</span>
                    <span className="text-sm text-[var(--color-muted-foreground)]">
                        / {effectivePlanLimit} envios
                    </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-muted)]">
                    <div
                        className={`h-full rounded-full transition-all ${
                            percentUsed >= 100
                                ? "bg-red-500"
                                : percentUsed >= 80
                                    ? "bg-orange-500"
                                    : "bg-[var(--color-primary)]"
                        }`}
                        style={{ width: `${Math.min(100, percentUsed)}%` }}
                    />
                </div>
                {percentUsed >= 100 ? (
                    <div className="mt-3 rounded-md bg-red-500/10 p-2">
                        <p className="text-xs font-medium text-red-500">
                            Limite atingido. Atualize para continuar.
                        </p>
                        <Link
                            href="/settings/billing"
                            className="mt-1 inline-flex text-xs font-medium text-red-500 underline"
                        >
                            Ver planos →
                        </Link>
                    </div>
                ) : percentUsed >= 80 ? (
                    <div className="mt-3 rounded-md bg-orange-500/10 p-2">
                        <p className="text-xs text-orange-500">
                            {effectivePlanLimit - quotesUsed} restantes
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
                        {effectivePlanLimit - quotesUsed} restantes ·{" "}
                        <Link href="/settings/billing" className="underline">
                            {tier === "paid" ? "Gerir" : "Atualizar"}
                        </Link>
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

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
        templates,
        nextAction,
        // P0-lite: Check for pending seed example (draft with source="seed")
        pendingSeed,
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
        // P0-06: Next scheduled action (after today)
        prisma.cadenceEvent.findFirst({
            where: {
                organizationId,
                scheduledFor: { gt: todayEnd },
                status: "scheduled",
            },
            select: {
                id: true,
                eventType: true,
                scheduledFor: true,
                quote: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
            orderBy: { scheduledFor: "asc" },
        }),
        // P0-lite: Check for pending seed example (draft with source="seed")
        prisma.quote.findFirst({
            where: {
                organizationId,
                businessStatus: "draft",
                source: "seed",
            },
            select: {
                id: true,
                title: true,
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
        // P0-06: Next action info for empty state
        nextAction: nextAction ? {
            id: nextAction.id,
            eventType: nextAction.eventType,
            scheduledFor: nextAction.scheduledFor.toISOString(),
            quoteId: nextAction.quote.id,
            quoteTitle: nextAction.quote.title,
        } : null,
        // P0-lite: Pending seed for "continue Aha" prompt
        pendingSeed: pendingSeed ? {
            id: pendingSeed.id,
            title: pendingSeed.title,
        } : null,
    };
}

export default async function DashboardPage() {
    // Requirement C: Onboarding gate - redirects to /onboarding if not complete
    const session = await requireOnboardingComplete();

    // Get organization timezone and entitlements in parallel
    const [org, entitlements] = await Promise.all([
        prisma.organization.findUnique({
            where: { id: session.user.organizationId },
            select: { timezone: true },
        }),
        getEntitlements(session.user.organizationId),
    ]);

    const timezone = org?.timezone ?? "Europe/Lisbon";
    const data = await getDashboardData(session.user.organizationId, timezone);

    return (
        <div className="min-h-screen bg-[var(--color-background)]">
            <AppHeader user={session.user} />

            <main className="container-app py-6">
                <PageHeader
                    title="Cockpit"
                    description="Acompanhamento dos orçamentos que precisam de follow-up."
                >
                    <Link href="/quotes">
                        <Button variant="outline">
                            <FileText className="mr-2 h-4 w-4" />
                            Ver orçamentos
                        </Button>
                    </Link>
                    <Link href="/quotes/new">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Novo orçamento
                        </Button>
                    </Link>
                </PageHeader>

                {/* Onboarding Checklist */}
                <OnboardingChecklist isAdmin={session.user.role === "admin"} />

                {/* Lifecycle Banner (Trial/Free tier messaging) */}
                <LifecycleBanner />

                {/* Cockpit v1: Recovery-focused view */}
                <CockpitLoader />

                {/* Actions detail section */}
                <div className="mt-8 grid gap-6 lg:grid-cols-3">
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
                                    quotesSent={data.stats.quotesSent}
                                    nextAction={data.nextAction}
                                    pendingSeed={data.pendingSeed}
                                />
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-4">
                        {/* Usage Meter - uses entitlements for correct limits */}
                        <UsageMeter entitlements={entitlements} />

                        {/* Scoreboard - shows for Starter+ */}
                        <ScoreboardCard />

                        {/* Benchmark - shows for Pro+ */}
                        <BenchmarkCard />
                    </div>
                </div>
            </main>
        </div>
    );
}
