/**
 * GET /api/admin/maintenance?action=fix-mime-titles
 *
 * One-off maintenance actions for production data cleanup.
 * Protected by ADMIN_EMAILS environment variable (same as metrics endpoint).
 *
 * Actions:
 * - fix-mime-titles: Decode RFC 2047 MIME-encoded titles in existing quotes
 *   (cleanup for quotes created before gov-1773070640780-mxy2o5 fix)
 *
 * Usage:
 * GET /api/admin/maintenance?action=fix-mime-titles
 */

import { NextRequest, NextResponse } from "next/server";
import { getApiSession, unauthorized, serverError } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "api/admin/maintenance" });

// SUPERADMIN emails from environment
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase());

/**
 * Decode RFC 2047 MIME encoded-word headers.
 * e.g. =?UTF-8?B?T3LDp2FtZW50bw==?= → "Orçamento"
 *
 * Inline implementation (does not depend on src/lib/inbound.ts)
 * to ensure this runs independently of other pending PRs.
 */
function decodeMimeHeader(header: string): string {
  if (!header || !header.includes("=?")) return header;

  try {
    return header.replace(
      /=\?([^?]+)\?([BbQq])\?([^?]+)\?=/g,
      (_match, charset, encoding, text) => {
        try {
          const enc = encoding.toUpperCase();
          if (enc === "B") {
            const buffer = Buffer.from(text, "base64");
            return buffer.toString(
              charset.toLowerCase() === "utf-8" ? "utf-8" : charset
            );
          } else if (enc === "Q") {
            const decoded = text
              .replace(/_/g, " ")
              .replace(/=([0-9A-Fa-f]{2})/g, (_: string, hex: string) =>
                String.fromCharCode(parseInt(hex, 16))
              );
            return Buffer.from(decoded, "binary").toString("utf-8");
          }
          return text;
        } catch {
          return text;
        }
      }
    );
  } catch {
    return header;
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession();
    if (!session) return unauthorized();

    const userEmail = session.user.email?.toLowerCase();
    if (!userEmail || !ADMIN_EMAILS.includes(userEmail)) {
      return unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (!action) {
      return NextResponse.json(
        { error: "Missing ?action= query parameter", availableActions: ["fix-mime-titles"] },
        { status: 400 }
      );
    }

    if (action === "fix-mime-titles") {
      return await fixMimeTitles();
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}`, availableActions: ["fix-mime-titles"] },
      { status: 400 }
    );
  } catch (error) {
    log.error({ error }, "Maintenance action failed");
    return serverError(error);
  }
}

async function fixMimeTitles(): Promise<NextResponse> {
  log.info("Starting fix-mime-titles maintenance action");

  // Find all quotes with MIME-encoded titles
  const encodedQuotes = await prisma.quote.findMany({
    where: { title: { contains: "=?" } },
    select: { id: true, title: true },
  });

  log.info({ count: encodedQuotes.length }, "Found quotes with MIME-encoded titles");

  if (encodedQuotes.length === 0) {
    return NextResponse.json({
      success: true,
      action: "fix-mime-titles",
      message: "No MIME-encoded titles found — nothing to fix",
      fixed: 0,
      skipped: 0,
    });
  }

  let fixed = 0;
  let skipped = 0;
  const results: Array<{ id: string; from: string; to: string }> = [];

  for (const q of encodedQuotes) {
    const decoded = decodeMimeHeader(q.title);
    if (decoded !== q.title) {
      await prisma.quote.update({
        where: { id: q.id },
        data: { title: decoded },
      });
      log.info({ id: q.id, from: q.title, to: decoded }, "Fixed MIME-encoded title");
      results.push({ id: q.id, from: q.title, to: decoded });
      fixed++;
    } else {
      // Contains =? but decodeMimeHeader returned unchanged — not actually MIME encoded
      skipped++;
    }
  }

  log.info({ fixed, skipped }, "fix-mime-titles completed");

  return NextResponse.json({
    success: true,
    action: "fix-mime-titles",
    message: `Fixed ${fixed} quote title(s)`,
    fixed,
    skipped,
    results,
  });
}
