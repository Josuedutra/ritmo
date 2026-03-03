/**
 * Onboarding Drip Email Templates — Ritmo
 *
 * 5-email sequence over 14 days to guide users from signup to aha moment.
 * Uses existing baseLayout() and ctaButton() patterns from email-templates.ts.
 *
 * Sequence:
 * 1. Welcome (immediate) — value props + first steps
 * 2. Setup Guide (D+1) — step-by-step guide, suppress if already activated
 * 3. Quota Reminder (D+3) — urgency + benefits, suppress if already activated
 * 4. Social Proof (D+7) — case study, always sent
 * 5. Upgrade CTA (D+14) — trial ending, suppress if already paid
 */

import { PUBLIC_APP_URL } from "./config";

const EMAIL_ASSETS_URL = "https://useritmo.pt";

const BRAND = {
  primary: "#4F46E5",
  primaryLight: "#60A5FA",
  accent: "#34D399",
  text: "#1F2937",
  textLight: "#6B7280",
  background: "#FFFFFF",
  backgroundAlt: "#F9FAFB",
  border: "#E5E7EB",
};

function baseLayout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ritmo</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.backgroundAlt}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${BRAND.backgroundAlt};">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: ${BRAND.background}; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                    <!-- Header with Logo -->
                    <tr>
                        <td align="center" style="padding: 32px 40px 24px 40px; border-bottom: 1px solid ${BRAND.border};">
                            <a href="${PUBLIC_APP_URL}" style="text-decoration: none;">
                                <img src="${EMAIL_ASSETS_URL}/logo-ritmo.png" alt="Ritmo" width="160" height="auto" style="display: block; max-width: 160px; height: auto;" />
                            </a>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 32px 40px;">
                            ${content}
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; border-top: 1px solid ${BRAND.border}; background-color: ${BRAND.backgroundAlt}; border-radius: 0 0 12px 12px;">
                            <p style="margin: 0; font-size: 13px; color: ${BRAND.textLight}; text-align: center;">
                                &copy; ${new Date().getFullYear()} Ritmo. Todos os direitos reservados.
                            </p>
                            <p style="margin: 8px 0 0 0; font-size: 12px; color: ${BRAND.textLight}; text-align: center;">
                                <a href="${PUBLIC_APP_URL}" style="color: ${BRAND.primary}; text-decoration: none;">useritmo.pt</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}

function ctaButton(href: string, text: string): string {
  return `
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
            <tr>
                <td style="border-radius: 8px; background: linear-gradient(135deg, ${BRAND.primaryLight}, ${BRAND.accent});">
                    <a href="${href}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 600; color: #FFFFFF; text-decoration: none; border-radius: 8px;">
                        ${text}
                    </a>
                </td>
            </tr>
        </table>
    `.trim();
}

function p(text: string, style: string = ""): string {
  return `<p style="margin: 0 0 16px 0; font-size: 15px; color: ${BRAND.text}; line-height: 1.6; ${style}">${text}</p>`;
}

function heading(text: string): string {
  return `<h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 600; color: ${BRAND.text};">${text}</h1>`;
}

function divider(): string {
  return `<hr style="border: none; border-top: 1px solid ${BRAND.border}; margin: 24px 0;" />`;
}

function signoff(): string {
  return `<p style="margin: 24px 0 0 0; font-size: 14px; color: ${BRAND.text}; line-height: 1.6;">— Equipa Ritmo</p>`;
}

function helpLine(): string {
  return `<p style="margin: 0 0 0 0; font-size: 14px; color: ${BRAND.textLight}; line-height: 1.6;">Tem alguma dúvida? Responda a este email — lemos tudo.</p>`;
}

// ============================================================================
// Email 1 — Welcome (Immediate)
// ============================================================================

