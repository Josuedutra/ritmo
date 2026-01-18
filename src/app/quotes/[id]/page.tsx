import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/layout";
import { Card, CardHeader, CardTitle, CardContent, Badge } from "@/components/ui";
import { ArrowLeft, Mail, Phone, Building2, Calendar, FileText, Clock, CheckCircle2, MessageSquare } from "lucide-react";
import { QuoteTimeline } from "./quote-timeline";
import { QuoteActions } from "./quote-actions";
import { ProposalSection } from "./proposal-section";
import { QuoteTagsNotes } from "./quote-tags-notes";
import { formatDistanceToNow, format, isToday, isTomorrow, isPast, differenceInDays } from "date-fns";
import { pt } from "date-fns/locale";

interface PageProps {
    params: Promise<{ id: string }>;
}

async function getOrgShortId(organizationId: string) {
    const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { shortId: true },
    });
    return org?.shortId || null;
}

async function getQuote(id: string, organizationId: string) {
    return prisma.quote.findFirst({
        where: {
            id,
            organizationId,
        },
        include: {
            contact: true,
            cadenceEvents: {
                orderBy: [{ cadenceRunId: "desc" }, { scheduledFor: "asc" }],
            },
            tasks: {
                orderBy: { createdAt: "desc" },
            },
            emailLogs: {
                orderBy: { createdAt: "desc" },
                take: 20,
            },
            proposalFile: {
                select: {
                    id: true,
                    filename: true,
                    contentType: true,
                    sizeBytes: true,
                    createdAt: true,
                },
            },
            createdBy: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
            // P1-03: Include timestamped notes
            quoteNotes: {
                orderBy: { createdAt: "desc" },
                include: {
                    author: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
        },
    });
}

// Status badge variants
const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "success" | "destructive" | "warning" }> = {
    draft: { label: "Rascunho", variant: "secondary" },
    sent: { label: "Enviado", variant: "default" },
    negotiation: { label: "Em negociação", variant: "warning" },
    won: { label: "Ganho", variant: "success" },
    lost: { label: "Perdido", variant: "destructive" },
};

const STAGE_CONFIG: Record<string, { label: string; color: string }> = {
    idle: { label: "Aguardando", color: "text-[var(--color-muted-foreground)]" },
    fup_d1: { label: "D+1", color: "text-blue-500" },
    fup_d3: { label: "D+3", color: "text-blue-500" },
    fup_d7: { label: "D+7", color: "text-green-500" },
    fup_d14: { label: "D+14", color: "text-orange-500" },
    completed: { label: "Completo", color: "text-[var(--color-muted-foreground)]" },
    paused: { label: "Pausado", color: "text-yellow-500" },
    stopped: { label: "Parado", color: "text-red-500" },
};

// Helper to calculate next action for the quote
function getNextAction(quote: {
    businessStatus: string;
    cadenceEvents: Array<{
        eventType: string;
        status: string;
        scheduledFor: Date;
    }>;
}): { label: string; timing: string; variant: "default" | "warning" | "success" } | null {
    // If draft, the action is to mark as sent
    if (quote.businessStatus === "draft") {
        return { label: "Marcar como enviado", timing: "pendente", variant: "default" };
    }

    // If won/lost, no next action
    if (quote.businessStatus === "won" || quote.businessStatus === "lost") {
        return null;
    }

    // Find next scheduled cadence event
    const nextEvent = quote.cadenceEvents
        .filter((e) => e.status === "scheduled")
        .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())[0];

    if (!nextEvent) {
        return { label: "Cadência concluída", timing: "aguarda resposta", variant: "default" };
    }

    const eventLabels: Record<string, string> = {
        email_d1: "Email D+1",
        email_d3: "Email D+3",
        call_d7: "Chamada D+7",
        email_d14: "Email D+14",
    };

    const scheduledDate = new Date(nextEvent.scheduledFor);
    let timing: string;
    let variant: "default" | "warning" | "success" = "default";

    if (isPast(scheduledDate)) {
        timing = "a processar";
        variant = "warning";
    } else if (isToday(scheduledDate)) {
        timing = "hoje";
        variant = "warning";
    } else if (isTomorrow(scheduledDate)) {
        timing = "amanhã";
    } else {
        timing = format(scheduledDate, "d MMM", { locale: pt });
    }

    return {
        label: eventLabels[nextEvent.eventType] || nextEvent.eventType,
        timing,
        variant,
    };
}

