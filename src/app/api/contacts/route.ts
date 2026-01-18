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

// Validation schemas
const createContactSchema = z.object({
    email: z.string().email().optional().nullable(),
    name: z.string().min(1).optional().nullable(),
    company: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
});

const updateContactSchema = createContactSchema.partial();

/**
 * GET /api/contacts
 * List all contacts for the organization
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search");
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = parseInt(searchParams.get("offset") || "0");

        const where = {
            organizationId: session.user.organizationId,
            ...(search && {
                OR: [
                    { name: { contains: search, mode: "insensitive" as const } },
                    { email: { contains: search, mode: "insensitive" as const } },
                    { company: { contains: search, mode: "insensitive" as const } },
                ],
            }),
        };

        const [contacts, total] = await Promise.all([
            prisma.contact.findMany({
                where,
                orderBy: { createdAt: "desc" },
                take: limit,
                skip: offset,
                include: {
                    _count: {
                        select: { quotes: true },
                    },
                },
            }),
            prisma.contact.count({ where }),
        ]);

        return success({
            contacts,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + contacts.length < total,
            },
        });
    } catch (error) {
        return serverError(error, "GET /api/contacts");
    }
}

/**
 * POST /api/contacts
 * Create a new contact
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const body = await request.json();
        const parsed = createContactSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(parsed.error.errors[0].message);
        }

        const contact = await prisma.contact.create({
            data: {
                ...parsed.data,
                organizationId: session.user.organizationId,
            },
        });

        return success(contact, 201);
    } catch (error) {
        return serverError(error, "POST /api/contacts");
    }
}
