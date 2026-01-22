/**
 * Password utilities for bcrypt hashing and legacy migration.
 *
 * Supports transparent upgrade from plaintext to bcrypt on login.
 * This ensures backwards compatibility with existing users while
 * securing all new registrations and gradual migration.
 *
 * Security:
 * - Uses bcryptjs (pure JS, Vercel-compatible)
 * - Cost factor 12 (good balance of security vs performance)
 * - Timing-safe hash detection
 */

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "password" });

// Cost factor for bcrypt (12 is recommended for 2024+)
const BCRYPT_COST = 12;

// Bcrypt hash prefixes (all valid bcrypt formats)
const BCRYPT_PREFIXES = ["$2a$", "$2b$", "$2y$"];

/**
 * Hash a plaintext password using bcrypt.
 *
 * @param plain - The plaintext password to hash
 * @returns The bcrypt hash
 */
export async function hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_COST);
}

/**
 * Verify a plaintext password against a bcrypt hash.
 *
 * @param plain - The plaintext password to verify
 * @param hash - The bcrypt hash to compare against
 * @returns True if the password matches, false otherwise
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
}

/**
 * Check if a stored hash is a bcrypt hash (vs plaintext legacy).
 *
 * Uses prefix detection which is safe and fast.
 *
 * @param hash - The stored password hash/value
 * @returns True if it's a bcrypt hash, false if plaintext/legacy
 */
export function isBcryptHash(hash: string): boolean {
    if (!hash || hash.length < 4) {
        return false;
    }
    return BCRYPT_PREFIXES.some((prefix) => hash.startsWith(prefix));
}

/**
 * Upgrade a legacy plaintext password to bcrypt if it matches.
 *
 * This enables transparent migration: when a user logs in with their
 * old plaintext password, we upgrade it to bcrypt without them noticing.
 *
 * IMPORTANT: Only call this if:
 * 1. The stored hash is NOT bcrypt (isBcryptHash returned false)
 * 2. The plaintext password matches the stored value
 *
 * @param userId - The user's ID
 * @param plain - The plaintext password the user provided
 * @param storedValue - The stored password value (plaintext legacy)
 * @returns True if upgrade was performed, false if no upgrade needed
 */
export async function upgradeLegacyPasswordIfNeeded(
    userId: string,
    plain: string,
    storedValue: string
): Promise<boolean> {
    // Only upgrade if stored value is plaintext (not bcrypt)
    if (isBcryptHash(storedValue)) {
        return false; // Already bcrypt, no upgrade needed
    }

    // Only upgrade if password matches (plaintext comparison)
    if (plain !== storedValue) {
        return false; // Wrong password, don't upgrade
    }

    // Generate bcrypt hash and update user
    try {
        const newHash = await hashPassword(plain);

        await prisma.user.update({
            where: { id: userId },
            data: { passwordHash: newHash },
        });

        log.info(
            { userId, scope: "security" },
            "Legacy password upgraded to bcrypt"
        );

        return true;
    } catch (error) {
        // Log but don't throw - user can still login, upgrade will happen next time
        log.error(
            { userId, error: error instanceof Error ? error.message : "Unknown error" },
            "Failed to upgrade legacy password"
        );
        return false;
    }
}

/**
 * Authenticate a user's password, handling both bcrypt and legacy formats.
 *
 * Flow:
 * 1. If stored hash is bcrypt -> verify with bcrypt
 * 2. If stored hash is plaintext -> compare directly, then upgrade
 *
 * @param plain - The plaintext password provided by user
 * @param storedHash - The stored password hash/value
 * @param userId - The user's ID (for upgrade operation)
 * @returns True if password is valid, false otherwise
 */
export async function authenticatePassword(
    plain: string,
    storedHash: string,
    userId: string
): Promise<boolean> {
    if (!plain || !storedHash) {
        return false;
    }

    // Check if it's a bcrypt hash
    if (isBcryptHash(storedHash)) {
        // Modern path: verify with bcrypt
        return verifyPassword(plain, storedHash);
    }

    // Legacy path: plaintext comparison
    const isValid = plain === storedHash;

    if (isValid) {
        // Upgrade to bcrypt in the background (fire and forget)
        // This runs async so login isn't delayed
        upgradeLegacyPasswordIfNeeded(userId, plain, storedHash).catch((err) => {
            log.error({ userId, error: err }, "Background password upgrade failed");
        });
    }

    return isValid;
}
