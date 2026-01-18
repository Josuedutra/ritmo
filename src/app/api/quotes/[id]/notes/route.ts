import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
    getApiSession,
    unauthorized,
    notFound,
    badRequest,
    serverError,
    success,
} from "@/lib/api-utils";

const createNoteSchema = z.object({
    content: z.string().min(1, "Content is required").max(5000),
});

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/quotes/:id/notes
 * Get all notes for a quote
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const { id } = await params;

        // Check ownership
        const quote = await prisma.quote.findFirst({
            where: {
                id,
                organizationId: session.user.organizationId,
            },
            select: { id: true },
        });

        if (!quote) {
            return notFound("Quote");
        }

        const notes = await prisma.quoteNote.findMany({
            where: { quoteId: id },
            orderBy: { createdAt: "desc" },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        return success(notes);
    } catch (error) {
        return serverError(error, "GET /api/quotes/:id/notes");
    }
}

/**
 * POST /api/quotes/:id/notes
 * Create a new note for a quote
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const { id } = await params;
        const body = await request.json();
        const parsed = createNoteSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(parsed.error.errors[0].message);
        }

        // Check ownership
        const quote = await prisma.quote.findFirst({
            where: {
                id,
                organizationId: session.user.organizationId,
            },
            select: { id: true },
        });

        if (!quote) {
            return notFound("Quote");
        }

        const note = await prisma.quoteNote.create({
            data: {
                quoteId: id,
                authorId: session.user.id,
                content: parsed.data.content,
            },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        // Update quote lastActivityAt
        await prisma.quote.update({
            where: { id },
            data: { lastActivityAt: new Date() },
        });

        return success(note);
    } catch (error) {
        return serverError(error, "POST /api/quotes/:id/notes");
    }
}