export function onboardingEmail1(params: { userName?: string }): {
  html: string;
  text: string;
  subject: string;
} {
  const greeting = params.userName ? `Olá ${params.userName},` : "Olá,";

  const html = baseLayout(`
        ${heading("Bem-vindo ao Ritmo!")}
        ${p(greeting)}
        ${p("A partir de agora, os seus orçamentos fazem o trabalho por si.")}
        ${p("Aqui está o que vai ganhar:")}

        <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 0 20px 0; width: 100%;">
            <tr><td style="padding: 8px 0 8px 0; font-size: 15px; color: ${BRAND.text}; line-height: 1.6; border-bottom: 1px solid #F3F4F6;">
                <span style="color: ${BRAND.accent}; font-weight: 700;">&#10003;</span>&nbsp;
                <strong>Menos esquecimentos.</strong> O Ritmo envia os lembretes ao seu cliente automaticamente — sem que se lembre de fazer isso.
            </td></tr>
            <tr><td style="padding: 8px 0 8px 0; font-size: 15px; color: ${BRAND.text}; line-height: 1.6; border-bottom: 1px solid #F3F4F6;">
                <span style="color: ${BRAND.accent}; font-weight: 700;">&#10003;</span>&nbsp;
                <strong>Mais respostas.</strong> 68% dos clientes respondem a um orçamento depois de receber um lembrete automático.
            </td></tr>
            <tr><td style="padding: 8px 0 8px 0; font-size: 15px; color: ${BRAND.text}; line-height: 1.6;">
                <span style="color: ${BRAND.accent}; font-weight: 700;">&#10003;</span>&nbsp;
                <strong>Tempo de volta para si.</strong> Pare de perder horas a seguir propostas manualmente.
            </td></tr>
        </table>

        ${divider()}

        <p style="margin: 0 0 14px 0; font-size: 15px; font-weight: 700; color: ${BRAND.text};">O seu próximo passo (demora 3 minutos):</p>

        <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 0 16px 0;">
            <tr><td style="padding: 6px 0; font-size: 15px; color: ${BRAND.text}; line-height: 1.6;">
                <span style="display: inline-block; width: 24px; height: 24px; background: ${BRAND.primary}; color: #fff; border-radius: 50%; font-size: 12px; font-weight: 700; text-align: center; line-height: 24px; margin-right: 8px;">1</span>
                Aceda ao painel → clique em "Novo orçamento"
            </td></tr>
            <tr><td style="padding: 6px 0; font-size: 15px; color: ${BRAND.text}; line-height: 1.6;">
                <span style="display: inline-block; width: 24px; height: 24px; background: ${BRAND.primary}; color: #fff; border-radius: 50%; font-size: 12px; font-weight: 700; text-align: center; line-height: 24px; margin-right: 8px;">2</span>
                Adicione o nome do cliente e o valor
            </td></tr>
            <tr><td style="padding: 6px 0; font-size: 15px; color: ${BRAND.text}; line-height: 1.6;">
                <span style="display: inline-block; width: 24px; height: 24px; background: ${BRAND.primary}; color: #fff; border-radius: 50%; font-size: 12px; font-weight: 700; text-align: center; line-height: 24px; margin-right: 8px;">3</span>
                Clique em "Marcar como enviado"
            </td></tr>
        </table>

        ${p("É isso. O Ritmo trata do seguimento a partir daí.")}
        ${ctaButton(`${PUBLIC_APP_URL}/dashboard`, "Criar o meu primeiro orçamento →")}
        ${divider()}
        ${helpLine()}
        ${signoff()}
    `);

  const text = `${greeting}

Bem-vindo ao Ritmo!

A partir de agora, os seus orçamentos fazem o trabalho por si.

Aqui está o que vai ganhar:
- Menos esquecimentos. O Ritmo envia os lembretes ao seu cliente automaticamente.
- Mais respostas. 68% dos clientes respondem depois de receber um lembrete automático.
- Tempo de volta para si. Pare de perder horas a seguir propostas manualmente.

O seu próximo passo (demora 3 minutos):
1. Aceda ao painel → clique em "Novo orçamento"
2. Adicione o nome do cliente e o valor
3. Clique em "Marcar como enviado"

É isso. O Ritmo trata do seguimento a partir daí.

Criar o meu primeiro orçamento: ${PUBLIC_APP_URL}/dashboard

Tem alguma dúvida? Responda a este email — lemos tudo.

— Equipa Ritmo`;

  return {
    html,
    text,
    subject: "Bem-vindo ao Ritmo — comece a poupar tempo agora",
  };
}

// ============================================================================
// Email 2 — Setup Guide (D+1)
// ============================================================================

