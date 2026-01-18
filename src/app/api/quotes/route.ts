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
// Helper to convert empty strings to null before validation
const emptyToNull = (v: string | null | undefined) =>
    v === "" ? null : v;

const createQuoteSchema = z.object({
    contactId: z.preprocess(
        emptyToNull,
        z.string().uuid().optional().nullable()
    ),
    reference: z.string().optional().nullable(),
    title: z.string().min(1, "Title is required"),
    serviceType: z.string().optional().nullable(),
    value: z.number().positive().optional().nullable(),
    currency: z.string().default("EUR"),
    validUntil: z.string().datetime().optional().nullable(),
    proposalLink: z.preprocess(
        emptyToNull,
        z.string().url().optional().nullable()
    ),
    notes: z.string().optional().nullable(),
});

/**
 * GET /api/quotes
 * List all quotes for the organization
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status"); // draft, sent, negotiation, won, lost
        const search = searchParams.get("search");
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = parseInt(searchParams.get("offset") || "0");

        const where = {
            organizationId: session.user.organizationId,
            ...(status && { businessStatus: status as never }),
            ...(search && {
                OR: [
                    { title: { contains: search, mode: "insensitive" as const } },
                    { reference: { contains: search, mode: "insensitive" as const } },
                    { contact: { name: { contains: search, mode: "insensitive" as const } } },
                    { contact: { company: { contains: search, mode: "insensitive" as const } } },
                ],
            }),
        };

        const [quotes, total] = await Promise.all([
            prisma.quote.findMany({
                where,
                orderBy: { createdAt: "desc" },
                take: limit,
                skip: offset,
                include: {
                    contact: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            company: true,
                        },
                    },
                    _count: {
                        select: {
                            cadenceEvents: true,
                            tasks: true,
                        },
                    },
                },
            }),
            prisma.quote.count({ where }),
        ]);

        return success({
            quotes,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + quotes.length < total,
            },
        });
    } catch (error) {
        return serverError(error, "GET /api/quotes");
    }
}

/**
 * POST /api/quotes
 * Create a new quote
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const body = await request.json();
        const parsed = createQuoteSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(parsed.error.errors[0].message);
        }

        const { contactId, validUntil, ...rest } = parsed.data;

        // Verify contact belongs to organization if provided
        if (contactId) {
            const contact = await prisma.contact.findFirst({
                where: {
                    id: contactId,
                    organizationId: session.user.organizationId,
                },
            });
            if (!contact) {
                return badRequest("Contact not found");
            }
        }

        const quote = await prisma.quote.create({
            data: {
                ...rest,
                contactId,
                validUntil: validUntil ? new Date(validUntil) : null,
                organizationId: session.user.organizationId,
                createdById: session.user.id,
            },
            include: {
                contact: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        company: true,
                    },
                },
            },
        });

        return success(quote, 201);
    } catch (error) {
        return serverError(error, "POST /api/quotes");
    }
}
