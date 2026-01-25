import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AppHeader, PageHeader } from "@/components/layout";
import { Button, Card, Badge } from "@/components/ui";
import { GenerateActionButton } from "@/components/quotes";
import { Plus, FileText, Clock, Euro, Building2, AlertCircle, Zap } from "lucide-react";
import { formatDistanceToNow, isToday, isTomorrow } from "date-fns";
import { pt } from "date-fns/locale";
import { QuotesEmptyState } from "./quotes-empty-state";

interface PageProps {
    searchParams: Promise<{ filter?: string }>;
}

// Status badge config
const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "success" | "destructive" | "warning" }> = {
    draft: { label: "Rascunho", variant: "secondary" },
    sent: { label: "Enviado", variant: "default" },
    negotiation: { label: "Em negociação", variant: "warning" },
    won: { label: "Ganho", variant: "success" },
    lost: { label: "Perdido", variant: "destructive" },
};

// P1-01: Tag display config (show max 2 tags on list)
const TAG_CONFIG: Record<string, { label: string; color: string }> = {
    urgente: { label: "Urgente", color: "text-destructive border-destructive bg-destructive-subtle" },
    obra: { label: "Obra", color: "text-info border-info bg-info" },
    manutencao: { label: "Manutenção", color: "text-success border-success bg-success" },
    it: { label: "IT", color: "text-purple-600 border-purple-300 bg-purple-500/10" },
    residencial: { label: "Residencial", color: "text-amber-600 border-amber-300 bg-amber-500/10" },
    comercial: { label: "Comercial", color: "text-cyan-600 border-cyan-300 bg-cyan-500/10" },
};

const FILTERS = [
    { id: "all", label: "Todos" },
    { id: "no_response", label: "Sem resposta" },
    { id: "draft", label: "Rascunhos" },
    { id: "sent", label: "Enviados" },
    { id: "negotiation", label: "Em negociação" },
    { id: "won", label: "Ganhos" },
    { id: "lost", label: "Perdidos" },
];

// P1: Event type short labels for next action badge
const EVENT_SHORT_LABELS: Record<string, string> = {
    email_d1: "D+1",
    email_d3: "D+3",
    call_d7: "D+7",
    email_d14: "D+14",
};

// P1: Format next action for badge display
function formatNextAction(event: { eventType: string; scheduledFor: Date }): string {
    const label = EVENT_SHORT_LABELS[event.eventType] || "Follow-up";
    const date = new Date(event.scheduledFor);

    if (isToday(date)) {
        return `${label} hoje`;
    } else if (isTomorrow(date)) {
        return `${label} amanhã`;
    } else {
        return `${label} ${formatDistanceToNow(date, { addSuffix: false, locale: pt })}`;
    }
}

async function getQuotes(organizationId: string, filter: string) {
    // Build where clause based on filter
    const baseWhere = { organizationId };

    let where: any = baseWhere;

    switch (filter) {
        case "no_response":
            // Quotes sent >24h ago, still in 'sent' status, with NO pending cadence events
            // This means all follow-ups were done but client hasn't responded
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            where = {
                ...baseWhere,
                businessStatus: "sent",
                sentAt: { lt: twentyFourHoursAgo },
                // Exclude quotes that still have scheduled events (cadence in progress)
                cadenceEvents: {
                    none: {
                        status: "scheduled",
                    },
                },
            };
            break;
        case "draft":
            where = { ...baseWhere, businessStatus: "draft" };
            break;
        case "sent":
            where = { ...baseWhere, businessStatus: "sent" };
            break;
        case "negotiation":
            where = { ...baseWhere, businessStatus: "negotiation" };
            break;
        case "won":
            where = { ...baseWhere, businessStatus: "won" };
            break;
        case "lost":
            where = { ...baseWhere, businessStatus: "lost" };
            break;
        // "all" uses baseWhere only
    }

    return prisma.quote.findMany({
        where,
        include: {
            contact: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    company: true,
                },
            },
            // P1: Include next scheduled action for badge display
            cadenceEvents: {
                where: {
                    status: "scheduled",
                    scheduledFor: { gte: new Date() },
                },
                orderBy: { scheduledFor: "asc" },
                take: 1,
                select: {
                    id: true,
                    eventType: true,
                    scheduledFor: true,
                },
            },
        },
        orderBy: [
            { sentAt: "desc" },
            { createdAt: "desc" },
        ],
        take: 100, // Limit for performance
    });
}

async function getQuoteCounts(organizationId: string) {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [all, noResponse, draft, sent, negotiation, won, lost] = await Promise.all([
        prisma.quote.count({ where: { organizationId } }),
        // No response: sent >24h ago with no scheduled events remaining
        prisma.quote.count({
            where: {
                organizationId,
                businessStatus: "sent",
                sentAt: { lt: twentyFourHoursAgo },
                cadenceEvents: {
                    none: { status: "scheduled" },
                },
            },
        }),
        prisma.quote.count({ where: { organizationId, businessStatus: "draft" } }),
        prisma.quote.count({ where: { organizationId, businessStatus: "sent" } }),
        prisma.quote.count({ where: { organizationId, businessStatus: "negotiation" } }),
        prisma.quote.count({ where: { organizationId, businessStatus: "won" } }),
        prisma.quote.count({ where: { organizationId, businessStatus: "lost" } }),
    ]);

    return {
        all,
        no_response: noResponse,
        draft,
        sent,
        negotiation,
        won,
        lost,
    };
}

