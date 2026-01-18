import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadFile, deleteFile } from "@/lib/storage";
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

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["application/pdf"];

/**
 * POST /api/quotes/:id/proposal
 * Upload a proposal file for a quote
 *
 * Expects multipart/form-data with a "file" field
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getApiSession();
        if (!session) return unauthorized();

        const { id } = await params;

        // Check quote ownership
        const quote = await prisma.quote.findFirst({
            where: {
                id,
                organizationId: session.user.organizationId,
            },
            select: {
                id: true,
                organizationId: true,
                proposalFileId: true,
                proposalFile: {
                    select: {
                        storagePath: true,
                    },
                },
            },
        });

        if (!quote) {
            return notFound("Orçamento");
        }

        // Parse form data
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return badRequest("Ficheiro não fornecido");
        }

        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            return badRequest("Apenas ficheiros PDF são permitidos");
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return badRequest("Ficheiro demasiado grande (máx. 10MB)");
        }

        // Generate unique filename
        const timestamp = Date.now();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filename = `${timestamp}-${sanitizedName}`;

        // Convert to buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        // Upload to storage
        const uploadResult = await uploadFile(
            quote.organizationId,
            quote.id,
            filename,
            buffer,
            file.type
        );

        if (!uploadResult.success) {
            return serverError(new Error(uploadResult.error || "Upload failed"), "POST /api/quotes/:id/proposal");
        }

        // Delete old file if exists
        if (quote.proposalFile?.storagePath) {
            await deleteFile(quote.proposalFile.storagePath);
        }

        // Create attachment record and update quote in transaction
        const result = await prisma.$transaction(async (tx) => {
            // Delete old attachment if exists
            if (quote.proposalFileId) {
                await tx.attachment.delete({
                    where: { id: quote.proposalFileId },
                });
            }

            // Create new attachment
            const attachment = await tx.attachment.create({
                data: {
                    organizationId: quote.organizationId,
                    filename: file.name,
                    contentType: file.type,
                    sizeBytes: file.size,
                    storagePath: uploadResult.path!,
                    uploadedById: session.user.id,
                },
            });

            // Update quote with new attachment
            const updatedQuote = await tx.quote.update({
                where: { id: quote.id },
                data: {
                    proposalFileId: attachment.id,
                    lastActivityAt: new Date(),
                },
                select: {
                    id: true,
                    proposalLink: true,
                    proposalFileId: true,
                    proposalFile: {
                        select: {
                            id: true,
                            filename: true,
                            contentType: true,
                            sizeBytes: true,
                            createdAt: true,
                        },
                    },
                },
            });

            return updatedQuote;
        });

        return success({
            message: "Proposta carregada com sucesso",
            proposal: result.proposalFile,
        });
    } catch (error) {
        return serverError(error, "POST /api/quotes/:id/proposal");
    }
}

/**
 * DELETE /api/quotes/:id/proposal
 * Remove proposal file from a quote
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
                proposalFileId: true,
                proposalFile: {
                    select: {
                        id: true,
                        storagePath: true,
                    },
                },
            },
        });

        if (!quote) {
            return notFound("Orçamento");
        }

        if (!quote.proposalFile) {
            return badRequest("Este orçamento não tem proposta anexada");
        }

        // Delete file from storage
        await deleteFile(quote.proposalFile.storagePath);

        // Delete attachment and update quote
        await prisma.$transaction(async (tx) => {
            await tx.quote.update({
                where: { id: quote.id },
                data: {
                    proposalFileId: null,
                    lastActivityAt: new Date(),
                },
            });

            await tx.attachment.delete({
                where: { id: quote.proposalFile!.id },
            });
        });

        return success({ message: "Proposta removida com sucesso" });
    } catch (error) {
        return serverError(error, "DELETE /api/quotes/:id/proposal");
    }
}
