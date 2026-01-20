import { NextRequest } from "next/server";
import {
    getApiSession,
    unauthorized,
    forbidden,
    serverError,
    success,
} from "@/lib/api-utils";
import { getBenchmarkData } from "@/lib/org-metrics";
import { canAccessBenchmark } from "@/lib/entitlements";

/**
 * GET /api/dashboard/benchmark
 *
 * Get benchmark comparison for the current organization.
 * Compares org metrics with peers in the same sector.
 *
 * Access:
 * - Pro, Enterprise: Full access
 * - Starter, Trial, Free: No access (upgrade to Pro)
 *
 * Returns:
 * - sector: Organization's sector
 * - sampleSize: Number of orgs in comparison
 * - hasEnoughData: Whether N >= 10 for valid comparison
 * - metrics: Value + P50/P75/P90 for each metric
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const orgId = session.user.organizationId;

        // Check access
        const access = await canAccessBenchmark(orgId);

        if (!access.allowed) {
            return forbidden(
                `O Benchmark está disponível apenas no plano ${access.planRequired}. Atualize para comparar o seu desempenho com o mercado.`
            );
        }

        // Get benchmark data
        const data = await getBenchmarkData(orgId);

        if (!data) {
            return success({
                access: "full",
                hasData: false,
                message: "Não foi possível calcular o benchmark. Aguarde mais dados.",
            });
        }

        if (!data.sector) {
            return success({
                access: "full",
                hasData: false,
                needsSector: true,
                message: "Selecione o seu setor nas configurações para ver comparações com o mercado.",
                settingsUrl: "/settings",
            });
        }

        if (!data.hasEnoughData) {
            return success({
                access: "full",
                hasData: false,
                sector: data.sector,
                sampleSize: data.sampleSize,
                minRequired: 10,
                message: `Ainda não há dados suficientes no setor ${getSectorLabel(data.sector)} (${data.sampleSize}/10 organizações). Aguarde mais participantes.`,
            });
        }

        return success({
            access: "full",
            hasData: true,
            sector: data.sector,
            sectorLabel: getSectorLabel(data.sector),
            sampleSize: data.sampleSize,
            metrics: data.metrics,
        });
    } catch (error) {
        return serverError(error, "GET /api/dashboard/benchmark");
    }
}

function getSectorLabel(sector: string): string {
    const labels: Record<string, string> = {
        AVAC: "AVAC",
        MAINTENANCE: "Manutenção",
        IT: "IT / Tecnologia",
        FACILITIES: "Facilities",
        OTHER: "Outros",
    };
    return labels[sector] || sector;
}
