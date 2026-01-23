"use client";

import { Badge } from "@/components/ui";
import { Mail, Phone, CheckCircle2, Clock, XCircle, AlertCircle, ListTodo, Send, Plus, FileText } from "lucide-react";

export interface CadenceEvent {
    id: string;
    type: "cadence";
    eventType: string;
    status: string;
    priority: string | null;
    scheduledFor: string;
    processedAt: string | null;
    cadenceRunId: number;
    skipReason: string | null;
    cancelReason: string | null;
}

export interface TaskEvent {
    id: string;
    type: "task";
    taskType: string;
    title: string;
    status: string;
    priority: string | null;
    dueAt: string | null;
    completedAt: string | null;
    createdAt: string;
}

export interface EmailEvent {
    id: string;
    type: "email";
    status: string;
    recipient: string | null;
    subject: string | null;
    sentAt: string | null;
    createdAt: string;
}

export interface SystemEvent {
    id: string;
    type: "system";
    eventType: "created" | "sent" | "status_change";
    label: string;
    date: string;
}

export type TimelineEvent = CadenceEvent | TaskEvent | EmailEvent | SystemEvent;

interface QuoteTimelineProps {
    events: TimelineEvent[];
    currentRunId: number;
    quoteCreatedAt: string;
    quoteSentAt: string | null;
    highlightFirstEvent?: boolean; // P0 Fix: Highlight first D+1 event after Aha
}

// Event type labels
const EVENT_TYPE_LABELS: Record<string, string> = {
    email_d1: "Follow-up D+1",
    email_d3: "Follow-up D+3",
    call_d7: "Chamada D+7",
    email_d14: "Follow-up D+14",
};

// Status config - P0-03: Changed "Agendado" to "Previsto" for future events
const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
    scheduled: { icon: Clock, color: "text-[var(--color-info)]", label: "Previsto" },
    claimed: { icon: Clock, color: "text-yellow-500", label: "Em processamento" },
    completed: { icon: CheckCircle2, color: "text-green-500", label: "Concluído" },
    sent: { icon: Send, color: "text-green-500", label: "Enviado" },
    skipped: { icon: AlertCircle, color: "text-orange-500", label: "Ignorado" },
    cancelled: { icon: XCircle, color: "text-red-500", label: "Cancelado" },
    failed: { icon: XCircle, color: "text-red-500", label: "Falhou" },
    pending: { icon: Clock, color: "text-[var(--color-info)]", label: "Pendente" },
};