export function onboardingEmail2(params: { userName?: string }): {
  html: string;
  text: string;
  subject: string;
} {
  const greeting = params.userName ? `Olá ${params.userName},` : "Olá,";

  const html = baseLayout(`
        ${heading("Como criar o seu primeiro orçamento em 3 minutos")}
        ${p(greeting)}
        ${p("Ainda bem que se registou no Ritmo. Agora vamos pô-lo a trabalhar para si.")}
        ${p("Se ainda não criou o seu primeiro orçamento, aqui está o guia completo:")}
        ${divider()}

        <p style="margin: 0 0 8px 0; font-size: 15px; font-weight: 700; color: ${BRAND.text};">Passo 1: Abrir o painel</p>
        ${p(`Entre em <a href="${PUBLIC_APP_URL}/dashboard" style="color: ${BRAND.primary}; text-decoration: none;">useritmo.pt/dashboard</a> e clique em <strong>"Novo orçamento"</strong> no canto superior direito.`)}

        <p style="margin: 0 0 8px 0; font-size: 15px; font-weight: 700; color: ${BRAND.text};">Passo 2: Preencher os dados</p>
        ${p("Adicione o nome do cliente, o valor do orçamento e uma descrição breve. Pode também anexar um PDF com a proposta completa.")}

        <p style="margin: 0 0 8px 0; font-size: 15px; font-weight: 700; color: ${BRAND.text};">Passo 3: Marcar como enviado</p>
        ${p(`Quando enviar o orçamento ao cliente, clique em <strong>"Marcar como enviado"</strong>. A partir desse momento, o Ritmo activa automaticamente uma cadência de seguimento — emails de lembrete ao seu cliente nos dias 3, 7 e 14.`)}

        <p style="margin: 0 0 8px 0; font-size: 15px; font-weight: 700; color: ${BRAND.text};">Passo 4: Acompanhar no painel</p>
        ${p("O painel mostra-lhe quais os orçamentos pendentes, enviados e aceites — sem precisar de gestão manual.")}

        ${divider()}
        ${p("É isso. Leva literalmente 3 minutos.")}
        ${ctaButton(`${PUBLIC_APP_URL}/dashboard`, "Começar agora →")}
        ${divider()}
        <p style="margin: 0 0 0 0; font-size: 14px; color: ${BRAND.textLight}; line-height: 1.6;">Se tiver dúvidas sobre como funciona a cadência automática, responda a este email — explicamos tudo.</p>
        ${signoff()}
    `);

  const text = `${greeting}

Ainda bem que se registou no Ritmo. Agora vamos pô-lo a trabalhar para si.

Se ainda não criou o seu primeiro orçamento, aqui está o guia completo:

Passo 1: Abrir o painel
Entre em ${PUBLIC_APP_URL}/dashboard e clique em "Novo orçamento" no canto superior direito.

Passo 2: Preencher os dados
Adicione o nome do cliente, o valor do orçamento e uma descrição breve.

Passo 3: Marcar como enviado
Quando enviar o orçamento ao cliente, clique em "Marcar como enviado". O Ritmo activa automaticamente uma cadência de seguimento.

Passo 4: Acompanhar no painel
O painel mostra-lhe quais os orçamentos pendentes, enviados e aceites.

É isso. Leva literalmente 3 minutos.

Começar agora: ${PUBLIC_APP_URL}/dashboard

— Equipa Ritmo`;

  return {
    html,
    text,
    subject: "Como criar o seu primeiro orçamento em 3 minutos",
  };
}

// ============================================================================
// Email 3 — Quota Reminder (D+3)
// ============================================================================

