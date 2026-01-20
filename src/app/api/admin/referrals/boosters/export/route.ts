/**
 * Admin Booster CSV Export API
 *
 * GET /api/admin/referrals/boosters/export
 *
 * Query params:
 * - range: YYYY-MM (specific month) or "last3" (last 3 months)
 * - start: YYYY-MM-DD (optional, custom range start)
 * - end: YYYY-MM-DD (optional, custom range end)
 *
 * Returns CSV with columns:
 * partnerName, orgName, orgId, amountCents, currency, status, stripeInvoiceId, createdAt, updatedAt
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { unauthorized, serverError } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
    try {
        const session = await requireAdminSession();
        if (!session) return unauthorized();

        const { searchParams } = new URL(request.url);
        const range = searchParams.get("range");
        const startParam = searchParams.get("start");
        const endParam = searchParams.get("end");

        // Calculate date range
        let startDate: Date;
        let endDate: Date;

        if (startParam && endParam) {
            // Custom range
            startDate = new Date(startParam);
            endDate = new Date(endParam);
            endDate.setHours(23, 59, 59, 999);
        } else if (range === "last3") {
            // Last 3 months
            endDate = new Date();
            startDate = new Date();
            startDate.setMonth(startDate.getMonth() - 3);
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
        } else if (range && /^\d{4}-\d{2}$/.test(range)) {
            // Specific month (YYYY-MM)
            const [year, month] = range.split("-").map(Number);
            startDate = new Date(year, month - 1, 1);
            endDate = new Date(year, month, 0, 23, 59, 59, 999);
        } else {
            // Default: current month
            const now = new Date();
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        }

        // Fetch boosters with related data
        const boosters = await prisma.boosterLedger.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: {
                partner: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        // Fetch organization names
        const orgIds = [...new Set(boosters.map((b) => b.organizationId))];
        const organizations = await prisma.organization.findMany({
            where: { id: { in: orgIds } },
            select: { id: true, name: true },
        });
        const orgMap = new Map(organizations.map((o) => [o.id, o.name]));

        // Build CSV
        const headers = [
            "partnerName",
            "orgName",
            "orgId",
            "amountCents",
            "currency",
            "status",
            "stripeInvoiceId",
            "createdAt",
            "updatedAt",
        ];

        const rows = boosters.map((b) => [
            escapeCSV(b.partner.name),
            escapeCSV(orgMap.get(b.organizationId) || "Unknown"),
            b.organizationId,
            b.amountCents.toString(),
            b.currency,
            b.status,
            b.stripeInvoiceId || "",
            b.createdAt.toISOString(),
            b.updatedAt.toISOString(),
        ]);

        const csv = [
            headers.join(","),
            ...rows.map((row) => row.join(",")),
        ].join("\n");

        // Generate filename
        const filename = range === "last3"
            ? `boosters_last3months_${formatDateForFilename(new Date())}.csv`
            : `boosters_${range || formatMonthForFilename(new Date())}.csv`;

        return new NextResponse(csv, {
            status: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        return serverError(error, "GET /api/admin/referrals/boosters/export");
    }
}

/**
 * Escape value for CSV (handle commas, quotes, newlines)
 */
function escapeCSV(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

/**
 * Format date for filename (YYYYMMDD)
 */
function formatDateForFilename(date: Date): string {
    return date.toISOString().slice(0, 10).replace(/-/g, "");
}

/**
 * Format month for filename (YYYY-MM)
 */
function formatMonthForFilename(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