// Helper to calculate quick outcomes for the quote
function getQuickOutcomes(quote: {
    businessStatus: string;
    sentAt: Date | null;
    firstSentAt: Date | null;
    cadenceEvents: Array<{
        eventType: string;
        status: string;
        scheduledFor: Date;
    }>;
}): {
    daysSinceSent: number | null;
    followUpsDone: number;
    nextActionLabel: string | null;
} {
    const now = new Date();

    // Days since sent (use firstSentAt if available, otherwise sentAt)
    const sentDate = quote.firstSentAt || quote.sentAt;
    const daysSinceSent = sentDate ? differenceInDays(now, new Date(sentDate)) : null;

    // Count completed follow-ups
    const followUpsDone = quote.cadenceEvents.filter(
        (e) => e.status === "completed" || e.status === "sent"
    ).length;

    // Next action timing
    let nextActionLabel: string | null = null;
    if (quote.businessStatus === "draft") {
        nextActionLabel = "Marcar como enviado";
    } else if (quote.businessStatus !== "won" && quote.businessStatus !== "lost") {
        const nextEvent = quote.cadenceEvents
            .filter((e) => e.status === "scheduled")
            .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())[0];

        if (nextEvent) {
            const scheduledDate = new Date(nextEvent.scheduledFor);
            if (isPast(scheduledDate)) {
                nextActionLabel = "agora";
            } else if (isToday(scheduledDate)) {
                nextActionLabel = "hoje";
            } else if (isTomorrow(scheduledDate)) {
                nextActionLabel = "amanhã";
            } else {
                nextActionLabel = format(scheduledDate, "d MMM", { locale: pt });
            }
        } else {
            nextActionLabel = "aguarda resposta";
        }
    }

    return { daysSinceSent, followUpsDone, nextActionLabel };
}