export function onboardingEmail3(params: { userName?: string }): {
  html: string;
  text: string;
  subject: string;
} {
  const greeting = params.userName ? `Olá ${params.userName},` : "Olá,";

  const html = baseLayout(`
        ${heading("Tem orçamentos em aberto que ainda não estão a ser seguidos?")}
        ${p(greeting)}
        ${p("Já enviou algum orçamento esta semana?")}
        ${p("Se sim — existe uma boa probabilidade de que o cliente ainda não respondeu. E existe também uma probabilidade igual de se esquecer de enviar um lembrete.")}
        ${p("É aqui que o Ritmo entra.")}
        ${divider()}

        <p style="margin: 0 0 14px 0; font-size: 15px; font-weight: 700; color: ${BRAND.text};">O que acontece quando marca um orçamento como enviado no Ritmo:</p>

        <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 0 20px 0; width: 100%;">
            <tr><td style="padding: 8px 0; font-size: 15px; color: ${BRAND.text}; line-height: 1.6;">
                <span style="color: ${BRAND.accent}; font-weight: 700;">&#10003;</span>&nbsp;
                No <strong>dia 3</strong>: o cliente recebe um email automático a lembrar do orçamento
            </td></tr>
            <tr><td style="padding: 8px 0; font-size: 15px; color: ${BRAND.text}; line-height: 1.6;">
                <span style="color: ${BRAND.accent}; font-weight: 700;">&#10003;</span>&nbsp;
                No <strong>dia 7</strong>: novo lembrete, com tom diferente
            </td></tr>
            <tr><td style="padding: 8px 0; font-size: 15px; color: ${BRAND.text}; line-height: 1.6;">
                <span style="color: ${BRAND.accent}; font-weight: 700;">&#10003;</span>&nbsp;
                No <strong>dia 14</strong>: seguimento final, CTA para resposta directa
            </td></tr>
        </table>

        ${p("Tudo isto acontece sem que faça nada. Enquanto isso, foca-se no próximo cliente.")}
        ${divider()}

        <p style="margin: 0 0 8px 0; font-size: 15px; font-weight: 700; color: ${BRAND.text};">Os números não mentem:</p>
        ${p("Empresas que usam seguimento automático fecham, em média, <strong>2x mais orçamentos</strong> do que as que fazem seguimento manual — simplesmente porque a consistência do seguimento é impossível de manter manualmente a uma certa escala.")}

        ${divider()}
        ${p("O seu trial está activo. Aproveite agora.")}
        ${ctaButton(`${PUBLIC_APP_URL}/dashboard`, "Activar o seguimento automático →")}
        ${signoff()}
    `);

  const text = `${greeting}

Já enviou algum orçamento esta semana?

Se sim — existe uma boa probabilidade de que o cliente ainda não respondeu. E existe também uma probabilidade igual de se esquecer de enviar um lembrete.

É aqui que o Ritmo entra.

O que acontece quando marca um orçamento como enviado no Ritmo:
- No dia 3: o cliente recebe um email automático a lembrar do orçamento
- No dia 7: novo lembrete, com tom diferente
- No dia 14: seguimento final, CTA para resposta directa

Tudo isto acontece sem que faça nada.

Os números não mentem:
Empresas que usam seguimento automático fecham, em média, 2x mais orçamentos do que as que fazem seguimento manual.

O seu trial está activo. Aproveite agora.

Activar o seguimento automático: ${PUBLIC_APP_URL}/dashboard

— Equipa Ritmo`;

  return {
    html,
    text,
    subject: "Tem orçamentos em aberto que ainda não estão a ser seguidos?",
  };
}

// ============================================================================
// Email 4 — Social Proof (D+7)
// ============================================================================

