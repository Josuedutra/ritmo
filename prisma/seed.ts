import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding database...");

    // Create demo organization
    const org = await prisma.organization.upsert({
        where: { slug: "demo" },
        update: {},
        create: {
            name: "Demo Company",
            slug: "demo",
            timezone: "Europe/Lisbon",
            valueThreshold: 1000,
            sendWindowStart: "09:00",
            sendWindowEnd: "18:00",
            emailCooldownHours: 48,
            bccAddress: "bcc+demo@inbound.ritmo.app",
        },
    });

    console.log(`✅ Organization created: ${org.name} (${org.id})`);

    // Create admin user
    // TODO: Replace with bcrypt hash in Sprint 1
    const admin = await prisma.user.upsert({
        where: {
            organizationId_email: {
                organizationId: org.id,
                email: "admin@demo.ritmo.app",
            },
        },
        update: {},
        create: {
            organizationId: org.id,
            email: "admin@demo.ritmo.app",
            name: "Admin Demo",
            passwordHash: "demo123", // TEMP: Plain text for dev only
            role: "admin",
            emailVerified: new Date(),
        },
    });

    console.log(`✅ Admin user created: ${admin.email} (${admin.id})`);

    // Create subscription (free plan)
    await prisma.subscription.upsert({
        where: { organizationId: org.id },
        update: {},
        create: {
            organizationId: org.id,
            planId: "free",
            status: "active",
            quotesLimit: 10,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
        },
    });

    console.log(`✅ Subscription created (free plan)`);

    // Create sample contact
    const contact = await prisma.contact.upsert({
        where: { id: "sample-contact-1" },
        update: {},
        create: {
            id: "sample-contact-1",
            organizationId: org.id,
            name: "João Silva",
            company: "TechCorp Lda",
            email: "joao.silva@techcorp.pt",
            phone: "+351 912 345 678",
        },
    });

    console.log(`✅ Sample contact created: ${contact.name}`);

    // Create sample templates
    const templates = [
        {
            code: "T2",
            name: "Follow-up D+1",
            subject: "Confirmação de receção - {{quote_title}}",
            body: `Olá {{contact_name}},

Espero que esteja bem.

Venho confirmar que o orçamento "{{quote_title}}" foi enviado ontem. 
Gostaria de saber se teve oportunidade de analisar a proposta e se tem alguma dúvida.

Fico ao dispor para esclarecer qualquer questão.

Com os melhores cumprimentos,
{{user_name}}`,
        },
        {
            code: "T3",
            name: "Follow-up D+3",
            subject: "Acompanhamento - {{quote_title}}",
            body: `Olá {{contact_name}},

Volto a contactá-lo relativamente ao orçamento "{{quote_title}}" enviado há alguns dias.

Compreendo que possa estar ocupado, mas gostaria de saber se posso ajudar a esclarecer alguma dúvida sobre a nossa proposta.

Aguardo o seu feedback.

Com os melhores cumprimentos,
{{user_name}}`,
        },
        {
            code: "T5",
            name: "Fecho Suave D+14",
            subject: "Última verificação - {{quote_title}}",
            body: `Olá {{contact_name}},

Espero que esteja bem.

Passaram cerca de duas semanas desde que enviei a proposta "{{quote_title}}". Gostaria de fazer um último follow-up para entender o estado da sua decisão.

Se o projeto foi adiado ou se optaram por outra solução, agradeço que me informe para eu poder arquivar este orçamento.

Caso ainda estejam a considerar, fico totalmente disponível para agendar uma conversa.

Com os melhores cumprimentos,
{{user_name}}`,
        },
        {
            code: "CALL_SCRIPT",
            name: "Script Chamada D+7",
            subject: null,
            body: `📞 SCRIPT DE CHAMADA D+7

Cliente: {{contact_name}}
Empresa: {{contact_company}}
Orçamento: {{quote_title}}
Valor: €{{quote_value}}

---

"Bom dia/Boa tarde, {{contact_name}}. Daqui fala [Nome] da [Empresa].

Estou a ligar relativamente ao orçamento que enviei há cerca de uma semana para [serviço].

Teve oportunidade de analisar? Há alguma questão que possa esclarecer?"

---

📝 NOTAS:
- Se não atender: deixar voicemail curto, reagendar para +2 dias
- Se pedir mais tempo: agendar callback para data específica
- Se mostrar interesse: avançar para negociação
- Se recusar: agradecer e perguntar motivo (para melhoria)`,
        },
    ];

    for (const t of templates) {
        await prisma.template.upsert({
            where: {
                organizationId_code: {
                    organizationId: org.id,
                    code: t.code,
                },
            },
            update: {},
            create: {
                organizationId: org.id,
                code: t.code,
                name: t.name,
                subject: t.subject,
                body: t.body,
                isActive: true,
            },
        });
        console.log(`✅ Template created: ${t.code}`);
    }

    console.log("\n🎉 Seed completed successfully!");
    console.log("\n📋 Login credentials:");
    console.log("   Email: admin@demo.ritmo.app");
    console.log("   Password: demo123");
}

main()
    .catch((e) => {
        console.error("❌ Seed failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
