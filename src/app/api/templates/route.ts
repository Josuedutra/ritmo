import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
    getApiSession,
    unauthorized,
    badRequest,
    serverError,
    success,
} from "@/lib/api-utils";

const createTemplateSchema = z.object({
    code: z.string().min(1).max(50),
    name: z.string().min(1).max(255),
    subject: z.string().max(500).optional().nullable(),
    body: z.string().min(1),
    isActive: z.boolean().optional(),
});

/**
 * GET /api/templates
 * List all templates for the organization
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const templates = await prisma.template.findMany({
            where: {
                organizationId: session.user.organizationId,
            },
            orderBy: { code: "asc" },
        });

        return success(templates);
    } catch (error) {
        return serverError(error, "GET /api/templates");
    }
}

/**
 * POST /api/templates
 * Create a new template
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const body = await request.json();
        const parsed = createTemplateSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(parsed.error.errors[0].message);
        }

        // Check for duplicate code
        const existing = await prisma.template.findFirst({
            where: {
                organizationId: session.user.organizationId,
                code: parsed.data.code,
            },
        });

        if (existing) {
            return badRequest(`Template com código "${parsed.data.code}" já existe`);
        }

        const template = await prisma.template.create({
            data: {
                organizationId: session.user.organizationId,
                ...parsed.data,
            },
        });

        return success(template, 201);
    } catch (error) {
        return serverError(error, "POST /api/templates");
    }
}
