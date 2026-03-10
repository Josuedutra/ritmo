import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { differenceInDays } from "date-fns";
import { logger } from "@/lib/logger";

const log = logger.child({ lib: "call-script" });

/**
 * Generate (or return cached) D+7 call script for a cadence event.
 * Non-throwing — returns null on any error.
 */
export async function generateCallScript(eventId: string, orgId: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const event = await prisma.cadenceEvent.findFirst({
      where: { id: eventId, organizationId: orgId },
      include: {
        quote: { include: { contact: true } },
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

    if (!event || event.eventType !== "call_d7") return null;

    // Return cached if fresh
    if (event.generatedScript && event.scriptGeneratedAt) {
      const cacheAgeMs = Date.now() - event.scriptGeneratedAt.getTime();
      const profileChangedAfterGen =
        event.organization.commProfileSetAt &&
        event.scriptGeneratedAt < event.organization.commProfileSetAt;
      if (cacheAgeMs < 24 * 60 * 60 * 1000 && !profileChangedAfterGen) {
        return event.generatedScript;
      }
    }

    const org = event.organization;
    const quote = event.quote;
    const contact = quote.contact;
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
${contact?.phone ? `- Telefone: ${contact.phone}` : ""}

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
      await prisma.cadenceEvent.update({
        where: { id: eventId },
        data: { generatedScript: script, scriptGeneratedAt: new Date() },
      });
    }

    log.info({ eventId, orgId }, "Call script generated");
    return script;
  } catch (err) {
    log.warn({ err, eventId }, "generateCallScript failed — non-blocking");
    return null;
  }
}
