import { NextRequest, NextResponse } from "next/server";
import { getApiSession, unauthorized, serverError } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const log = logger.child({ endpoint: "settings/signature" });

const MAX_LOGO_BYTES = 500 * 1024; // 500 KB
const ALLOWED_MIME = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

function getR2Client(): S3Client | null {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) return null;

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

/**
 * GET /api/settings/signature
 * Returns current signature settings for the org.
 */
export async function GET() {
  try {
    const session = await getApiSession();
    if (!session) return unauthorized();

    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: {
        signatureName: true,
        signatureTitle: true,
        signaturePhone: true,
        signatureWebsite: true,
        signatureLogoPath: true,
      },
    });

    return NextResponse.json({
      signatureName: org?.signatureName ?? null,
      signatureTitle: org?.signatureTitle ?? null,
      signaturePhone: org?.signaturePhone ?? null,
      signatureWebsite: org?.signatureWebsite ?? null,
      hasLogo: !!org?.signatureLogoPath,
    });
  } catch (error) {
    return serverError(error, "GET /api/settings/signature");
  }
}

/**
 * PUT /api/settings/signature
 * Accepts multipart/form-data with optional logo file.
 * Updates org signature fields and optionally uploads logo to R2.
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getApiSession();
    if (!session) return unauthorized();

    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas administradores podem alterar configurações" },
        { status: 403 }
      );
    }

    const orgId = session.user.organizationId;
    const contentType = request.headers.get("content-type") || "";

    let signatureName: string | null = null;
    let signatureTitle: string | null = null;
    let signaturePhone: string | null = null;
    let signatureWebsite: string | null = null;
    let logoPath: string | undefined = undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();

      signatureName = (formData.get("signatureName") as string) || null;
      signatureTitle = (formData.get("signatureTitle") as string) || null;
      signaturePhone = (formData.get("signaturePhone") as string) || null;
      signatureWebsite = (formData.get("signatureWebsite") as string) || null;

      const logoFile = formData.get("logo") as File | null;
      if (logoFile && logoFile.size > 0) {
        // Validate size
        if (logoFile.size > MAX_LOGO_BYTES) {
          return NextResponse.json(
            { error: "Logo demasiado grande (máximo 500KB)" },
            { status: 400 }
          );
        }

        // Validate MIME type
        if (!ALLOWED_MIME.includes(logoFile.type)) {
          return NextResponse.json({ error: "Formato inválido. Use PNG ou JPG." }, { status: 400 });
        }

        const ext = logoFile.type === "image/png" ? "png" : "jpg";
        const path = `signatures/${orgId}/logo.${ext}`;
        const buffer = Buffer.from(await logoFile.arrayBuffer());

        const r2 = getR2Client();
        if (r2) {
          await r2.send(
            new PutObjectCommand({
              Bucket: "ritmo-attachments",
              Key: path,
              Body: buffer,
              ContentType: logoFile.type,
            })
          );
          logoPath = path;
          log.info({ orgId, path }, "Signature logo uploaded");
        }
      }
    } else {
      // JSON body (no logo)
      const body = await request.json();
      signatureName = body.signatureName || null;
      signatureTitle = body.signatureTitle || null;
      signaturePhone = body.signaturePhone || null;
      signatureWebsite = body.signatureWebsite || null;
    }

    // Trim empty strings to null
    const trim = (v: string | null) => (v && v.trim() ? v.trim() : null);

    await prisma.organization.update({
      where: { id: orgId },
      data: {
        signatureName: trim(signatureName),
        signatureTitle: trim(signatureTitle),
        signaturePhone: trim(signaturePhone),
        signatureWebsite: trim(signatureWebsite),
        ...(logoPath !== undefined && { signatureLogoPath: logoPath }),
      },
    });

    log.info({ orgId }, "Signature settings updated");
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError(error, "PUT /api/settings/signature");
  }
}
