/**
 * POST /api/admin/seed
 *
 * TEMPORARY endpoint to seed the database in production.
 * Protected by ADMIN_SEED_SECRET environment variable.
 *
 * Usage:
 * curl -X POST https://ritmo.app/api/admin/seed \
 *   -H "Authorization: Bearer YOUR_ADMIN_SEED_SECRET"
 *
 * SECURITY:
 * - Set ADMIN_SEED_ENABLED=true to enable (disabled by default in production)
 * - Requires ADMIN_SEED_SECRET header
 * - After seeding, set ADMIN_SEED_ENABLED=false or remove the env var
 *
 * IMPORTANT: Remove this file or disable after seeding production!
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
    // Check if endpoint is enabled (disabled by default in production)
    const isEnabled = process.env.ADMIN_SEED_ENABLED === "true";
    const isProduction = process.env.NODE_ENV === "production";

    if (isProduction && !isEnabled) {
        logger.warn({ endpoint: "/api/admin/seed" }, "Seed endpoint disabled in production");
        return NextResponse.json(
            { error: "Endpoint disabled. Set ADMIN_SEED_ENABLED=true to enable." },
            { status: 403 }
        );
    }

    // Verify secret
    const authHeader = request.headers.get("authorization");
    const secret = process.env.ADMIN_SEED_SECRET;

    if (!secret) {
        return NextResponse.json(
            { error: "ADMIN_SEED_SECRET not configured" },
            { status: 500 }
        );
    }

    if (authHeader !== `Bearer ${secret}`) {
        logger.warn({ endpoint: "/api/admin/seed" }, "Unauthorized seed attempt");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.info({ endpoint: "/api/admin/seed" }, "Seed endpoint called (authorized)");

    try {
        console.log("🌱 Seeding database...");

        // First, update any existing organizations missing shortId
        // This handles the migration case where shortId was added as required
        await prisma.$executeRaw`
            UPDATE organizations
            SET short_id = CONCAT('org_', gen_random_uuid()::text)
            WHERE short_id IS NULL
        `;

        // Create demo organization with trial
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14-day trial

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
                // Trial setup (P0)
                trialEndsAt,
                trialSentLimit: 30,
                trialSentUsed: 0,
                autoEmailEnabled: true,
                bccInboundEnabled: true,
            },
        });

        console.log(`✅ Organization: ${org.name} (${org.id})`);

        // Create admin user
        const admin = await prisma.user.upsert({
            where: {
                organizationId_email: {
                    organizationId: org.id,
                    email: "admin@demo.ritmo.app",
                },
            },
            update: {
                passwordHash: "demo123",
            },
            create: {
                organizationId: org.id,
                email: "admin@demo.ritmo.app",
                name: "Admin Demo",
                passwordHash: "demo123",
                role: "admin",
                emailVerified: new Date(),
            },
        });

        console.log(`✅ Admin user: ${admin.email}`);

        // Create subscription
        await prisma.subscription.upsert({
            where: { organizationId: org.id },
            update: {},
            create: {
                organizationId: org.id,
                planId: "free",
                status: "active",
                quotesLimit: 10,
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
        });

        console.log(`✅ Subscription created`);

        // Create sample contact (use email as unique identifier instead of hardcoded id)
        const contact = await prisma.contact.upsert({
            where: {
                id: (
                    await prisma.contact.findFirst({
                        where: {
                            organizationId: org.id,
                            email: "joao.silva@techcorp.pt",
                        },
                        select: { id: true },
                    })
                )?.id ?? "00000000-0000-0000-0000-000000000000",
            },
            update: {},
            create: {
                organizationId: org.id,
                name: "João Silva",
                company: "TechCorp Lda",
                email: "joao.silva@techcorp.pt",
                phone: "+351 912 345 678",
            },
        });

        console.log(`✅ Contact: ${contact.name}`);

        // Create templates
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
            console.log(`✅ Template: ${t.code}`);
        }

        console.log("🎉 Seed completed!");

        return NextResponse.json({
            success: true,
            message: "Database seeded successfully",
            data: {
                organization: org.name,
                user: admin.email,
                templates: templates.length,
            },
            credentials: {
                email: "admin@demo.ritmo.app",
                password: "demo123",
            },
        });
    } catch (error) {
        console.error("❌ Seed failed:", error);
        return NextResponse.json(
            {
                error: "Seed failed",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
