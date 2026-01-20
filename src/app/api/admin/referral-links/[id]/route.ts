/**
 * Admin Referral Link API - Single Link
 *
 * DELETE /api/admin/referral-links/:id - Delete a referral link
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { unauthorized, notFound, serverError, success } from "@/lib/api-utils";

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await requireAdminSession();
        if (!session) return unauthorized();

        const { id } = await params;

        const link = await prisma.referralLink.findUnique({
            where: { id },
        });

        if (!link) {
            return notFound("Referral link");
        }

        await prisma.referralLink.delete({
            where: { id },
        });

        return success({ message: "Referral link deleted" });
    } catch (error) {
        return serverError(error, "DELETE /api/admin/referral-links/:id");
    }
}
