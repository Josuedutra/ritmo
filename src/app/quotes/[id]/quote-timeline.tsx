"use client";

import { Badge } from "@/components/ui";
import { Mail, Phone, CheckCircle2, Clock, XCircle, AlertCircle, ListTodo, Send } from "lucide-react";

interface CadenceEvent {
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

interface TaskEvent {
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

interface EmailEvent {
    id: string;
    type: "email";
    status: string;
    recipient: string | null;
    subject: string | null;
    sentAt: string | null;
    createdAt: string;
}

type TimelineEvent = CadenceEvent | TaskEvent | EmailEvent;

interface QuoteTimelineProps {
    events: TimelineEvent[];
    currentRunId: number;
}

// Event type labels
const EVENT_TYPE_LABELS: Record<string, string> = {
    email_d1: "Follow-up D+1",
    email_d3: "Follow-up D+3",
    call_d7: "Chamada D+7",
    email_d14: "Follow-up D+14",
};

// Status config
const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
    scheduled: { icon: Clock, color: "text-blue-500", label: "Agendado" },
    claimed: { icon: Clock, color: "text-yellow-500", label: "Em processamento" },
    completed: { icon: CheckCircle2, color: "text-green-500", label: "Concluído" },
    sent: { icon: Send, color: "text-green-500", label: "Enviado" },
    skipped: { icon: AlertCircle, color: "text-orange-500", label: "Ignorado" },
    cancelled: { icon: XCircle, color: "text-red-500", label: "Cancelado" },
    failed: { icon: XCircle, color: "text-red-500", label: "Falhou" },
    pending: { icon: Clock, color: "text-blue-500", label: "Pendente" },
};

export function QuoteTimeline({ events, currentRunId }: QuoteTimelineProps) {
    // Sort events by date (most recent first)
    const sortedEvents = [...events].sort((a, b) => {
        const dateA = getEventDate(a);
        const dateB = getEventDate(b);
        return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    // Group by run ID for cadence events
    const currentRunEvents = sortedEvents.filter(
        (e) => e.type !== "cadence" || (e as CadenceEvent).cadenceRunId === currentRunId
    );
    const previousRunEvents = sortedEvents.filter(
        (e) => e.type === "cadence" && (e as CadenceEvent).cadenceRunId < currentRunId
    );

    if (events.length === 0) {
        return (
            <div className="py-8 text-center text-[var(--color-muted-foreground)]">
                Nenhuma atividade registada
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Current run */}
            <div className="space-y-4">
                {currentRunEvents.map((event) => (
                    <TimelineItem key={`${event.type}-${event.id}`} event={event} />
                ))}
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

function TimelineItem({ event }: { event: TimelineEvent }) {
    const { icon: Icon, color, label } = getStatusConfig(event);
    const TypeIcon = getTypeIcon(event);

    return (
        <div className="flex gap-3">
            {/* Icon */}
            <div className={`mt-0.5 rounded-full p-1 ${getTypeBackground(event)}`}>
                <TypeIcon className="h-4 w-4" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{getEventTitle(event)}</span>
                    <Badge variant="outline" className={`text-xs ${color}`}>
                        <Icon className="mr-1 h-3 w-3" />
                        {label}
                    </Badge>
                    {event.type === "cadence" && (event as CadenceEvent).priority === "HIGH" && (
                        <Badge variant="high" className="text-xs">Prioritário</Badge>
                    )}
                </div>

                <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-[var(--color-muted-foreground)]">
                    <span>{formatDate(getEventDate(event))}</span>
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
    }
}

function getStatusConfig(event: TimelineEvent) {
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
    }
}

function getTypeBackground(event: TimelineEvent): string {
    switch (event.type) {
        case "cadence":
            return event.eventType === "call_d7"
                ? "bg-green-500/10 text-green-500"
                : "bg-blue-500/10 text-blue-500";
        case "task":
            return "bg-purple-500/10 text-purple-500";
        case "email":
            return "bg-blue-500/10 text-blue-500";
    }
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return `Hoje às ${date.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}`;
    } else if (diffDays === 1) {
        return "Ontem";
    } else if (diffDays < 7) {
        return `Há ${diffDays} dias`;
    } else {
        return date.toLocaleDateString("pt-PT");
    }
}
