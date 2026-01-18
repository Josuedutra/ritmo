import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AppHeader, PageHeader } from "@/components/layout";
import { Button, Card, Badge } from "@/components/ui";
import { GenerateActionButton } from "@/components/quotes";
import { Plus, FileText, Clock, Euro, Building2, AlertCircle } from "lucide-react";

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

const FILTERS = [
    { id: "all", label: "Todos" },
    { id: "no_response", label: "Sem resposta" },
    { id: "draft", label: "Rascunhos" },
    { id: "sent", label: "Enviados" },
    { id: "negotiation", label: "Em negociação" },
    { id: "won", label: "Ganhos" },
    { id: "lost", label: "Perdidos" },
];

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
                    description="Gerir todos os seus orçamentos"
                >
                    <Link href="/quotes/new">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Novo orçamento
                        </Button>
                    </Link>
                </PageHeader>

                {/* Filters */}
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

                {/* Quotes list */}
                {quotes.length === 0 ? (
                    <Card className="flex flex-col items-center justify-center p-12 text-center">
                        <FileText className="mb-4 h-12 w-12 text-[var(--color-muted-foreground)]" />
                        <h3 className="mb-2 text-lg font-medium">Sem orçamentos</h3>
                        <p className="mb-4 text-sm text-[var(--color-muted-foreground)]">
                            {filter === "no_response"
                                ? "Nenhum orçamento sem resposta há mais de 24h."
                                : "Comece por criar o seu primeiro orçamento."}
                        </p>
                        {filter === "all" && (
                            <Link href="/quotes/new">
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Criar orçamento
                                </Button>
                            </Link>
                        )}
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {quotes.map((quote) => {
                            const statusConfig = STATUS_CONFIG[quote.businessStatus] || STATUS_CONFIG.draft;
                            const formattedValue = quote.value
                                ? `€${quote.value.toNumber().toLocaleString("pt-PT")}`
                                : null;
                            const isNoResponseFilter = filter === "no_response";

                            return (
                                <Card key={quote.id} className="p-4 transition-colors hover:border-[var(--color-border-hover)]">
                                    <div className="flex items-start justify-between gap-4">
                                        <Link href={`/quotes/${quote.id}`} className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="truncate font-medium">
                                                    {quote.title}
                                                </h3>
                                                <Badge variant={statusConfig.variant}>
                                                    {statusConfig.label}
                                                </Badge>
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