export default async function QuotesPage({ searchParams }: PageProps) {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    const { filter = "all" } = await searchParams;
    const [quotes, counts] = await Promise.all([
        getQuotes(session.user.organizationId, filter),
        getQuoteCounts(session.user.organizationId),
    ]);

    return (
        <div className="min-h-screen bg-[var(--color-background)]">
            <AppHeader user={session.user} />

            <main className="container-app py-6">
                <PageHeader
                    title="Orçamentos"
                    description="Acompanhe orçamentos e follow-ups num só lugar"
                >
                    <Link href="/quotes/new">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Novo orçamento
                        </Button>
                    </Link>
                </PageHeader>

                {/* Filters - only show when there are quotes */}
                {counts.all > 0 && (
                    <div className="mb-6 flex flex-wrap gap-2">
                        {FILTERS.map((f) => {
                            const count = counts[f.id as keyof typeof counts] ?? 0;
                            const isActive = filter === f.id;
                            const isNoResponse = f.id === "no_response";

                            return (
                                <Link
                                    key={f.id}
                                    href={f.id === "all" ? "/quotes" : `/quotes?filter=${f.id}`}
                                >
                                    <Button
                                        variant={isActive ? "default" : "outline"}
                                        size="sm"
                                        className={`gap-2 ${isNoResponse && count > 0 ? "border-orange-500/50" : ""}`}
                                    >
                                        {isNoResponse && count > 0 && (
                                            <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
                                        )}
                                        {f.label}
                                        <span className={`rounded-full px-1.5 py-0.5 text-xs ${
                                            isActive
                                                ? "bg-white/20"
                                                : "bg-[var(--color-muted)]"
                                        }`}>
                                            {count}
                                        </span>
                                    </Button>
                                </Link>
                            );
                        })}
                    </div>
                )}

                {/* Quotes list - Patch E: Empty states with helpful messages */}
                {quotes.length === 0 ? (
                    <QuotesEmptyState filter={filter} />
                ) : (
                    <div className="space-y-3">
                        {quotes.map((quote) => {
                            const statusConfig = STATUS_CONFIG[quote.businessStatus] || STATUS_CONFIG.draft;
                            const formattedValue = quote.value
                                ? `€${quote.value.toNumber().toLocaleString("pt-PT")}`
                                : null;
                            const isNoResponseFilter = filter === "no_response";
                            // P1: Get next scheduled action
                            const nextAction = quote.cadenceEvents[0] || null;

                            return (
                                <Card key={quote.id} className="p-4 transition-colors hover:border-[var(--color-border-hover)]">
                                    <div className="flex items-start justify-between gap-4">
                                        <Link href={`/quotes/${quote.id}`} className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="truncate font-medium">
                                                    {quote.title}
                                                </h3>
                                                <Badge variant={statusConfig.variant}>
                                                    {statusConfig.label}
                                                </Badge>
                                                {/* P1-01: Show tags (max 2) */}
                                                {quote.tags.slice(0, 2).map((tag) => {
                                                    const tagConfig = TAG_CONFIG[tag] || { label: tag, color: "text-gray-600 border-gray-300 bg-gray-500/10" };
                                                    return (
                                                        <span
                                                            key={tag}
                                                            className={`inline-flex h-5 items-center rounded-full border px-2 text-xs font-medium ${tagConfig.color}`}
                                                        >
                                                            {tagConfig.label}
                                                        </span>
                                                    );
                                                })}
                                                {quote.tags.length > 2 && (
                                                    <span className="text-xs text-[var(--color-muted-foreground)]">
                                                        +{quote.tags.length - 2}
                                                    </span>
                                                )}
                                                {/* P1: Next action badge */}
                                                {nextAction && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-info px-2 py-0.5 text-xs font-medium text-info">
                                                        <Zap className="h-3 w-3" />
                                                        {formatNextAction(nextAction)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--color-muted-foreground)]">
                                                {quote.reference && (
                                                    <span className="flex items-center gap-1">
                                                        <FileText className="h-3 w-3" />
                                                        {quote.reference}
                                                    </span>
                                                )}
                                                {quote.contact?.company && (
                                                    <span className="flex items-center gap-1">
                                                        <Building2 className="h-3 w-3" />
                                                        {quote.contact.company}
                                                    </span>
                                                )}
                                                {quote.contact?.name && (
                                                    <span>{quote.contact.name}</span>
                                                )}
                                                {quote.sentAt && (
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        Enviado {new Date(quote.sentAt).toLocaleDateString("pt-PT")}
                                                    </span>
                                                )}
                                            </div>
                                        </Link>
                                        <div className="flex items-center gap-3">
                                            {isNoResponseFilter && (
                                                <GenerateActionButton quoteId={quote.id} />
                                            )}
                                            {formattedValue && (
                                                <div className="flex items-center gap-1 text-lg font-semibold">
                                                    <Euro className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                                                    {formattedValue}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
