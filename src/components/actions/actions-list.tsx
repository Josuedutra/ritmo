"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ActionCard, type ActionCardProps } from "./action-card";
import { Tabs, TabsList, TabsTrigger, TabsContent, Button } from "@/components/ui";
import { Mail, Phone, ListTodo, Inbox, FileText, Send, Zap, Plus } from "lucide-react";

interface ActionData {
    id: string;
    type: "email" | "call";
    eventType: string;
    scheduledFor: string;
    status: string;
    priority?: "HIGH" | "LOW" | null;
    quote: {
        id: string;
        title: string;
        reference?: string | null;
        value?: number | null;
        firstSentAt?: string | null;
        proposalLink?: string | null;
        hasProposalFile?: boolean;
        contact: {
            id: string;
            name?: string | null;
            email?: string | null;
            company?: string | null;
            phone?: string | null;
        } | null;
    };
    template?: {
        code: string;
        name: string;
        subject?: string | null;
        body: string;
    } | null;
}

interface TaskData {
    id: string;
    type: "task";
    taskType: string;
    title: string;
    description?: string | null;
    dueAt: string;
    priority?: "HIGH" | "LOW" | null;
    status: string;
    quote: {
        id: string;
        title: string;
        reference?: string | null;
        value?: number | null;
        contact: {
            name?: string | null;
            company?: string | null;
            email?: string | null;
            phone?: string | null;
        } | null;
    };
}

interface ActionsListProps {
    emails: ActionData[];
    calls: ActionData[];
    tasks: TaskData[];
}

