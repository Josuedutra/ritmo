import { prisma } from "@/lib/prisma";
import { getSignedUrl } from "@/lib/storage";

/**
 * Build an HTML email signature for the given org.
 * Returns empty string if no signature is configured.
 */
export async function buildEmailSignature(orgId: string): Promise<string> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      name: true,
      signatureName: true,
      signatureTitle: true,
      signaturePhone: true,
      signatureWebsite: true,
      signatureLogoPath: true,
    },
  });

  if (!org?.signatureName) return "";

  let logoUrl: string | null = null;
  if (org.signatureLogoPath) {
    const result = await getSignedUrl(org.signatureLogoPath, 3600);
    if (result.success && result.url) {
      logoUrl = result.url;
    }
  }

  const websiteDisplay = org.signatureWebsite
    ? org.signatureWebsite.replace(/^https?:\/\//, "")
    : null;

  return `
<table style="border-top:1px solid #e5e7eb;padding-top:16px;margin-top:24px;font-family:Arial,sans-serif;font-size:13px;color:#6b7280;" cellpadding="0" cellspacing="0">
  <tr>
    ${
      logoUrl
        ? `<td style="padding-right:16px;vertical-align:top;">
      <img src="${logoUrl}" alt="Logo" style="height:48px;width:auto;max-width:120px;display:block;" />
    </td>`
        : ""
    }
    <td style="vertical-align:top;line-height:1.5;">
      <p style="margin:0;font-weight:600;color:#111827;font-size:14px;">${escapeHtml(org.signatureName)}</p>
      ${
        org.signatureTitle
          ? `<p style="margin:0;font-size:12px;color:#6b7280;">${escapeHtml(org.signatureTitle)}${org.name ? ` · ${escapeHtml(org.name)}` : ""}</p>`
          : ""
      }
      ${org.signaturePhone ? `<p style="margin:4px 0 0;font-size:12px;color:#6b7280;">${escapeHtml(org.signaturePhone)}</p>` : ""}
      ${
        org.signatureWebsite && websiteDisplay
          ? `<p style="margin:2px 0 0;font-size:12px;"><a href="${escapeHtml(org.signatureWebsite)}" style="color:#3b82f6;text-decoration:none;">${escapeHtml(websiteDisplay)}</a></p>`
          : ""
      }
    </td>
  </tr>
</table>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
