import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
    getApiSession,
    unauthorized,
    forbidden,
    serverError,
    success,
    badRequest,
} from "@/lib/api-utils";
import { canConfigurePriorityRules } from "@/lib/entitlements";
import { getOrgPriorityRules } from "@/lib/priority-rules";

/**
 * GET /api/settings/priority-rules
 * Get current priority rules for the organization
 */
export async function GET() {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const rules = await getOrgPriorityRules(session.user.organizationId);
        const canConfigure = await canConfigurePriorityRules(session.user.organizationId);

        return success({
            rules,
            canConfigure: canConfigure.allowed,
            planRequired: canConfigure.planRequired,
        });
    } catch (error) {
        return serverError(error, "GET /api/settings/priority-rules");
    }
}

const updateRulesSchema = z.object({
    threshold: z.number().positive("O limiar deve ser positivo").optional(),
    tags: z.array(z.string().min(1)).max(10, "Máximo 10 tags de prioridade").optional(),
});

/**
 * PUT /api/settings/priority-rules
 * Update priority rules (Pro only, admin only)
 */
export async function PUT(request: NextRequest) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        // Only admins can update rules
        if (session.user.role !== "admin") {
            return forbidden("Apenas administradores podem alterar regras de prioridade");
        }

        // Check if org can configure priority rules (Pro feature)
        const canConfigure = await canConfigurePriorityRules(session.user.organizationId);
        if (!canConfigure.allowed) {
            return forbidden(
                `Regras de prioridade personalizadas disponíveis apenas no plano ${canConfigure.planRequired}. Atualize para configurar regras avançadas.`
            );
        }

        const body = await request.json();
        const parsed = updateRulesSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(parsed.error.errors[0].message);
        }

        const { threshold, tags } = parsed.data;

        // Update org
        await prisma.organization.update({
            where: { id: session.user.organizationId },
            data: {
                ...(threshold !== undefined && { priorityThreshold: threshold }),
                ...(tags !== undefined && { priorityTags: tags }),
            },
        });

        // Return updated rules
        const rules = await getOrgPriorityRules(session.user.organizationId);

        return success({ rules });
    } catch (error) {
        return serverError(error, "PUT /api/settings/priority-rules");
    }
}
