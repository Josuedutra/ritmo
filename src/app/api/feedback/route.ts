import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApiSession, badRequest, serverError, success } from "@/lib/api-utils";

const feedbackSchema = z.object({
  type: z.enum(["bug", "feature", "other", "nps"]),
  message: z.string().min(0).max(5000),
  page: z.string().optional(),
  npsScore: z.number().int().min(0).max(10).optional(),
});

function getNpsSegment(score: number): "detractor" | "passive" | "promoter" {
  if (score <= 6) return "detractor";
  if (score <= 8) return "passive";
  return "promoter";
}

/**
 * POST /api/feedback
 * Submit feedback from within the app (general feedback or NPS)
 */
export async function POST(request: NextRequest) {
  try {
    // Auth is optional - allow anonymous feedback
    const session = await getApiSession();

    const body = await request.json();
    const parsed = feedbackSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest(parsed.error.errors[0].message);
    }

    const { type, message, page, npsScore } = parsed.data;

    // Validate NPS submissions
    if (type === "nps") {
      if (npsScore === undefined || npsScore === null) {
        return badRequest("npsScore é obrigatório para feedback do tipo NPS");
      }
    } else {
      // Non-NPS: message must be at least 10 chars
      if (message.trim().length < 10) {
        return badRequest("A mensagem deve ter pelo menos 10 caracteres");
      }
    }

    // Get user agent from headers
    const userAgent = request.headers.get("user-agent") || undefined;

    // Compute NPS segment
    const npsSegment =
      type === "nps" && npsScore !== undefined ? getNpsSegment(npsScore) : undefined;

    // Create feedback item
    const feedback = await prisma.feedbackItem.create({
      data: {
        organizationId: session?.user.organizationId || null,
        userId: session?.user.id || null,
        type,
        message: message.trim(),
        page,
        userAgent,
        npsScore: npsScore ?? null,
        npsSegment: npsSegment ?? null,
      },
    });

    return success(
      {
        id: feedback.id,
        message: "Obrigado pelo seu feedback!",
      },
      201
    );
  } catch (error) {
    return serverError(error, "POST /api/feedback");
  }
}
