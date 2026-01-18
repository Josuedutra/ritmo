import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEntitlements } from "@/lib/entitlements";
import { AppHeader, PageHeader } from "@/components/layout";
import { SettingsPageClient } from "./settings-page-client";

export default async function SettingsPage() {
    const session = await auth();
    if (!session?.user?.organizationId) redirect("/login");

    const organizationId = session.user.organizationId;

    // Get organization data
    const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
            id: true,
            name: true,
            shortId: true,
            bccAddress: true,
            smtpHost: true,
            smtpPort: true,
            smtpUser: true,
            smtpFrom: true,
            autoEmailEnabled: true,
            bccInboundEnabled: true,
            timezone: true,
            sendWindowStart: true,
            sendWindowEnd: true,
        },
    });

    if (!organization) redirect("/login");

    // Get entitlements
    const entitlements = await getEntitlements(organizationId);

    // Get template count
    const templateCount = await prisma.template.count({
        where: { organizationId, isActive: true },
    });

    // Build BCC address
    const bccDomain = process.env.BCC_DOMAIN || "inbound.ritmo.app";
    const bccAddress = organization.bccAddress || `bcc+${organization.shortId}@${bccDomain}`;

    // Build settings data for client
    const data = {
        organization: {
            id: organization.id,
            name: organization.name,
            timezone: organization.timezone,
            sendWindowStart: organization.sendWindowStart,
            sendWindowEnd: organization.sendWindowEnd,
        },
        email: {
            mode: (organization.smtpHost ? "smtp" : "ritmo") as "smtp" | "ritmo",
            smtpHost: organization.smtpHost,
            smtpPort: organization.smtpPort,
            smtpUser: organization.smtpUser,
            smtpFrom: organization.smtpFrom,
            // Don't send password to client
        },
        bcc: {
            address: bccAddress,
        },
        templates: {
            count: templateCount,
        },
        entitlements: {
            tier: entitlements.tier,
            planName: entitlements.planName,
            autoEmailEnabled: entitlements.autoEmailEnabled,
            bccInboundEnabled: entitlements.bccInboundEnabled,
        },
    };

    return (
        <div className="min-h-screen bg-[var(--color-background)]">
            <AppHeader user={session.user} />

            <main className="container-app py-6">
                <PageHeader
                    title="Definições"
                    description="Configurar email, BCC e templates"
                />

                <SettingsPageClient data={data} />
            </main>
        </div>
    );
}
