/**
 * POST /api/quotes/example
 *
 * Creates an example quote as DRAFT (not sent).
 * The user must click "Guardar e iniciar follow-up" to trigger Aha moment.
 *
 * P0 Fix:
 * - Seed creates DRAFT, NOT sent
 * - NO cadence events created
 * - NO quota consumed
 * - Aha requires explicit click on mark-sent CTA
 *
 * Dedupe: If example quote exists in last 24h, redirect to it instead of creating new.
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
    getApiSession,
    unauthorized,
    serverError,
    success,
} from "@/lib/api-utils";
import { trackEvent, ProductEventNames } from "@/lib/product-events";

export async function POST(request: NextRequest) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const organizationId = session.user.organizationId;
        const userId = session.user.id;

        // Parse request body for source tracking
        let source = "unknown";
        try {
            const body = await request.json();
            source = body.source || "unknown";
        } catch {
            // No body or invalid JSON - use default source
        }

        // Check for existing example quote created by this user in last 24h
        // P0-lite: Use source="seed" for robust detection (not fragile notes field)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const existingExample = await prisma.quote.findFirst({
            where: {
                organizationId,
                createdById: userId,
                source: "seed",
                createdAt: { gte: twentyFourHoursAgo },
            },
            select: { id: true, title: true, businessStatus: true },
        });

        if (existingExample) {
            // Return existing example instead of creating new one
            return success({
                success: true,
                quote: {
                    id: existingExample.id,
                    title: existingExample.title,
                    status: existingExample.businessStatus,
                },
                message: "Orçamento de exemplo já existe. A redirecionar...",
                isExisting: true,
                isSeedExample: true,
            }, 200);
        }

        // Create example contact with specified data
        const contact = await prisma.contact.create({
            data: {
                organizationId,
                name: "TechCorp",
                email: "techcorp@example.com",
                phone: "+351 910 000 000",
                company: "TechCorp",
            },
        });

        // P0 Fix: Create example quote as DRAFT
        // NO sentAt, NO firstSentAt, NO cadence, NO quota increment
        const quote = await prisma.quote.create({
            data: {
                organizationId,
                createdById: userId,
                contactId: contact.id,
                title: "Proposta TechCorp",
                reference: "ORC-EXEMPLO-001",
                serviceType: "Serviços",
                value: 1250,
                currency: "EUR",
                notes: "Exemplo de orçamento para demonstração",
                // P0-lite: Use source field for robust seed detection
                source: "seed",
                // P0 Fix: DRAFT status - user must click CTA for Aha
                businessStatus: "draft",
                // NO sentAt, NO firstSentAt
            },
        });

        // Track seed_example_created event with source
        trackEvent(ProductEventNames.SEED_EXAMPLE_CREATED, {
            organizationId,
            userId,
            props: {
                quoteId: quote.id,
                source,
            },
        });

        // P0 Fix: NO cadence generation, NO quota increment, NO Aha tracking
        // These happen when user clicks "Guardar e iniciar follow-up" (mark-sent)

        return success({
            success: true,
            quote: {
                id: quote.id,
                title: quote.title,
                status: "draft",
            },
            message: "Orçamento de exemplo criado! Clique em 'Guardar e iniciar follow-up' para ver a cadência em ação.",
            isSeedExample: true,
        }, 201);
    } catch (error) {
        return serverError(error, "POST /api/quotes/example");
    }
}
