import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  getApiSession,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  serverError,
  success,
} from "@/lib/api-utils";
import { logger } from "@/lib/logger";

const log = logger.child({ endpoint: "quotes/[id]/complete" });

const completeSchema = z.object({
  phone: z.string().min(1, "Telefone obrigatório").optional(),
  value: z.number().positive("Valor deve ser positivo").optional(),
});

/**
 * POST /api/quotes/[id]/complete
 *
 * Saves phone (on contact) and/or value (on quote) for a BCC-captured quote
 * that arrived incomplete. After saving, triggers D+7 call script generation
 * for the matching call_d7 cadence event (if it exists).
 *
 * BCC quotes are "incomplete" when they lack phone or value — this endpoint
 * fulfils the enrichment step so the D+7 guião can be generated.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getApiSession();
    if (!session) return unauthorized();

    const { id: quoteId } = await params;

    const body = await request.json().catch(() => ({}));
    const parsed = completeSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.errors[0]?.message || "Dados inválidos");
    }

    const { phone, value } = parsed.data;

    if (!phone && value === undefined) {
      return badRequest("É necessário fornecer telefone ou valor");
    }

    // Load the quote with contact
    const quote = await prisma.quote.findFirst({
      where: { id: quoteId, organizationId: session.user.organizationId },
      include: {
        contact: { select: { id: true, phone: true } },
        cadenceEvents: {
          where: { eventType: "call_d7", status: "scheduled" },
          orderBy: { scheduledFor: "asc" },
          take: 1,
        },
      },
    });

    if (!quote) return notFound("Orçamento");

    // Only admins or quote owner may complete
    if (session.user.role !== "admin" && quote.ownerUserId !== session.user.id) {
      return forbidden("Sem permissão para editar este orçamento");
    }

    // Update contact phone if provided and not already set
    if (phone && quote.contact) {
      await prisma.contact.update({
        where: { id: quote.contact.id },
        data: { phone },
      });
    }

    // Update quote value if provided
    const updatedQuote = await prisma.quote.update({
      where: { id: quoteId },
      data: {
        ...(value !== undefined ? { value } : {}),
        lastActivityAt: new Date(),
      },
      include: {
        contact: { select: { id: true, name: true, phone: true, company: true } },
      },
    });

    log.info(
      { quoteId, orgId: session.user.organizationId, phone: !!phone, value: !!value },
      "BCC quote completed — enrichment saved"
    );

    // Return updated quote so client can re-check completeness
    return success({
      quote: {
        id: updatedQuote.id,
        value: updatedQuote.value?.toNumber() ?? null,
        contact: updatedQuote.contact
          ? {
              id: updatedQuote.contact.id,
              name: updatedQuote.contact.name,
              phone: updatedQuote.contact.phone,
              company: updatedQuote.contact.company,
            }
          : null,
      },
    });
  } catch (error) {
    return serverError(error, "POST /api/quotes/[id]/complete");
  }
}