export function onboardingEmail4(params: { userName?: string }): {
  html: string;
  text: string;
  subject: string;
} {
  const greeting = params.userName ? `Olá ${params.userName},` : "Olá,";

  const html = baseLayout(`
        ${heading(`"Fechei 3 contratos que ia perder"`)}
        ${p(greeting)}
        ${p("Deixe-me partilhar uma história real.")}
        ${divider()}

        <div style="padding: 16px 20px; background-color: ${BRAND.backgroundAlt}; border-radius: 8px; border-left: 3px solid ${BRAND.primary}; margin: 0 0 20px 0;">
            <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 700; color: ${BRAND.text};">Paulo, consultor de gestão em Lisboa.</p>
            <p style="margin: 0 0 12px 0; font-size: 14px; color: ${BRAND.text}; line-height: 1.6;">
                Antes do Ritmo, Paulo enviava orçamentos por email e aguardava. Quando se lembrava, enviava um lembrete manual — às vezes 2 semanas depois, às vezes nunca.
            </p>
            <p style="margin: 0 0 12px 0; font-size: 14px; color: ${BRAND.text}; line-height: 1.6;">
                A taxa de conversão dos orçamentos dele era de <strong>18%</strong>.
            </p>
            <p style="margin: 0 0 12px 0; font-size: 14px; color: ${BRAND.text}; line-height: 1.6;">
                Depois de activar o seguimento automático no Ritmo, os clientes passaram a receber um lembrete estruturado no dia 3, outra mensagem no dia 7 e um seguimento final no dia 14.
            </p>
            <p style="margin: 0 0 12px 0; font-size: 14px; color: ${BRAND.text}; line-height: 1.6;">
                A taxa de conversão subiu para <strong style="color: ${BRAND.accent};">41%</strong>.
            </p>
            <p style="margin: 0; font-size: 14px; color: ${BRAND.textLight}; line-height: 1.6; font-style: italic;">
                "Fechei 3 contratos que ia perder porque simplesmente me esqueci de fazer seguimento. O Ritmo faz isso por mim — e faz melhor do que eu fazia."
            </p>
        </div>

        <p style="margin: 0 0 14px 0; font-size: 15px; font-weight: 700; color: ${BRAND.text};">O que Paulo fez diferente:</p>
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 0 16px 0;">
            <tr><td style="padding: 6px 0; font-size: 15px; color: ${BRAND.text}; line-height: 1.6;">
                <span style="display: inline-block; width: 24px; height: 24px; background: ${BRAND.primary}; color: #fff; border-radius: 50%; font-size: 12px; font-weight: 700; text-align: center; line-height: 24px; margin-right: 8px;">1</span>
                Adicionou o Ritmo ao seu fluxo de trabalho (levou 5 minutos)
            </td></tr>
            <tr><td style="padding: 6px 0; font-size: 15px; color: ${BRAND.text}; line-height: 1.6;">
                <span style="display: inline-block; width: 24px; height: 24px; background: ${BRAND.primary}; color: #fff; border-radius: 50%; font-size: 12px; font-weight: 700; text-align: center; line-height: 24px; margin-right: 8px;">2</span>
                Passou a marcar cada orçamento como enviado imediatamente
            </td></tr>
            <tr><td style="padding: 6px 0; font-size: 15px; color: ${BRAND.text}; line-height: 1.6;">
                <span style="display: inline-block; width: 24px; height: 24px; background: ${BRAND.primary}; color: #fff; border-radius: 50%; font-size: 12px; font-weight: 700; text-align: center; line-height: 24px; margin-right: 8px;">3</span>
                Deixou a cadência automática tratar do seguimento
            </td></tr>
        </table>

        ${p("É tudo.")}
        ${divider()}
        ${p("Se ainda não activou o seguimento automático no Ritmo, este é o momento.")}
        ${ctaButton(`${PUBLIC_APP_URL}/dashboard`, "Ver os meus orçamentos →")}
        ${signoff()}
    `);

  const text = `${greeting}

Deixe-me partilhar uma história real.

Paulo, consultor de gestão em Lisboa.

Antes do Ritmo, Paulo enviava orçamentos por email e aguardava. A taxa de conversão dos orçamentos dele era de 18%.

Depois de activar o seguimento automático no Ritmo, a taxa de conversão subiu para 41%.

"Fechei 3 contratos que ia perder porque simplesmente me esqueci de fazer seguimento. O Ritmo faz isso por mim — e faz melhor do que eu fazia."

O que Paulo fez diferente:
1. Adicionou o Ritmo ao seu fluxo de trabalho (levou 5 minutos)
2. Passou a marcar cada orçamento como enviado imediatamente
3. Deixou a cadência automática tratar do seguimento

Se ainda não activou o seguimento automático no Ritmo, este é o momento.

Ver os meus orçamentos: ${PUBLIC_APP_URL}/dashboard

— Equipa Ritmo`;

  return {
    html,
    text,
    subject: '"Fechei 3 contratos que ia perder" — como o Ritmo mudou a rotina de um consultor',
  };
}

// ============================================================================
// Email 5 — Upgrade CTA (D+14)
// ============================================================================

