import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
    getApiSession,
    badRequest,
    serverError,
    success,
} from "@/lib/api-utils";

const feedbackSchema = z.object({
    type: z.enum(["bug", "feature", "other"]),
    message: z.string().min(10, "A mensagem deve ter pelo menos 10 caracteres").max(5000),
    page: z.string().optional(),
});

/**
 * POST /api/feedback
 * Submit feedback from within the app
 */
export async function POST(request: NextRequest) {
    try {
        // Auth is optional - allow anonymous feedback
        const session = await getApiSession();

        const body = await request.json();
        const parsed = feedbackSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(parsed.error.errors[0].message);
        }

        const { type, message, page } = parsed.data;

        // Get user agent from headers
        const userAgent = request.headers.get("user-agent") || undefined;

        // Create feedback item
        const feedback = await prisma.feedbackItem.create({
            data: {
                organizationId: session?.user.organizationId || null,
                userId: session?.user.id || null,
                type,
                message,
                page,
                userAgent,
            },
        });

        return success({
            id: feedback.id,
            message: "Obrigado pelo seu feedback!",
        }, 201);
    } catch (error) {
        return serverError(error, "POST /api/feedback");
    }
}
