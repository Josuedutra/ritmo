import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOnboardingIncomplete } from "@/lib/onboarding-gate";
import { OnboardingWizard } from "./onboarding-wizard";

export default async function OnboardingPage() {
    // Requirement C: If onboarding is complete, redirect to dashboard
    const session = await requireOnboardingIncomplete();

    // Check if user is admin (only admins can complete onboarding)
    if (session.user.role !== "admin") {
        redirect("/dashboard");
    }

    // Get org data for wizard
    const org = await prisma.organization.findUnique({
        where: { id: session.user.organizationId },
        select: {
            id: true,
            name: true,
            shortId: true,
            bccAddress: true,
            smtpHost: true,
            onboardingCompleted: true,
            onboardingState: true,
            _count: {
                select: {
                    templates: true,
                    quotes: true,
                },
            },
        },
    });

    if (!org) {
        redirect("/dashboard");
    }

    // Get templates for the wizard
    const templates = await prisma.template.findMany({
        where: { organizationId: session.user.organizationId },
        select: {
            id: true,
            code: true,
            name: true,
            isActive: true,
        },
        orderBy: { code: "asc" },
    });

    const bccEmail = org.bccAddress || `all+${org.shortId}@inbound.useritmo.pt`;

    return (
        <OnboardingWizard
            orgName={org.name}
            bccEmail={bccEmail}
            hasSmtp={Boolean(org.smtpHost)}
            hasBcc={Boolean(org.bccAddress)}
            hasTemplates={templates.length > 0}
            hasQuotes={org._count.quotes > 0}
            templates={templates}
        />
    );
}
