/**
 * POST /api/partners/register
 *
 * Public endpoint for partner self-registration.
 * Creates a Partner record with status=PENDING.
 *
 * Rate limited: 5 requests per 10 minutes per IP.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp, rateLimitedResponse } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";

const log = logger.child({ service: "partner-register" });

/** Validate Portuguese NIF (9 digits) */
function isValidNif(nif: string): boolean {
  return /^\d{9}$/.test(nif.replace(/\s/g, ""));
}

export async function POST(request: NextRequest) {
  try {
    // ── Rate limiting ──
    const ip = getClientIp(request);
    const rl = await rateLimit({
      key: `partner-register:${ip}`,
      limit: 5,
      windowSec: 600,
      failMode: "fail-closed",
    });
    if (!rl.allowed) {
      return rateLimitedResponse(rl.retryAfterSec);
    }

    // ── Parse and validate ──
    const body = await request.json();
    const { name, email, company, nif, clients, source } = body;

    const errors: string[] = [];
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      errors.push("Nome é obrigatório (mínimo 2 caracteres).");
    }
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push("Email profissional válido é obrigatório.");
    }
    if (!company || typeof company !== "string" || company.trim().length < 2) {
      errors.push("Nome do escritório/empresa é obrigatório.");
    }
    if (nif && !isValidNif(nif)) {
      errors.push("NIF inválido (deve ter 9 dígitos).");
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
    }

    // ── Check duplicate email ──
    const existing = await prisma.partner.findFirst({
      where: { contactEmail: email.toLowerCase().trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Já existe um parceiro registado com este email." },
        { status: 409 }
      );
    }

    // ── Create Partner with status PENDING ──
    const partner = await prisma.partner.create({
      data: {
        name: name.trim(),
        type: "ACCOUNTING",
        contactName: name.trim(),
        contactEmail: email.toLowerCase().trim(),
        companyName: company.trim(),
        nif: nif ? nif.replace(/\s/g, "") : null,
        clientCountRange: clients || null,
        source: source || null,
        status: "PENDING",
      },
    });

    log.info(
      { partnerId: partner.id, email: email.replace(/(.{2}).*@/, "$1***@") },
      "Partner registered (pending)"
    );

    return NextResponse.json(
      {
        success: true,
        message: "Registo recebido com sucesso! Entraremos em contacto brevemente.",
      },
      { status: 201 }
    );
  } catch (error) {
    log.error({ error }, "Partner registration error");
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 });
  }
}