export default async function QuoteDetailPage({ params }: PageProps) {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    const { id } = await params;
    const [quote, orgShortId] = await Promise.all([
        getQuote(id, session.user.organizationId),
        getOrgShortId(session.user.organizationId),
    ]);

    if (!quote) {
        notFound();
    }

    const statusConfig = STATUS_CONFIG[quote.businessStatus] || STATUS_CONFIG.draft;
    const stageConfig = STAGE_CONFIG[quote.ritmoStage] || STAGE_CONFIG.idle;
    const nextAction = getNextAction(quote);
    const quickOutcomes = getQuickOutcomes(quote);

    // Serialize data for client components
    const serializedQuote = {
        id: quote.id,
        publicId: quote.publicId,
        title: quote.title,
        reference: quote.reference,
        value: quote.value?.toNumber() ?? null,
        currency: quote.currency,
        serviceType: quote.serviceType,
        businessStatus: quote.businessStatus,
        ritmoStage: quote.ritmoStage,
        sentAt: quote.sentAt?.toISOString() ?? null,
        firstSentAt: quote.firstSentAt?.toISOString() ?? null,
        validUntil: quote.validUntil?.toISOString() ?? null,
        proposalLink: quote.proposalLink,
        notes: quote.notes,
        tags: quote.tags,  // P1-03: Quick tags
        cadenceRunId: quote.cadenceRunId,
        orgShortId: orgShortId,
        contact: quote.contact ? {
            id: quote.contact.id,
            name: quote.contact.name,
            email: quote.contact.email,
            phone: quote.contact.phone,
            company: quote.contact.company,
        } : null,
        proposalFile: quote.proposalFile ? {
            id: quote.proposalFile.id,
            filename: quote.proposalFile.filename,
            sizeBytes: Number(quote.proposalFile.sizeBytes),
            createdAt: quote.proposalFile.createdAt.toISOString(),
        } : null,
    };

    const timelineEvents = [
        // Cadence events
        ...quote.cadenceEvents.map((e) => ({
            id: e.id,
            type: "cadence" as const,
            eventType: e.eventType,
            status: e.status,
            priority: e.priority,
            scheduledFor: e.scheduledFor.toISOString(),
            processedAt: e.processedAt?.toISOString() ?? null,
            cadenceRunId: e.cadenceRunId,
            skipReason: e.skipReason,
            cancelReason: e.cancelReason,
        })),
        // Tasks
        ...quote.tasks.map((t) => ({
            id: t.id,
            type: "task" as const,
            taskType: t.type,
            title: t.title,
            status: t.status,
            priority: t.priority,
            dueAt: t.dueAt?.toISOString() ?? null,
            completedAt: t.completedAt?.toISOString() ?? null,
            createdAt: t.createdAt.toISOString(),
        })),
        // Email logs
        ...quote.emailLogs.map((l) => ({
            id: l.id,
            type: "email" as const,
            status: l.status,
            recipient: l.toEmail,
            subject: l.subject,
            sentAt: l.sentAt?.toISOString() ?? null,
            createdAt: l.createdAt.toISOString(),
        })),
    ];

    // P1-03: Serialize quote notes
    const serializedNotes = quote.quoteNotes.map((n) => ({
        id: n.id,
        content: n.content,
        createdAt: n.createdAt.toISOString(),
        author: n.author ? { id: n.author.id, name: n.author.name } : null,
    }));

    // Format value for display
    const formattedValue = quote.value
        ? `€${quote.value.toNumber().toLocaleString("pt-PT")}`
        : null;

    return (
        <div className="min-h-screen bg-[var(--color-background)]">
            <AppHeader user={session.user} />

            <main className="container-app py-6">
                {/* Back link */}
                <Link
                    href="/quotes"
                    className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Orçamentos
                </Link>

                {/* P0-01: Compact Hero Header Card */}
                <Card className="mb-6">
                    <CardContent className="p-5">
                        {/* Row 1: Title + Status + Value */}
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-xl font-semibold">{quote.title}</h1>
                                    <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                                    {nextAction && (
                                        <Badge
                                            variant={nextAction.variant === "warning" ? "warning" : "outline"}
                                            className="gap-1"
                                        >
                                            <Clock className="h-3 w-3" />
                                            {nextAction.label} · {nextAction.timing}
                                        </Badge>
                                    )}
                                    {/* P1-03: Display quick tags */}
                                    {quote.tags.length > 0 && quote.tags.map((tag) => (
                                        <Badge key={tag} variant="outline" className="text-xs">
                                            {tag === "urgente" ? "Urgente" :
                                             tag === "obra" ? "Obra" :
                                             tag === "manutencao" ? "Manutenção" :
                                             tag === "it" ? "IT" :
                                             tag === "residencial" ? "Residencial" :
                                             tag === "comercial" ? "Comercial" : tag}
                                        </Badge>
                                    ))}
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--color-muted-foreground)]">
                                    {quote.reference && (
                                        <span className="flex items-center gap-1">
                                            <FileText className="h-3.5 w-3.5" />
                                            {quote.reference}
                                        </span>
                                    )}
                                    {quote.contact?.company && (
                                        <span className="flex items-center gap-1">
                                            <Building2 className="h-3.5 w-3.5" />
                                            {quote.contact.company}
                                        </span>
                                    )}
                                    {quote.contact?.name && (
                                        <span>{quote.contact.name}</span>
                                    )}
                                    {quote.sentAt && (
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3.5 w-3.5" />
                                            Enviado {format(new Date(quote.sentAt), "d MMM yyyy", { locale: pt })}
                                        </span>
                                    )}
                                </div>
                            </div>
                            {formattedValue && (
                                <div className="text-right">
                                    <p className="text-2xl font-bold">{formattedValue}</p>
                                    {quote.serviceType && (
                                        <p className="text-sm text-[var(--color-muted-foreground)]">{quote.serviceType}</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* P1-01: Quick Outcomes - simplified, removed redundant "Próxima ação" (already in badge) */}
                        {quote.businessStatus !== "draft" && (
                            <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg bg-[var(--color-muted)]/50 px-4 py-3">
                                {quickOutcomes.daysSinceSent !== null && quickOutcomes.daysSinceSent > 0 && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <MessageSquare className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                                        <span>
                                            Sem resposta há{" "}
                                            <span className={quickOutcomes.daysSinceSent >= 7 ? "font-semibold text-amber-600" : "font-medium"}>
                                                {quickOutcomes.daysSinceSent} {quickOutcomes.daysSinceSent === 1 ? "dia" : "dias"}
                                            </span>
                                        </span>
                                    </div>
                                )}
                                {quickOutcomes.followUpsDone > 0 && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        <span>
                                            <span className="font-medium">{quickOutcomes.followUpsDone}</span>{" "}
                                            {quickOutcomes.followUpsDone === 1 ? "follow-up feito" : "follow-ups feitos"}
                                        </span>
                                    </div>
                                )}
                                {quote.businessStatus === "won" && (
                                    <div className="flex items-center gap-2 text-sm text-green-600">
                                        <CheckCircle2 className="h-4 w-4" />
                                        <span className="font-medium">Negócio ganho</span>
                                    </div>
                                )}
                                {quote.businessStatus === "lost" && (
                                    <div className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
                                        <span>Negócio perdido</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Row 2: Actions */}
                        <div className="mt-4 border-t border-[var(--color-border)] pt-4">
                            <QuoteActions quote={serializedQuote} />
                        </div>
                    </CardContent>
                </Card>

                {/* Content grid */}
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Main content */}
                    <div className="space-y-6 lg:col-span-2">
                        {/* P1-03: Tags and Notes section */}
                        <QuoteTagsNotes
                            quoteId={quote.id}
                            tags={quote.tags}
                            notes={serializedNotes}
                            legacyNotes={quote.notes}
                        />

                        {/* Timeline */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Histórico</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <QuoteTimeline
                                    events={timelineEvents}
                                    currentRunId={quote.cadenceRunId}
                                    quoteCreatedAt={quote.createdAt.toISOString()}
                                    quoteSentAt={quote.sentAt?.toISOString() ?? null}
                                />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Contact info */}
                        {quote.contact && (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base">Contacto</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 pt-0">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                                            {quote.contact.name?.charAt(0).toUpperCase() || "?"}
                                        </div>
                                        <div>
                                            <p className="font-medium">{quote.contact.name}</p>
                                            {quote.contact.company && (
                                                <p className="flex items-center gap-1 text-sm text-[var(--color-muted-foreground)]">
                                                    <Building2 className="h-3 w-3" />
                                                    {quote.contact.company}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {quote.contact.email && (
                                        <a
                                            href={`mailto:${quote.contact.email}`}
                                            className="flex items-center gap-2 text-sm hover:text-[var(--color-primary)]"
                                        >
                                            <Mail className="h-4 w-4" />
                                            {quote.contact.email}
                                        </a>
                                    )}
                                    {quote.contact.phone && (
                                        <a
                                            href={`tel:${quote.contact.phone}`}
                                            className="flex items-center gap-2 text-sm hover:text-[var(--color-primary)]"
                                        >
                                            <Phone className="h-4 w-4" />
                                            {quote.contact.phone}
                                        </a>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Proposal */}
                        <ProposalSection quote={serializedQuote} />
                    </div>
                </div>
            </main>
        </div>
    );
}
