import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import {
    rateLimit,
    getClientIp,
    RateLimitConfigs,
    rateLimitedResponse,
} from "@/lib/security/rate-limit";
import { APP_ORIGIN, DEFAULT_EMAIL_FROM } from "@/lib/config";

const log = logger.child({ endpoint: "auth/forgot-password" });

// Token expiry: 60 minutes (configurable via env)
const PASSWORD_RESET_TTL_MINUTES = parseInt(
    process.env.PASSWORD_RESET_TTL_MINUTES || "60",
    10
);

// Rate limit config for per-email (prevents email bombing)
const EMAIL_RATE_LIMIT_CONFIG = {
    maxRequests: 5,       // Max 5 requests per email
    windowSeconds: 3600,  // Per hour
};

// Cooldown between requests to same email (60 seconds)
const EMAIL_COOLDOWN_SECONDS = 60;

/**
 * POST /api/auth/forgot-password
 *
 * Request a password reset token. Sends email with reset link.
 *
 * Security:
 * - Rate limited (prevents enumeration attacks)
 * - Always returns 200 (doesn't reveal if email exists)
 * - Token is hashed before storage (SHA-256)
 * - Token expires after TTL
 */
export async function POST(request: NextRequest) {
    // Rate limit per IP to prevent abuse
    const ip = getClientIp(request);
    const rateLimitResult = await rateLimit({
        key: `forgot-password:${ip}`,
        ...RateLimitConfigs.signup, // Same limits as signup
    });

    if (!rateLimitResult.allowed) {
        return rateLimitedResponse(rateLimitResult.retryAfterSec);
    }

    try {
        const body = await request.json();
        const { email } = body;

        if (!email || typeof email !== "string") {
            // Still return 200 to prevent enumeration
            return NextResponse.json({
                success: true,
                message: "Se o email existir, enviámos instruções para repor a password.",
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Rate limit per email (prevents email bombing)
        // This happens BEFORE checking if user exists to prevent enumeration via timing
        const emailRateLimitResult = await rateLimit({
            key: `forgot-password-email:${normalizedEmail}`,
            ...EMAIL_RATE_LIMIT_CONFIG,
        });

        if (!emailRateLimitResult.allowed) {
            log.warn(
                { email: normalizedEmail },
                "Forgot password: email rate limited (possible abuse)"
            );
            // Still return generic success to prevent enumeration
            return NextResponse.json({
                success: true,
                message: "Se o email existir, enviámos instruções para repor a password.",
            });
        }

        // Check cooldown: if user requested recently, don't send another email
        // This uses the existing PasswordResetToken createdAt
        const recentToken = await prisma.passwordResetToken.findFirst({
            where: {
                user: { email: normalizedEmail },
                createdAt: {
                    gte: new Date(Date.now() - EMAIL_COOLDOWN_SECONDS * 1000),
                },
            },
            select: { createdAt: true },
        });

        if (recentToken) {
            const secondsAgo = Math.floor(
                (Date.now() - recentToken.createdAt.getTime()) / 1000
            );
            const waitSeconds = EMAIL_COOLDOWN_SECONDS - secondsAgo;
            log.debug(
                { email: normalizedEmail, waitSeconds },
                "Forgot password: cooldown active"
            );
            // Return generic success to prevent enumeration
            return NextResponse.json({
                success: true,
                message: "Se o email existir, enviámos instruções para repor a password.",
            });
        }

        // Find user by email (could exist in multiple orgs, get first)
        const user = await prisma.user.findFirst({
            where: { email: normalizedEmail },
            select: { id: true, email: true, name: true },
        });

        if (!user) {
            // Don't reveal that user doesn't exist
            log.debug({ email: normalizedEmail }, "Forgot password: user not found");
            return NextResponse.json({
                success: true,
                message: "Se o email existir, enviámos instruções para repor a password.",
            });
        }

        // Generate secure random token
        const rawToken = randomBytes(32).toString("hex");

        // Hash token before storing (never store raw token in DB)
        const tokenHash = createHash("sha256").update(rawToken).digest("hex");

        // Calculate expiry
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + PASSWORD_RESET_TTL_MINUTES);

        // Delete any existing tokens for this user (one active token at a time)
        await prisma.passwordResetToken.deleteMany({
            where: { userId: user.id },
        });

        // Create new token
        await prisma.passwordResetToken.create({
            data: {
                userId: user.id,
                tokenHash,
                expiresAt,
            },
        });

        // Build reset URL with raw token
        const resetUrl = `${APP_ORIGIN}/reset-password?token=${rawToken}`;

        // Send email (non-blocking, but we await to log errors)
        try {
            await sendEmail({
                to: user.email,
                subject: "Repor password do Ritmo",
                html: `
                    <p>Olá${user.name ? ` ${user.name}` : ""},</p>
                    <p>Recebemos um pedido para repor a sua password no Ritmo.</p>
                    <p>
                        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">
                            Repor password
                        </a>
                    </p>
                    <p>Ou copie este link: ${resetUrl}</p>
                    <p><strong>Este link expira em ${PASSWORD_RESET_TTL_MINUTES} minutos.</strong></p>
                    <p>Se não pediu para repor a password, ignore este email.</p>
                    <p>— Equipa Ritmo</p>
                `,
                text: `
Olá${user.name ? ` ${user.name}` : ""},

Recebemos um pedido para repor a sua password no Ritmo.

Clique aqui para repor: ${resetUrl}

Este link expira em ${PASSWORD_RESET_TTL_MINUTES} minutos.

Se não pediu para repor a password, ignore este email.

— Equipa Ritmo
                `.trim(),
                from: DEFAULT_EMAIL_FROM,
            });

            log.info(
                { userId: user.id, email: normalizedEmail },
                "Password reset email sent"
            );
        } catch (emailError) {
            // Log but don't fail the request (user gets generic success message)
            log.error(
                { error: emailError, userId: user.id },
                "Failed to send password reset email"
            );
        }

        return NextResponse.json({
            success: true,
            message: "Se o email existir, enviámos instruções para repor a password.",
        });
    } catch (error) {
        log.error({ error }, "Forgot password error");
        // Still return 200 to prevent information leakage
        return NextResponse.json({
            success: true,
            message: "Se o email existir, enviámos instruções para repor a password.",
        });
    }
}
