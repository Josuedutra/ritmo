import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AppHeader, PageHeader } from "@/components/layout";
import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from "@/components/ui";
import { ArrowLeft, Mail, Phone, Building2, Euro, Calendar, FileText, ExternalLink } from "lucide-react";
import { QuoteTimeline } from "./quote-timeline";
import { QuoteActions } from "./quote-actions";
import { ProposalSection } from "./proposal-section";

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

    return (
        <div className="min-h-screen bg-[var(--color-background)]">
            <AppHeader user={session.user} />

            <main className="container-app py-6">
                {/* Back link */}
                <Link
                    href="/dashboard"
                    className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar ao dashboard
                </Link>

                {/* Header */}
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-semibold">{quote.title}</h1>
                            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                        </div>
                        {quote.reference && (
                            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                                Ref: {quote.reference}
                            </p>
                        )}
                    </div>
                    <QuoteActions quote={serializedQuote} />
                </div>

                {/* Content grid */}
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Main content */}
                    <div className="space-y-6 lg:col-span-2">
                        {/* Quote info */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Detalhes do orçamento</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <dl className="grid gap-4 sm:grid-cols-2">
                                    {quote.value && (
                                        <div>
                                            <dt className="flex items-center gap-1 text-sm text-[var(--color-muted-foreground)]">
                                                <Euro className="h-3.5 w-3.5" />
                                                Valor
                                            </dt>
                                            <dd className="mt-1 text-lg font-semibold">
                                                €{quote.value.toNumber().toLocaleString("pt-PT")}
                                            </dd>
                                        </div>
                                    )}
                                    {quote.serviceType && (
                                        <div>
                                            <dt className="flex items-center gap-1 text-sm text-[var(--color-muted-foreground)]">
                                                <FileText className="h-3.5 w-3.5" />
                                                Serviço
                                            </dt>
                                            <dd className="mt-1 font-medium">{quote.serviceType}</dd>
                                        </div>
                                    )}
                                    {quote.sentAt && (
                                        <div>
                                            <dt className="flex items-center gap-1 text-sm text-[var(--color-muted-foreground)]">
                                                <Calendar className="h-3.5 w-3.5" />
                                                Enviado em
                                            </dt>
                                            <dd className="mt-1 font-medium">
                                                {new Date(quote.sentAt).toLocaleDateString("pt-PT")}
                                            </dd>
                                        </div>
                                    )}
                                    <div>
                                        <dt className="text-sm text-[var(--color-muted-foreground)]">
                                            Etapa Ritmo
                                        </dt>
                                        <dd className={`mt-1 font-medium ${stageConfig.color}`}>
                                            {stageConfig.label}
                                        </dd>
                                    </div>
                                </dl>

                                {quote.notes && (
                                    <div className="mt-4 border-t border-[var(--color-border)] pt-4">
                                        <dt className="text-sm text-[var(--color-muted-foreground)]">Notas</dt>
                                        <dd className="mt-1 whitespace-pre-wrap text-sm">{quote.notes}</dd>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Timeline */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Histórico</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <QuoteTimeline
                                    events={timelineEvents}
                                    currentRunId={quote.cadenceRunId}
                                />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Contact info */}
                        {quote.contact && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Contacto</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
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
