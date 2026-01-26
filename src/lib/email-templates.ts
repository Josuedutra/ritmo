/**
 * Email Templates - Ritmo Branded
 *
 * Professional HTML email templates with Ritmo branding.
 * Uses inline CSS for maximum email client compatibility.
 */

import { PUBLIC_APP_URL } from "./config";

// Brand colors
const BRAND = {
    primary: "#4F46E5", // Indigo
    primaryLight: "#60A5FA", // Blue
    accent: "#34D399", // Emerald
    text: "#1F2937", // Gray 800
    textLight: "#6B7280", // Gray 500
    background: "#FFFFFF",
    backgroundAlt: "#F9FAFB", // Gray 50
    border: "#E5E7EB", // Gray 200
};

/**
 * Base email layout wrapper
 */
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
                            <table role="presentation" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td style="padding-right: 10px;">
                                        <!-- Stylized R icon -->
                                        <div style="width: 36px; height: 36px; background: linear-gradient(135deg, ${BRAND.primaryLight}, ${BRAND.accent}); border-radius: 8px; display: inline-flex; align-items: center; justify-content: center;">
                                            <span style="color: white; font-size: 20px; font-weight: 700; line-height: 36px;">R</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span style="font-size: 24px; font-weight: 700; color: ${BRAND.text}; letter-spacing: -0.5px;">Ritmo</span>
                                    </td>
                                </tr>
                            </table>
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
                                © ${new Date().getFullYear()} Ritmo. Todos os direitos reservados.
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

/**
 * Primary CTA button style
 */
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

/**
 * Password Reset Email Template
 */
export function passwordResetEmail(params: {
    userName?: string;
    resetUrl: string;
    expiryMinutes: number;
}): { html: string; text: string } {
    const { userName, resetUrl, expiryMinutes } = params;
    const greeting = userName ? `Olá ${userName},` : "Olá,";

    const html = baseLayout(`
        <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 600; color: ${BRAND.text};">
            Repor password
        </h1>
        <p style="margin: 0 0 8px 0; font-size: 15px; color: ${BRAND.text}; line-height: 1.6;">
            ${greeting}
        </p>
        <p style="margin: 0 0 16px 0; font-size: 15px; color: ${BRAND.text}; line-height: 1.6;">
            Recebemos um pedido para repor a sua password no Ritmo.
        </p>

        ${ctaButton(resetUrl, "Repor password")}

        <p style="margin: 0 0 8px 0; font-size: 13px; color: ${BRAND.textLight}; line-height: 1.5;">
            Ou copie este link:
        </p>
        <p style="margin: 0 0 16px 0; font-size: 13px; color: ${BRAND.primary}; word-break: break-all; line-height: 1.5;">
            <a href="${resetUrl}" style="color: ${BRAND.primary}; text-decoration: none;">${resetUrl}</a>
        </p>

        <div style="padding: 12px 16px; background-color: ${BRAND.backgroundAlt}; border-radius: 8px; border-left: 3px solid ${BRAND.primary};">
            <p style="margin: 0; font-size: 13px; color: ${BRAND.textLight}; line-height: 1.5;">
                <strong style="color: ${BRAND.text};">Nota:</strong> Este link expira em ${expiryMinutes} minutos.
            </p>
        </div>

        <p style="margin: 24px 0 0 0; font-size: 14px; color: ${BRAND.textLight}; line-height: 1.6;">
            Se não pediu para repor a password, pode ignorar este email.
        </p>

        <p style="margin: 24px 0 0 0; font-size: 14px; color: ${BRAND.text}; line-height: 1.6;">
            — Equipa Ritmo
        </p>
    `);

    const text = `
${greeting}

Recebemos um pedido para repor a sua password no Ritmo.

Clique aqui para repor: ${resetUrl}

Este link expira em ${expiryMinutes} minutos.

Se não pediu para repor a password, ignore este email.

— Equipa Ritmo
    `.trim();

    return { html, text };
}

/**
 * Welcome Email Template (for new signups)
 */
export function welcomeEmail(params: {
    userName?: string;
    loginUrl?: string;
}): { html: string; text: string } {
    const { userName, loginUrl = `${PUBLIC_APP_URL}/login` } = params;
    const greeting = userName ? `Olá ${userName},` : "Olá,";

    const html = baseLayout(`
        <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 600; color: ${BRAND.text};">
            Bem-vindo ao Ritmo! 🎉
        </h1>
        <p style="margin: 0 0 8px 0; font-size: 15px; color: ${BRAND.text}; line-height: 1.6;">
            ${greeting}
        </p>
        <p style="margin: 0 0 16px 0; font-size: 15px; color: ${BRAND.text}; line-height: 1.6;">
            A sua conta foi criada com sucesso. Estamos entusiasmados por tê-lo connosco!
        </p>
        <p style="margin: 0 0 16px 0; font-size: 15px; color: ${BRAND.text}; line-height: 1.6;">
            O Ritmo vai ajudá-lo a gerir os seus orçamentos e propostas de forma mais eficiente.
        </p>

        ${ctaButton(loginUrl, "Começar agora")}

        <p style="margin: 24px 0 0 0; font-size: 14px; color: ${BRAND.textLight}; line-height: 1.6;">
            Se tiver alguma dúvida, responda a este email - estamos aqui para ajudar.
        </p>

        <p style="margin: 24px 0 0 0; font-size: 14px; color: ${BRAND.text}; line-height: 1.6;">
            — Equipa Ritmo
        </p>
    `);

    const text = `
${greeting}

A sua conta foi criada com sucesso. Estamos entusiasmados por tê-lo connosco!

O Ritmo vai ajudá-lo a gerir os seus orçamentos e propostas de forma mais eficiente.

Aceda agora: ${loginUrl}

Se tiver alguma dúvida, responda a este email - estamos aqui para ajudar.

— Equipa Ritmo
    `.trim();

    return { html, text };
}

/**
 * Generic Notification Email Template
 */
export function notificationEmail(params: {
    userName?: string;
    title: string;
    message: string;
    ctaUrl?: string;
    ctaText?: string;
}): { html: string; text: string } {
    const { userName, title, message, ctaUrl, ctaText } = params;
    const greeting = userName ? `Olá ${userName},` : "Olá,";

    const ctaHtml = ctaUrl && ctaText ? ctaButton(ctaUrl, ctaText) : "";
    const ctaTextContent = ctaUrl ? `\n\nAceda aqui: ${ctaUrl}` : "";

    const html = baseLayout(`
        <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 600; color: ${BRAND.text};">
            ${title}
        </h1>
        <p style="margin: 0 0 8px 0; font-size: 15px; color: ${BRAND.text}; line-height: 1.6;">
            ${greeting}
        </p>
        <p style="margin: 0 0 16px 0; font-size: 15px; color: ${BRAND.text}; line-height: 1.6;">
            ${message}
        </p>

        ${ctaHtml}

        <p style="margin: 24px 0 0 0; font-size: 14px; color: ${BRAND.text}; line-height: 1.6;">
            — Equipa Ritmo
        </p>
    `);

    const text = `
${greeting}

${message}${ctaTextContent}

— Equipa Ritmo
    `.trim();

    return { html, text };
}