export function ActionsList({ emails, calls, tasks }: ActionsListProps) {
    const router = useRouter();
    const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

    const handleComplete = useCallback(async (id: string) => {
        try {
            const response = await fetch(`/api/actions/${id}/complete`, {
                method: "POST",
            });

            if (!response.ok) {
                throw new Error("Failed to complete action");
            }

            setCompletedIds((prev) => new Set([...prev, id]));
            router.refresh();
        } catch (error) {
            console.error("Error completing action:", error);
            throw error;
        }
    }, [router]);

    const handleCompleteTask = useCallback(async (id: string) => {
        try {
            const response = await fetch(`/api/tasks/${id}/complete`, {
                method: "POST",
            });

            if (!response.ok) {
                throw new Error("Failed to complete task");
            }

            setCompletedIds((prev) => new Set([...prev, id]));
            router.refresh();
        } catch (error) {
            console.error("Error completing task:", error);
            throw error;
        }
    }, [router]);

    // P1-02: Handle status change for quotes
    const handleStatusChange = useCallback(async (quoteId: string, status: string) => {
        const response = await fetch(`/api/quotes/${quoteId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ businessStatus: status }),
        });

        if (!response.ok) {
            throw new Error("Failed to update status");
        }

        router.refresh();
    }, [router]);

    // Filter out completed items
    const visibleEmails = emails.filter((e) => !completedIds.has(e.id));
    const visibleCalls = calls.filter((c) => !completedIds.has(c.id));
    const visibleTasks = tasks.filter((t) => !completedIds.has(t.id));

    const allActions = [
        ...visibleEmails.map((e) => ({ ...e, sortPriority: e.priority === "HIGH" ? 0 : 1 })),
        ...visibleCalls.map((c) => ({ ...c, sortPriority: c.priority === "HIGH" ? 0 : 1 })),
    ].sort((a, b) => a.sortPriority - b.sortPriority);

    const totalCount = visibleEmails.length + visibleCalls.length + visibleTasks.length;

    if (totalCount === 0) {
        return (
            <div className="py-6">
                <h3 className="mb-4 text-center text-sm font-medium text-[var(--color-muted-foreground)]">
                    Como funciona o Ritmo
                </h3>
                <div className="space-y-3">
                    {/* Step 1 */}
                    <div className="flex items-center gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-sm font-semibold text-[var(--color-primary)]">
                            1
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                                <span className="font-medium">Criar orçamento</span>
                            </div>
                            <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                                Registe o orçamento com contacto e valor
                            </p>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex items-center gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-sm font-semibold text-[var(--color-primary)]">
                            2
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <Send className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                                <span className="font-medium">Marcar como enviado</span>
                            </div>
                            <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                                Quando enviar o email, marque no Ritmo
                            </p>
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex items-center gap-4 rounded-lg border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 p-4">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-semibold text-white">
                            3
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4 text-[var(--color-primary)]" />
                                <span className="font-medium text-[var(--color-primary)]">Ações aparecem aqui</span>
                            </div>
                            <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                                D+1, D+3, D+7 chamada, D+14 — tudo automático
                            </p>
                        </div>
                    </div>
                </div>

                {/* CTA */}
                <div className="mt-6 text-center">
                    <Link href="/quotes/new">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Criar primeiro orçamento
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <Tabs defaultValue="all" className="w-full">
            <TabsList className="mb-4 grid w-full grid-cols-4">
                <TabsTrigger value="all" className="gap-1.5">
                    <Inbox className="h-4 w-4" />
                    Todas ({allActions.length + visibleTasks.length})
                </TabsTrigger>
                <TabsTrigger value="emails" className="gap-1.5">
                    <Mail className="h-4 w-4" />
                    Emails ({visibleEmails.length})
                </TabsTrigger>
                <TabsTrigger value="calls" className="gap-1.5">
                    <Phone className="h-4 w-4" />
                    Chamadas ({visibleCalls.length})
                </TabsTrigger>
                <TabsTrigger value="tasks" className="gap-1.5">
                    <ListTodo className="h-4 w-4" />
                    Tarefas ({visibleTasks.length})
                </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-3">
                {allActions.map((action) => (
                    <ActionCard
                        key={action.id}
                        id={action.id}
                        type={action.type}
                        eventType={action.eventType}
                        title={getActionTitle(action.type, action.eventType)}
                        priority={action.priority}
                        scheduledFor={new Date(action.scheduledFor)}
                        quote={{
                            id: action.quote.id,
                            title: action.quote.title,
                            reference: action.quote.reference,
                            value: action.quote.value,
                            sentAt: action.quote.firstSentAt ? new Date(action.quote.firstSentAt) : null,
                            proposalLink: action.quote.proposalLink,
                            hasProposalFile: action.quote.hasProposalFile,
                        }}
                        contact={action.quote.contact}
                        template={action.template}
                        onComplete={handleComplete}
                        onStatusChange={handleStatusChange}
                    />
                ))}
                {visibleTasks.map((task) => (
                    <ActionCard
                        key={task.id}
                        id={task.id}
                        type={task.taskType === "call" ? "call" : "email"}
                        eventType="task"
                        title={task.title}
                        priority={task.priority}
                        scheduledFor={new Date(task.dueAt)}
                        quote={{
                            id: task.quote.id,
                            title: task.quote.title,
                            reference: task.quote.reference,
                            value: task.quote.value,
                        }}
                        contact={task.quote.contact}
                        isTask
                        taskId={task.id}
                        onComplete={handleCompleteTask}
                        onStatusChange={handleStatusChange}
                    />
                ))}
            </TabsContent>

            <TabsContent value="emails" className="space-y-3">
                {visibleEmails.map((email) => (
                    <ActionCard
                        key={email.id}
                        id={email.id}
                        type="email"
                        eventType={email.eventType}
                        title={getActionTitle("email", email.eventType)}
                        priority={email.priority}
                        scheduledFor={new Date(email.scheduledFor)}
                        quote={{
                            id: email.quote.id,
                            title: email.quote.title,
                            reference: email.quote.reference,
                            value: email.quote.value,
                            sentAt: email.quote.firstSentAt ? new Date(email.quote.firstSentAt) : null,
                            proposalLink: email.quote.proposalLink,
                            hasProposalFile: email.quote.hasProposalFile,
                        }}
                        contact={email.quote.contact}
                        template={email.template}
                        onComplete={handleComplete}
                        onStatusChange={handleStatusChange}
                    />
                ))}
            </TabsContent>

            <TabsContent value="calls" className="space-y-3">
                {visibleCalls.map((call) => (
                    <ActionCard
                        key={call.id}
                        id={call.id}
                        type="call"
                        eventType={call.eventType}
                        title={getActionTitle("call", call.eventType)}
                        priority={call.priority}
                        scheduledFor={new Date(call.scheduledFor)}
                        quote={{
                            id: call.quote.id,
                            title: call.quote.title,
                            reference: call.quote.reference,
                            value: call.quote.value,
                            proposalLink: call.quote.proposalLink,
                            hasProposalFile: call.quote.hasProposalFile,
                        }}
                        contact={call.quote.contact}
                        template={call.template}
                        onComplete={handleComplete}
                        onStatusChange={handleStatusChange}
                    />
                ))}
            </TabsContent>

            <TabsContent value="tasks" className="space-y-3">
                {visibleTasks.map((task) => (
                    <ActionCard
                        key={task.id}
                        id={task.id}
                        type={task.taskType === "call" ? "call" : "email"}
                        eventType="task"
                        title={task.title}
                        priority={task.priority}
                        scheduledFor={new Date(task.dueAt)}
                        quote={{
                            id: task.quote.id,
                            title: task.quote.title,
                            reference: task.quote.reference,
                            value: task.quote.value,
                        }}
                        contact={task.quote.contact}
                        isTask
                        taskId={task.id}
                        onComplete={handleCompleteTask}
                        onStatusChange={handleStatusChange}
                    />
                ))}
            </TabsContent>
        </Tabs>
    );
}

function getActionTitle(type: "email" | "call", eventType: string): string {
    if (type === "call") {
        return "Ligar ao cliente";
    }
    switch (eventType) {
        case "email_d1":
            return "Follow-up D+1";
        case "email_d3":
            return "Follow-up D+3";
        case "email_d14":
            return "Follow-up D+14";
        default:
            return "Follow-up";
    }
}
