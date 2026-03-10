import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getApiSession, unauthorized, notFound, serverError } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { differenceInDays } from "date-fns";

const log = logger.child({ endpoint: "actions/[id]/call-script" });

/**
 * POST /api/actions/[id]/call-script
 *
 * Generate (or return cached) Claude call script for a D+7 call action.
 * Uses the org's Communication Profile for personalisation.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getApiSession();
    if (!session) return unauthorized();

    const { id } = await params;
    const orgId = session.user.organizationId;

    // Fetch the cadence event with related quote and contact
    const event = await prisma.cadenceEvent.findFirst({
      where: { id, organizationId: orgId },
      include: {
        quote: {
          include: { contact: true },
        },
        organization: {
          select: {
            commStyleTone: true,
            commStyleDifferential: true,
            commStyleClosing: true,
            commProfileSetAt: true,
            name: true,
          },
        },
      },
    });

    if (!event) return notFound();
    if (event.eventType !== "call_d7") {
      return NextResponse.json({ error: "Apenas disponível para D+7" }, { status: 400 });
    }

    const org = event.organization;
    const quote = event.quote;
    const contact = quote.contact;

    // Return cached script if < 24h old and profile hasn't changed since generation
    if (event.generatedScript && event.scriptGeneratedAt) {
      const cacheAgeMs = Date.now() - event.scriptGeneratedAt.getTime();
      const cacheValid = cacheAgeMs < 24 * 60 * 60 * 1000;
      const profileChangedAfterGen =
        org.commProfileSetAt && event.scriptGeneratedAt < org.commProfileSetAt;

      if (cacheValid && !profileChangedAfterGen) {
        return NextResponse.json({ script: event.generatedScript, cached: true });
      }
    }

    // Check for API key — graceful fallback if missing
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      log.warn("ANTHROPIC_API_KEY not configured — returning null script");
      return NextResponse.json({ script: null, fallback: true });
    }

    // Build prompt context
    const daysSinceSent = quote.sentAt ? differenceInDays(new Date(), new Date(quote.sentAt)) : 7;

    const value =
      quote.value != null
        ? `€${Number(quote.value).toLocaleString("pt-PT", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
        : null;

    const prompt = `És um assistente comercial PT-PT. Gera um guião de chamada telefónica curto e directo.

Perfil de comunicação:
- Tom: ${org.commStyleTone ?? "directo"}
- Diferencial da empresa: ${org.commStyleDifferential ?? "qualidade"}
${org.commStyleClosing ? `- Frase de fecho preferida: "${org.commStyleClosing}"` : ""}

Contexto do orçamento:
- Cliente: ${contact?.name ?? "Cliente"}${contact?.company ? ` (${contact.company})` : ""}
- Orçamento: ${quote.title}${value ? ` — ${value}` : ""}
- Enviado há: ${daysSinceSent} dias
${contact?.phone ? `- Telefone: ${contact.phone}` : "- Sem telefone registado — sugerir email como alternativa"}

Gera:
1. Abertura (1 frase)
2. Verificar receção/leitura
3. Esclarecer dúvidas ou objeções
4. Fecho com próximo passo concreto${org.commStyleClosing ? ` (usa: "${org.commStyleClosing}")` : ""}

Máximo 150 palavras. Português de Portugal.
${daysSinceSent > 10 ? "Tom ligeiramente mais urgente — já passaram mais de 10 dias." : ""}`;

    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    });

    const script = message.content[0].type === "text" ? message.content[0].text.trim() : null;

    if (script) {
      // Cache the script
      await prisma.cadenceEvent.update({
        where: { id },
        data: {
          generatedScript: script,
          scriptGeneratedAt: new Date(),
        },
      });
    }

    log.info({ eventId: id, orgId }, "Call script generated");
    return NextResponse.json({ script, cached: false });
  } catch (error) {
    return serverError(error, "POST /api/actions/[id]/call-script");
  }
}
