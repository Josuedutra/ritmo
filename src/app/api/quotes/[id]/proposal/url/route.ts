import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSignedUrl } from "@/lib/storage";
import {
    getApiSession,
    unauthorized,
    notFound,
    badRequest,
    serverError,
    success,
} from "@/lib/api-utils";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// URL expires after 10 minutes for security
const URL_EXPIRY_SECONDS = 10 * 60;

/**
 * GET /api/quotes/:id/proposal/url
 * Get a signed URL to view/download the proposal file
 *
 * The URL expires after 10 minutes and validates organization access
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const { id } = await params;

        // Check quote ownership and get file info
        const quote = await prisma.quote.findFirst({
            where: {
                id,
                organizationId: session.user.organizationId,
            },
            select: {
                id: true,
                proposalLink: true,
                proposalFile: {
                    select: {
                        id: true,
                        filename: true,
                        contentType: true,
                        storagePath: true,
                    },
                },
            },
        });

        if (!quote) {
            return notFound("Orçamento");
        }

        // If no uploaded file, return the external link if available
        if (!quote.proposalFile) {
            if (quote.proposalLink) {
                return success({
                    type: "external",
                    url: quote.proposalLink,
                    expiresAt: null,
                });
            }
            return badRequest("Este orçamento não tem proposta");
        }

        // Generate signed URL for uploaded file
        const result = await getSignedUrl(quote.proposalFile.storagePath, URL_EXPIRY_SECONDS);

        if (!result.success) {
            return serverError(
                new Error(result.error || "Failed to generate URL"),
                "GET /api/quotes/:id/proposal/url"
            );
        }

        const expiresAt = new Date(Date.now() + URL_EXPIRY_SECONDS * 1000);

        return success({
            type: "signed",
            url: result.url,
            filename: quote.proposalFile.filename,
            contentType: quote.proposalFile.contentType,
            expiresAt: expiresAt.toISOString(),
        });
    } catch (error) {
        return serverError(error, "GET /api/quotes/:id/proposal/url");
    }
}
