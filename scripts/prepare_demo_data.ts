
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const email = "admin@demo.ritmo.app";

    // 1. Find the user and org
    const user = await prisma.user.findFirst({
        where: { email },
        include: { organization: true },
    });

    if (!user) {
        console.error("User not found (run seed first)");
        process.exit(1);
    }

    const orgId = user.organizationId;
    console.log(`🧹 Cleaning quotes for organization: ${user.organization.name}`);

    // 2. Delete all tasks, events, and quotes for this org to be safe
    await prisma.task.deleteMany({ where: { organizationId: orgId } });
    await prisma.cadenceEvent.deleteMany({ where: { organizationId: orgId } });
    await prisma.quote.deleteMany({ where: { organizationId: orgId } });

    console.log("✨ Cleaned old data.");

    // 3. Create realistic realistic quotes
    const quotesData = [
        {
            title: "Consultoria Marketing Digital Q1",
            value: 2500,
            client: "TechSolutions Lda",
            status: "sent",
            ref: "PROP-2025-01",
        },
        {
            title: "Website Redesign - GreenFlow",
            value: 4800,
            client: "GreenFlow Energy",
            status: "negotiation",
            ref: "PROP-2025-02",
        },
        {
            title: "Manutenção Anual Servidores",
            value: 1200,
            client: "Imobiliária Cruz",
            status: "draft",
            ref: "PROP-2025-03",
        },
        {
            title: "Implementação CRM",
            value: 6500,
            client: "Grupo Viana",
            status: "sent",
            ref: "PROP-2025-04",
        },
    ];

    for (const q of quotesData) {
        // Create/Connect Contact
        let contact = await prisma.contact.findFirst({
            where: { organizationId: orgId, company: q.client },
        });

        if (!contact) {
            contact = await prisma.contact.create({
                data: {
                    organizationId: orgId,
                    name: `Contacto ${q.client}`,
                    company: q.client,
                    email: `contact@${q.client.toLowerCase().replace(/\s/g, "")}.com`,
                },
            });
        }

        await prisma.quote.create({
            data: {
                organizationId: orgId,
                title: q.title,
                reference: q.ref,
                value: q.value,
                businessStatus: q.status as any,
                contactId: contact.id,
                // Add a "fup_d1" event for "sent" quotes to show activity
                cadenceEvents: q.status === 'sent' ? {
                    create: {
                        organizationId: orgId,
                        eventType: 'email_d1',
                        scheduledFor: new Date(),
                        status: 'scheduled',
                        cadenceRunId: 1
                    }
                } : undefined
            },
        });
    }

    console.log("✅ Seeded 4 realistic quotes.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
