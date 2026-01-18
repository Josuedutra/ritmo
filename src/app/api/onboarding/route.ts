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

export interface OnboardingState {
    templates: boolean;
    smtp: boolean;
    bcc: boolean;
    firstQuote: boolean;
}

const DEFAULT_STATE: OnboardingState = {
    templates: false,
    smtp: false,
    bcc: false,
    firstQuote: false,
};

/**
 * GET /api/onboarding
 * Get current onboarding state
 */
export async function GET() {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const org = await prisma.organization.findUnique({
            where: { id: session.user.organizationId },
            select: {
                onboardingCompleted: true,
                onboardingState: true,
                bccAddress: true,
                smtpHost: true,
                _count: {
                    select: {
                        templates: true,
                        quotes: true,
                    },
                },
            },
        });

        if (!org) {
            return badRequest("Organization not found");
        }

        // Calculate actual state based on org data
        const state: OnboardingState = (org.onboardingState as unknown as OnboardingState) || DEFAULT_STATE;

        // Auto-complete steps based on actual data
        const actualState: OnboardingState = {
            templates: state.templates || org._count.templates > 0,
            smtp: state.smtp || Boolean(org.smtpHost),
            bcc: state.bcc || Boolean(org.bccAddress),
            firstQuote: state.firstQuote || org._count.quotes > 0,
        };

        // Check if all steps are complete
        const allComplete = Object.values(actualState).every(Boolean);

        return success({
            completed: org.onboardingCompleted || allComplete,
            state: actualState,
            progress: {
                done: Object.values(actualState).filter(Boolean).length,
                total: Object.keys(actualState).length,
            },
        });
    } catch (error) {
        return serverError(error, "GET /api/onboarding");
    }
}

const updateSchema = z.object({
    step: z.enum(["templates", "smtp", "bcc", "firstQuote"]),
    completed: z.boolean(),
});

/**
 * POST /api/onboarding
 * Update a step or complete onboarding
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const body = await request.json();
        const parsed = updateSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(parsed.error.errors[0].message);
        }

        const { step, completed } = parsed.data;

        // Get current state
        const org = await prisma.organization.findUnique({
            where: { id: session.user.organizationId },
            select: { onboardingState: true },
        });

        const currentState = (org?.onboardingState as unknown as OnboardingState) || DEFAULT_STATE;
        const newState = { ...currentState, [step]: completed };

        // Update org
        await prisma.organization.update({
            where: { id: session.user.organizationId },
            data: {
                onboardingState: newState,
            },
        });

        return success({ state: newState });
    } catch (error) {
        return serverError(error, "POST /api/onboarding");
    }
}

/**
 * PUT /api/onboarding
 * Complete onboarding (skip remaining steps)
 */
export async function PUT() {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        await prisma.organization.update({
            where: { id: session.user.organizationId },
            data: {
                onboardingCompleted: true,
            },
        });

        return success({ completed: true });
    } catch (error) {
        return serverError(error, "PUT /api/onboarding");
    }
}
