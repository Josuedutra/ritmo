import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Server-side onboarding gate.
 * Call this at the top of protected pages to enforce onboarding flow.
 *
 * Requirement C:
 * - If org.onboardingCompleted == false: redirect to /onboarding
 * - Exception: /onboarding itself (handled separately)
 */
export async function requireOnboardingComplete() {
    const session = await auth();

    if (!session?.user?.organizationId) {
        redirect("/login");
    }

    const org = await prisma.organization.findUnique({
        where: { id: session.user.organizationId },
        select: { onboardingCompleted: true },
    });

    if (!org) {
        redirect("/login");
    }

    // If onboarding not complete, redirect to onboarding
    if (!org.onboardingCompleted) {
        redirect("/onboarding");
    }

    return session;
}

/**
 * Check if onboarding is complete (for onboarding page).
 * If complete, redirect to dashboard.
 */
export async function requireOnboardingIncomplete() {
    const session = await auth();

    if (!session?.user?.organizationId) {
        redirect("/login");
    }

    const org = await prisma.organization.findUnique({
        where: { id: session.user.organizationId },
        select: { onboardingCompleted: true },
    });

    if (!org) {
        redirect("/login");
    }

    // If onboarding is complete, redirect to dashboard
    if (org.onboardingCompleted) {
        redirect("/dashboard");
    }

    return session;
}
