import { NextResponse } from "next/server";
import { getApiSession, unauthorized, serverError } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { getSignedUrl } from "@/lib/storage";

/**
 * GET /api/settings/signature/logo
 * Returns a presigned URL (1h TTL) for the org's signature logo.
 * Used as <img src> in the settings preview and in HTML emails.
 */
export async function GET() {
  try {
    const session = await getApiSession();
    if (!session) return unauthorized();

    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { signatureLogoPath: true },
    });

    if (!org?.signatureLogoPath) {
      return NextResponse.json({ url: null });
    }

    const result = await getSignedUrl(org.signatureLogoPath, 3600);
    if (!result.success || !result.url) {
      return NextResponse.json({ url: null });
    }

    return NextResponse.json({ url: result.url });
  } catch (error) {
    return serverError(error, "GET /api/settings/signature/logo");
  }
}
