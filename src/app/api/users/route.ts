import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
    getApiSession,
    unauthorized,
    forbidden,
    badRequest,
    serverError,
    success,
} from "@/lib/api-utils";
import { checkSeatLimit } from "@/lib/entitlements";

/**
 * GET /api/users
 * List users in the organization
 */
export async function GET() {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const users = await prisma.user.findMany({
            where: { organizationId: session.user.organizationId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
            },
            orderBy: { createdAt: "asc" },
        });

        const seatInfo = await checkSeatLimit(session.user.organizationId);

        return success({
            users,
            seats: {
                current: seatInfo.currentUsers,
                max: seatInfo.maxUsers,
                remaining: seatInfo.remaining,
            },
        });
    } catch (error) {
        return serverError(error, "GET /api/users");
    }
}

const createUserSchema = z.object({
    email: z.string().email("Email inválido"),
    name: z.string().optional(),
    password: z.string().min(6, "Password deve ter pelo menos 6 caracteres"),
    role: z.enum(["admin", "member"]).default("member"),
});

/**
 * POST /api/users
 * Create/invite a new user to the organization
 * Admin only
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        // Only admins can add users
        if (session.user.role !== "admin") {
            return forbidden("Apenas administradores podem adicionar utilizadores");
        }

        const body = await request.json();
        const parsed = createUserSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(parsed.error.errors[0].message);
        }

        const { email, name, password, role } = parsed.data;
        const normalizedEmail = email.toLowerCase();

        // Check seat limit
        const seatInfo = await checkSeatLimit(session.user.organizationId);

        if (!seatInfo.canAddUser) {
            return Response.json(
                {
                    error: "SEAT_LIMIT_EXCEEDED",
                    message: `Atingiu o limite de ${seatInfo.maxUsers} utilizadores do seu plano. Atualize para adicionar mais.`,
                    ctaUrl: "/settings/billing",
                    currentUsers: seatInfo.currentUsers,
                    maxUsers: seatInfo.maxUsers,
                },
                { status: 402 }
            );
        }

        // Check if email already exists in this org
        const existingUser = await prisma.user.findFirst({
            where: {
                organizationId: session.user.organizationId,
                email: normalizedEmail,
            },
        });

        if (existingUser) {
            return badRequest("Este email já está registado nesta organização");
        }

        // Create user
        const user = await prisma.user.create({
            data: {
                organizationId: session.user.organizationId,
                email: normalizedEmail,
                name: name || null,
                passwordHash: password, // TODO: bcrypt in production
                role,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
            },
        });

        return success({ user }, 201);
    } catch (error) {
        return serverError(error, "POST /api/users");
    }
}
