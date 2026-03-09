import { prisma } from "@/lib/prisma";
import { getApiSession, unauthorized, forbidden, success, serverError } from "@/lib/api-utils";

const DEFAULT_TEMPLATES = [
  {
    code: "T2",
    name: "Follow-up D+1",
    subject: "Confirmação de receção - {{quote_title}}",
    body: `Olá {{contact_name}},\n\nEspero que esteja bem.\n\nVenho confirmar que o orçamento "{{quote_title}}" foi enviado ontem.\nGostaria de saber se teve oportunidade de analisar a proposta e se tem alguma dúvida.\n\nFico ao dispor para esclarecer qualquer questão.\n\nCom os melhores cumprimentos,\n{{user_name}}`,
  },
  {
    code: "T3",
    name: "Follow-up D+3",
    subject: "Acompanhamento - {{quote_title}}",
    body: `Olá {{contact_name}},\n\nVolto a contactá-lo relativamente ao orçamento "{{quote_title}}" enviado há alguns dias.\n\nCompreendo que possa estar ocupado, mas gostaria de saber se posso ajudar a esclarecer alguma dúvida sobre a nossa proposta.\n\nAguardo o seu feedback.\n\nCom os melhores cumprimentos,\n{{user_name}}`,
  },
  {
    code: "T5",
    name: "Fecho Suave D+14",
    subject: "Última verificação - {{quote_title}}",
    body: `Olá {{contact_name}},\n\nEspero que esteja bem.\n\nPassaram cerca de duas semanas desde que enviei a proposta "{{quote_title}}". Gostaria de fazer um último follow-up para entender o estado da sua decisão.\n\nSe o projeto foi adiado ou se optaram por outra solução, agradeço que me informe para eu poder arquivar este orçamento.\n\nCaso ainda estejam a considerar, fico totalmente disponível para agendar uma conversa.\n\nCom os melhores cumprimentos,\n{{user_name}}`,
  },
];

/**
 * POST /api/templates/seed-defaults
 * Create default templates for the current organization (if they don't exist).
 * Admin only. Idempotent — skips templates that already exist.
 */
export async function POST() {
  try {
    const session = await getApiSession();
    if (!session) return unauthorized();
    if (session.user.role !== "admin") return forbidden("Apenas administradores");

    const orgId = session.user.organizationId;
    let created = 0;

    for (const t of DEFAULT_TEMPLATES) {
      const exists = await prisma.template.findFirst({
        where: { organizationId: orgId, code: t.code },
      });
      if (!exists) {
        await prisma.template.create({
          data: { organizationId: orgId, ...t },
        });
        created++;
      }
    }

    return success({ created, total: DEFAULT_TEMPLATES.length });
  } catch (error) {
    return serverError(error, "POST /api/templates/seed-defaults");
  }
}
