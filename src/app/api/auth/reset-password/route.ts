import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { logger } from "@/lib/logger";
import {
    rateLimit,
    getClientIp,
    RateLimitConfigs,
    rateLimitedResponse,
} from "@/lib/security/rate-limit";

const log = logger.child({ endpoint: "auth/reset-password" });

/**
 * POST /api/auth/reset-password
 *
 * Reset password using a valid token.
 *
 * Security:
 * - Rate limited
 * - Token is hashed for lookup (SHA-256)
 * - Token must not be expired or used
 * - Password must be >= 8 characters
 * - All existing sessions are invalidated
 * - Token is marked as used (not deleted, for audit)
 */
export async function POST(request: NextRequest) {
    // Rate limit per IP
    const ip = getClientIp(request);
    const rateLimitResult = await rateLimit({
        key: `reset-password:${ip}`,
        ...RateLimitConfigs.signup,
    });

    if (!rateLimitResult.allowed) {
        return rateLimitedResponse(rateLimitResult.retryAfterSec);
    }

    try {
        const body = await request.json();
        const { token, password } = body;

        // Validate input
        if (!token || typeof token !== "string") {
            return NextResponse.json(
                { error: "Token inválido ou em falta" },
                { status: 400 }
            );
        }

        if (!password || typeof password !== "string") {
            return NextResponse.json(
                { error: "Password é obrigatória" },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: "Password deve ter pelo menos 8 caracteres" },
                { status: 400 }
            );
        }

        // Hash the provided token to look up in DB
        const tokenHash = createHash("sha256").update(token).digest("hex");

        // Find the token record
        const resetToken = await prisma.passwordResetToken.findUnique({
            where: { tokenHash },
            include: {
                user: {
                    select: { id: true, email: true },
                },
            },
        });

        // Validate token exists
        if (!resetToken) {
            log.warn({ tokenHash: tokenHash.substring(0, 8) }, "Reset token not found");
            return NextResponse.json(
                { error: "Token inválido ou expirado" },
                { status: 400 }
            );
        }

        // Check if token was already used
        if (resetToken.usedAt) {
            log.warn(
                { tokenId: resetToken.id, userId: resetToken.userId },
                "Reset token already used"
            );
            return NextResponse.json(
                { error: "Este link já foi utilizado" },
                { status: 400 }
            );
        }

        // Check if token is expired
        if (resetToken.expiresAt < new Date()) {
            log.warn(
                { tokenId: resetToken.id, userId: resetToken.userId },
                "Reset token expired"
            );
            return NextResponse.json(
                { error: "Este link expirou. Por favor, peça um novo." },
                { status: 400 }
            );
        }

        // Hash the new password
        const newPasswordHash = await hashPassword(password);

        // Update user password and mark token as used in a transaction
        await prisma.$transaction(async (tx) => {
            // Update password
            await tx.user.update({
                where: { id: resetToken.userId },
                data: { passwordHash: newPasswordHash },
            });

            // Mark token as used
            await tx.passwordResetToken.update({
                where: { id: resetToken.id },
                data: { usedAt: new Date() },
            });

            // Invalidate all existing sessions for this user (security)
            await tx.session.deleteMany({
                where: { userId: resetToken.userId },
            });
        });

        log.info(
            { userId: resetToken.userId, email: resetToken.user.email },
            "Password reset successful"
        );

        return NextResponse.json({
            success: true,
            message: "Password alterada com sucesso. Pode agora iniciar sessão.",
        });
    } catch (error) {
        log.error({ error }, "Reset password error");
        return NextResponse.json(
            { error: "Ocorreu um erro ao repor a password" },
            { status: 500 }
        );
    }
}
