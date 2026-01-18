import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TRIAL_LIMIT, TRIAL_DURATION_DAYS } from "@/lib/entitlements";

/**
 * POST /api/auth/signup
 * Creates a new user and organization with trial defaults.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password, name, companyName } = body;

        // Validation
        if (!email || !password) {
            return NextResponse.json(
                { error: "Email e password são obrigatórios" },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: "Password deve ter pelo menos 6 caracteres" },
                { status: 400 }
            );
        }

        // Check if email already exists
        const existingUser = await prisma.user.findFirst({
            where: { email: email.toLowerCase() },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "Este email já está registado" },
                { status: 409 }
            );
        }

        // Generate unique slug from company name or email
        const baseSlug = (companyName || email.split("@")[0])
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");

        let slug = baseSlug;
        let counter = 1;
        while (await prisma.organization.findUnique({ where: { slug } })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        // Calculate trial end date
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DURATION_DAYS);

        // Create organization and user in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create organization with trial defaults
            const organization = await tx.organization.create({
                data: {
                    name: companyName || `Empresa de ${name || email.split("@")[0]}`,
                    slug,
                    // Trial defaults (B requirement)
                    trialEndsAt,
                    trialSentLimit: TRIAL_LIMIT,
                    trialSentUsed: 0,
                    autoEmailEnabled: true,
                    bccInboundEnabled: true,
                    // Onboarding not completed
                    onboardingCompleted: false,
                    onboardingState: {
                        templates: false,
                        smtp: false,
                        bcc: false,
                        firstQuote: false,
                    },
                },
            });

            // Create admin user
            // TODO: Use bcrypt for password hashing in production
            const user = await tx.user.create({
                data: {
                    email: email.toLowerCase(),
                    name: name || null,
                    passwordHash: password, // Plain text for dev - TODO: bcrypt
                    role: "admin",
                    organizationId: organization.id,
                },
            });

            return { organization, user };
        });

        return NextResponse.json({
            success: true,
            user: {
                id: result.user.id,
                email: result.user.email,
                name: result.user.name,
            },
            organization: {
                id: result.organization.id,
                name: result.organization.name,
                trialEndsAt: result.organization.trialEndsAt,
            },
        });
    } catch (error) {
        console.error("[Signup] Error:", error);
        return NextResponse.json(
            { error: "Ocorreu um erro ao criar a conta" },
            { status: 500 }
        );
    }
}
