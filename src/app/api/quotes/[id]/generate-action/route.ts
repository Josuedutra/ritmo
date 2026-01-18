import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
    getApiSession,
    unauthorized,
    notFound,
    badRequest,
    serverError,
    success,
} from "@/lib/api-utils";

/**
 * POST /api/quotes/[id]/generate-action
 *
 * Generates a suggested follow-up task for a quote that hasn't received a response.
 * Logic:
 * - If contact has email → creates email follow-up task
 * - If contact has no email but has phone → creates call task
 * - If contact has neither → creates task to request contact info
 * - If value >= 1000 → HIGH priority
 *
 * Deduplication: Won't create if there's already a pending task for this quote
 * with the same type.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const { id: quoteId } = await params;

        // Get quote with contact info
        const quote = await prisma.quote.findFirst({
            where: {
                id: quoteId,
                organizationId: session.user.organizationId,
            },
            include: {
                contact: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        company: true,
                    },
                },
            },
        });

        if (!quote) {
            return notFound("Orçamento");
        }

        // Determine task type based on contact info
        const hasEmail = Boolean(quote.contact?.email);
        const hasPhone = Boolean(quote.contact?.phone);

        let taskType: string;
        let taskTitle: string;
        let taskDescription: string;

        if (hasEmail) {
            taskType = "follow_up";
            taskTitle = `Follow-up: ${quote.title}`;
            taskDescription = `Enviar email de follow-up para ${quote.contact?.name || "cliente"} sobre o orçamento ${quote.reference || quote.title}.`;
        } else if (hasPhone) {
            taskType = "call";
            taskTitle = `Ligar: ${quote.title}`;
            taskDescription = `Ligar para ${quote.contact?.name || "cliente"} (${quote.contact?.phone}) sobre o orçamento ${quote.reference || quote.title}.`;
        } else {
            taskType = "custom";
            taskTitle = `Obter contacto: ${quote.title}`;
            taskDescription = `Obter email ou telefone do cliente ${quote.contact?.name || ""} para dar seguimento ao orçamento ${quote.reference || quote.title}.`;
        }

        // Determine priority based on value
        const quoteValue = quote.value?.toNumber() ?? 0;
        const priority = quoteValue >= 1000 ? "HIGH" : "LOW";

        // Check for existing pending task with same type (deduplication)
        const existingTask = await prisma.task.findFirst({
            where: {
                quoteId,
                organizationId: session.user.organizationId,
                type: taskType,
                status: "pending",
            },
        });

        if (existingTask) {
            return badRequest("Já existe uma tarefa pendente similar para este orçamento");
        }

        // Create the task with dueAt as today
        const task = await prisma.task.create({
            data: {
                organizationId: session.user.organizationId,
                quoteId,
                type: taskType,
                title: taskTitle,
                description: taskDescription,
                priority,
                dueAt: new Date(), // Due today
                status: "pending",
            },
            include: {
                quote: {
                    select: {
                        id: true,
                        title: true,
                        reference: true,
                        contact: {
                            select: {
                                name: true,
                                email: true,
                                phone: true,
                                company: true,
                            },
                        },
                    },
                },
            },
        });

        return success({
            task,
            message: "Tarefa criada com sucesso",
            taskType,
            priority,
        }, 201);
    } catch (error) {
        return serverError(error, "POST /api/quotes/[id]/generate-action");
    }
}