export function QuoteTimeline({ events, currentRunId, quoteCreatedAt, quoteSentAt, highlightFirstEvent = false }: QuoteTimelineProps) {
    // Add system events for quote creation and sent
    const systemEvents: SystemEvent[] = [
        {
            id: "system-created",
            type: "system",
            eventType: "created",
            label: "Orçamento criado",
            date: quoteCreatedAt,
        },
    ];

    if (quoteSentAt) {
        systemEvents.push({
            id: "system-sent",
            type: "system",
            eventType: "sent",
            label: "Marcado como enviado",
            date: quoteSentAt,
        });
    }

    // Combine all events
    const allEvents: TimelineEvent[] = [...events, ...systemEvents];

    const now = new Date();

    // P0-03: Split into "Próximas ações" (scheduled future) and "Histórico" (past/completed)
    const upcomingActions = allEvents.filter((e) => {
        if (e.type === "system") return false;
        if (e.type === "cadence") {
            // Only scheduled events in current run that are in the future
            const event = e as CadenceEvent;
            return event.status === "scheduled" &&
                   event.cadenceRunId === currentRunId &&
                   new Date(event.scheduledFor) > now;
        }
        if (e.type === "task") {
            // Pending tasks
            return (e as TaskEvent).status === "pending";
        }
        return false;
    }).sort((a, b) => {
        const dateA = getEventDate(a);
        const dateB = getEventDate(b);
        return new Date(dateA).getTime() - new Date(dateB).getTime(); // Ascending for upcoming
    });

    const historyEvents = allEvents.filter((e) => {
        if (e.type === "system") return true;
        if (e.type === "cadence") {
            const event = e as CadenceEvent;
            // Past events or completed/sent/skipped/cancelled
            return event.status !== "scheduled" ||
                   event.cadenceRunId < currentRunId ||
                   new Date(event.scheduledFor) <= now;
        }
        if (e.type === "task") {
            return (e as TaskEvent).status !== "pending";
        }
        if (e.type === "email") {
            return true; // All emails are history
        }
        return true;
    }).sort((a, b) => {
        const dateA = getEventDate(a);
        const dateB = getEventDate(b);
        return new Date(dateB).getTime() - new Date(dateA).getTime(); // Descending for history
    });

    // Filter out old cadence runs from history for cleaner view
    const currentRunHistory = historyEvents.filter(
        (e) => e.type === "system" || e.type !== "cadence" || (e as CadenceEvent).cadenceRunId === currentRunId
    );
    const previousRunEvents = historyEvents.filter(
        (e) => e.type === "cadence" && (e as CadenceEvent).cadenceRunId < currentRunId
    );

    if (allEvents.length === 0) {
        return (
            <div className="py-8 text-center text-[var(--color-muted-foreground)]">
                Nenhuma atividade registada
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* P0-03: Próximas ações section */}
            {upcomingActions.length > 0 && (
                <div>
                    <h4 className="mb-3 text-sm font-medium">Próximas ações</h4>
                    <div className="space-y-3 rounded-lg bg-[var(--color-info)]/5 p-3">
                        {upcomingActions.map((event, index) => (
                            <TimelineItem
                                key={`${event.type}-${event.id}`}
                                event={event}
                                isUpcoming
                                isFirstHighlighted={highlightFirstEvent && index === 0}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* P0-03: Histórico section */}
            <div>
                {upcomingActions.length > 0 && (
                    <h4 className="mb-3 text-sm font-medium text-[var(--color-muted-foreground)]">Histórico</h4>
                )}
                <div className="space-y-4">
                    {currentRunHistory.map((event) => (
                        <TimelineItem key={`${event.type}-${event.id}`} event={event} />
                    ))}
                </div>
            </div>

            {/* Previous runs */}
            {previousRunEvents.length > 0 && (
                <div className="border-t border-[var(--color-border)] pt-4">
                    <h4 className="mb-3 text-sm font-medium text-[var(--color-muted-foreground)]">
                        Execuções anteriores
                    </h4>
                    <div className="space-y-3 opacity-60">
                        {previousRunEvents.map((event) => (
                            <TimelineItem key={`${event.type}-${event.id}`} event={event} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function TimelineItem({ event, isUpcoming = false, isFirstHighlighted = false }: { event: TimelineEvent; isUpcoming?: boolean; isFirstHighlighted?: boolean }) {
    const { icon: Icon, color, label } = getStatusConfig(event);
    const TypeIcon = getTypeIcon(event);
    const isSystemEvent = event.type === "system";

    return (
        <div className={`flex gap-3 ${isFirstHighlighted ? "rounded-md bg-[var(--color-primary)]/5 p-2 -m-2 ring-1 ring-[var(--color-primary)]/20" : ""}`}>
            {/* Icon */}
            <div className={`mt-0.5 rounded-full p-1.5 ${getTypeBackground(event)} ${isFirstHighlighted ? "ring-2 ring-[var(--color-primary)]" : ""}`}>
                <TypeIcon className="h-3.5 w-3.5" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={isSystemEvent ? "text-sm" : "font-medium"}>{getEventTitle(event)}</span>
                    {!isSystemEvent && label && (
                        <Badge variant="outline" className={`text-xs ${color}`}>
                            <Icon className="mr-1 h-3 w-3" />
                            {label}
                        </Badge>
                    )}
                    {event.type === "cadence" && (event as CadenceEvent).priority === "HIGH" && (
                        <Badge variant="high" className="text-xs">Prioritário</Badge>
                    )}
                    {/* P0 Fix: First follow-up highlight label */}
                    {isFirstHighlighted && (
                        <Badge variant="default" className="text-xs bg-[var(--color-primary)]">
                            Primeiro follow-up agendado
                        </Badge>
                    )}
                </div>

                <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-[var(--color-muted-foreground)]">
                    <span>{formatDate(getEventDate(event), isUpcoming)}</span>
                    {getEventDetail(event) && <span>• {getEventDetail(event)}</span>}
                </div>
            </div>
        </div>
    );
}

function getEventDate(event: TimelineEvent): string {
    switch (event.type) {
        case "cadence":
            return event.processedAt || event.scheduledFor;
        case "task":
            return event.completedAt || event.dueAt || event.createdAt;
        case "email":
            return event.sentAt || event.createdAt;
        case "system":
            return event.date;
    }
}

function getEventTitle(event: TimelineEvent): string {
    switch (event.type) {
        case "cadence":
            return EVENT_TYPE_LABELS[event.eventType] || event.eventType;
        case "task":
            return event.title;
        case "email":
            return event.subject || "Email enviado";
        case "system":
            return event.label;
    }
}

function getEventDetail(event: TimelineEvent): string | null {
    switch (event.type) {
        case "cadence":
            if (event.skipReason) return `Ignorado: ${event.skipReason}`;
            if (event.cancelReason) return `Cancelado: ${event.cancelReason}`;
            return null;
        case "task":
            return null;
        case "email":
            return event.recipient;
        case "system":
            return null;
    }
}

function getStatusConfig(event: TimelineEvent) {
    if (event.type === "system") {
        return { icon: CheckCircle2, color: "text-[var(--color-muted-foreground)]", label: "" };
    }
    const status = event.type === "cadence"
        ? event.status
        : event.type === "task"
            ? event.status
            : event.status;
    return STATUS_CONFIG[status] || STATUS_CONFIG.scheduled;
}

function getTypeIcon(event: TimelineEvent): typeof Mail {
    switch (event.type) {
        case "cadence":
            return event.eventType === "call_d7" ? Phone : Mail;
        case "task":
            return ListTodo;
        case "email":
            return Send;
        case "system":
            return event.eventType === "created" ? Plus : event.eventType === "sent" ? Send : FileText;
    }
}

function getTypeBackground(event: TimelineEvent): string {
    switch (event.type) {
        case "cadence":
            return event.eventType === "call_d7"
                ? "bg-green-500/10 text-green-500"
                : "bg-[var(--color-info-muted)] text-[var(--color-info)]";
        case "task":
            return "bg-purple-500/10 text-purple-500";
        case "email":
            return "bg-[var(--color-info-muted)] text-[var(--color-info)]";
        case "system":
            return "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]";
    }
}

// P0-04: Fixed date formatting - handles both past and future dates correctly
function formatDate(dateStr: string, isUpcoming: boolean = false): string {
    const date = new Date(dateStr);
    const now = new Date();

    // Reset time portion for day comparison
    const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const diffMs = dateDay.getTime() - nowDay.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    // Future dates (for upcoming actions)
    if (diffDays > 0) {
        if (diffDays === 1) {
            return "Amanhã";
        } else if (diffDays < 7) {
            return `Daqui a ${diffDays} dias`;
        } else {
            return date.toLocaleDateString("pt-PT", { day: "numeric", month: "short" });
        }
    }

    // Today
    if (diffDays === 0) {
        return `Hoje às ${date.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}`;
    }

    // Past dates (for history)
    const absDiffDays = Math.abs(diffDays);
    if (absDiffDays === 1) {
        return "Ontem";
    } else if (absDiffDays < 7) {
        return `Há ${absDiffDays} dias`;
    } else {
        return date.toLocaleDateString("pt-PT");
    }
}