export function onboardingEmail5(params: { userName?: string }): {
  html: string;
  text: string;
  subject: string;
} {
  const greeting = params.userName ? `Olá ${params.userName},` : "Olá,";

  const html = baseLayout(`
        ${heading("O seu trial do Ritmo termina em breve")}
        ${p(greeting)}
        ${p("O seu trial do Ritmo está a chegar ao fim.")}
        ${p("Nos últimos 14 dias, teve acesso completo ao seguimento automático de orçamentos. Se usou essa funcionalidade, já sabe o que está em jogo.")}
        ${divider()}

        <p style="margin: 0 0 14px 0; font-size: 15px; font-weight: 700; color: ${BRAND.text};">O que acontece quando o trial termina:</p>
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 0 20px 0; width: 100%;">
            <tr><td style="padding: 6px 0; font-size: 15px; color: ${BRAND.text}; line-height: 1.6;">
                • Os seus orçamentos já criados ficam acessíveis
            </td></tr>
            <tr><td style="padding: 6px 0; font-size: 15px; color: ${BRAND.text}; line-height: 1.6;">
                • O seguimento automático é desactivado
            </td></tr>
            <tr><td style="padding: 6px 0; font-size: 15px; color: ${BRAND.text}; line-height: 1.6;">
                • Passa para o plano gratuito (limite de 5 orçamentos/mês, sem automação)
            </td></tr>
        </table>

        ${divider()}

        <p style="margin: 0 0 14px 0; font-size: 15px; font-weight: 700; color: ${BRAND.text};">Continue a trabalhar da mesma forma — ou de forma ainda melhor:</p>

        <table role="presentation" cellspacing="0" cellpadding="0" style="width: 100%; margin: 0 0 20px 0; border-collapse: collapse;">
            <tr style="background-color: ${BRAND.backgroundAlt};">
                <td style="padding: 10px 12px; font-size: 13px; font-weight: 700; color: ${BRAND.text}; border: 1px solid ${BRAND.border};">Plano</td>
                <td style="padding: 10px 12px; font-size: 13px; font-weight: 700; color: ${BRAND.text}; border: 1px solid ${BRAND.border};">Preço</td>
                <td style="padding: 10px 12px; font-size: 13px; font-weight: 700; color: ${BRAND.text}; border: 1px solid ${BRAND.border};">Orçamentos/mês</td>
                <td style="padding: 10px 12px; font-size: 13px; font-weight: 700; color: ${BRAND.text}; border: 1px solid ${BRAND.border};">Automação</td>
            </tr>
            <tr>
                <td style="padding: 10px 12px; font-size: 14px; color: ${BRAND.text}; border: 1px solid ${BRAND.border};"><strong>Starter</strong></td>
                <td style="padding: 10px 12px; font-size: 14px; color: ${BRAND.text}; border: 1px solid ${BRAND.border};">€39/mês</td>
                <td style="padding: 10px 12px; font-size: 14px; color: ${BRAND.text}; border: 1px solid ${BRAND.border};">80</td>
                <td style="padding: 10px 12px; font-size: 14px; color: ${BRAND.accent}; border: 1px solid ${BRAND.border}; font-weight: 600;">Incluída</td>
            </tr>
            <tr>
                <td style="padding: 10px 12px; font-size: 14px; color: ${BRAND.text}; border: 1px solid ${BRAND.border};"><strong>Pro</strong></td>
                <td style="padding: 10px 12px; font-size: 14px; color: ${BRAND.text}; border: 1px solid ${BRAND.border};">€99/mês</td>
                <td style="padding: 10px 12px; font-size: 14px; color: ${BRAND.text}; border: 1px solid ${BRAND.border};">250</td>
                <td style="padding: 10px 12px; font-size: 14px; color: ${BRAND.accent}; border: 1px solid ${BRAND.border}; font-weight: 600;">Incluída</td>
            </tr>
        </table>

        ${p(`O plano Starter cobre a maioria dos negócios independentes e equipas pequenas. <strong>€1,30 por dia</strong> para nunca mais perder um orçamento por falta de seguimento.`)}

        ${ctaButton(`${PUBLIC_APP_URL}/settings/billing`, "Escolher o meu plano →")}
        ${divider()}
        <p style="margin: 0 0 0 0; font-size: 14px; color: ${BRAND.textLight}; line-height: 1.6;">Tem dúvidas sobre qual o plano certo para o seu negócio? Responda a este email — ajudamos a escolher.</p>
        ${signoff()}
    `);

  const text = `${greeting}

O seu trial do Ritmo está a chegar ao fim.

Nos últimos 14 dias, teve acesso completo ao seguimento automático de orçamentos. Se usou essa funcionalidade, já sabe o que está em jogo.

O que acontece quando o trial termina:
- Os seus orçamentos já criados ficam acessíveis
- O seguimento automático é desactivado
- Passa para o plano gratuito (limite de 5 orçamentos/mês, sem automação)

Continue a trabalhar da mesma forma:
- Starter: €39/mês — 80 orçamentos/mês — Automação incluída
- Pro: €99/mês — 250 orçamentos/mês — Automação incluída

O plano Starter cobre a maioria dos negócios independentes. €1,30 por dia para nunca mais perder um orçamento por falta de seguimento.

Escolher o meu plano: ${PUBLIC_APP_URL}/settings/billing

Tem dúvidas? Responda a este email — ajudamos a escolher.

— Equipa Ritmo`;

  return {
    html,
    text,
    subject: "O seu trial do Ritmo termina em breve — continue sem interrupções",
  };
}
