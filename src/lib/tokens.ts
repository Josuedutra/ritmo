/**
 * Signed Token Utilities
 *
 * Uses HMAC-SHA256 to sign tokens for secure, unforgeable links.
 * Used for: unsubscribe links, password reset, email verification, etc.
 */

import { createHmac, timingSafeEqual, randomBytes, createCipheriv, createDecipheriv } from "crypto";

// Secret key for signing tokens - MUST be set in production
const TOKEN_SECRET = process.env.TOKEN_SECRET || process.env.NEXTAUTH_SECRET || "dev-secret-change-in-production";

// Token expiration (7 days for unsubscribe links)
const DEFAULT_EXPIRY_DAYS = 7;

interface TokenPayload {
    data: string;
    exp: number; // Unix timestamp
}

/**
 * Create a signed token
 *
 * Format: base64url(payload).base64url(signature)
 */
export function createSignedToken(
    data: string,
    expiryDays: number = DEFAULT_EXPIRY_DAYS
): string {
    const exp = Math.floor(Date.now() / 1000) + expiryDays * 24 * 60 * 60;
    const payload: TokenPayload = { data, exp };

    const payloadStr = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = createHmac("sha256", TOKEN_SECRET)
        .update(payloadStr)
        .digest("base64url");

    return `${payloadStr}.${signature}`;
}

/**
 * Verify and decode a signed token
 *
 * Returns the data if valid, null if invalid or expired
 */
export function verifySignedToken(token: string): string | null {
    try {
        const parts = token.split(".");
        if (parts.length !== 2) {
            return null;
        }

        const [payloadStr, providedSignature] = parts;

        // Verify signature
        const expectedSignature = createHmac("sha256", TOKEN_SECRET)
            .update(payloadStr)
            .digest("base64url");

        // Use timing-safe comparison to prevent timing attacks
        const sigBuffer = Buffer.from(providedSignature, "base64url");
        const expectedBuffer = Buffer.from(expectedSignature, "base64url");

        if (sigBuffer.length !== expectedBuffer.length) {
            return null;
        }

        if (!timingSafeEqual(sigBuffer, expectedBuffer)) {
            return null;
        }

        // Decode payload
        const payload: TokenPayload = JSON.parse(
            Buffer.from(payloadStr, "base64url").toString("utf-8")
        );

        // Check expiration
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp < now) {
            return null; // Token expired
        }

        return payload.data;
    } catch {
        return null;
    }
}

/**
 * Create an unsubscribe token
 */
export function createUnsubscribeToken(organizationId: string, email: string): string {
    const data = `${organizationId}:${email.toLowerCase()}`;
    return createSignedToken(data, 30); // 30 days for unsubscribe
}

/**
 * Verify and parse an unsubscribe token
 */
export function verifyUnsubscribeToken(token: string): { organizationId: string; email: string } | null {
    const data = verifySignedToken(token);
    if (!data) {
        return null;
    }

    const [organizationId, email] = data.split(":");
    if (!organizationId || !email) {
        return null;
    }

    return { organizationId, email };
}

// =============================================================================
// CREDENTIAL ENCRYPTION (AES-256-GCM)
// =============================================================================

// Separate secret for credential encryption
const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || process.env.TOKEN_SECRET || process.env.NEXTAUTH_SECRET || "dev-secret-change-in-production";

// Derive a 32-byte key from the secret
function getEncryptionKey(): Buffer {
    return createHmac("sha256", "ritmo-credential-key")
        .update(ENCRYPTION_SECRET)
        .digest();
}

/**
 * Encrypt sensitive data using AES-256-GCM
 *
 * Format: base64(iv + authTag + ciphertext)
 * - IV: 12 bytes (random)
 * - AuthTag: 16 bytes
 * - Ciphertext: variable length
 */
export function encryptCredential(plaintext: string): string {
    const key = getEncryptionKey();
    const iv = randomBytes(12); // GCM standard IV size

    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final()
    ]);
    const authTag = cipher.getAuthTag();

    // Combine: iv (12) + authTag (16) + ciphertext
    const combined = Buffer.concat([iv, authTag, encrypted]);
    return combined.toString("base64");
}

/**
 * Decrypt data encrypted with encryptCredential
 *
 * Returns null if decryption fails (invalid key, tampered data, etc.)
 */
export function decryptCredential(encrypted: string): string | null {
    try {
        const key = getEncryptionKey();
        const combined = Buffer.from(encrypted, "base64");

        // Extract parts
        const iv = combined.subarray(0, 12);
        const authTag = combined.subarray(12, 28);
        const ciphertext = combined.subarray(28);

        const decipher = createDecipheriv("aes-256-gcm", key, iv);
        decipher.setAuthTag(authTag);

        const decrypted = Buffer.concat([
            decipher.update(ciphertext),
            decipher.final()
        ]);

        return decrypted.toString("utf8");
    } catch {
        return null;
    }
}

/**
 * Check if a string is encrypted (vs legacy base64)
 *
 * Encrypted strings are longer due to IV + authTag overhead
 * Minimum length: 12 (iv) + 16 (tag) + 1 (data) = 29 bytes = ~40 base64 chars
 */
export function isEncrypted(value: string): boolean {
    try {
        const decoded = Buffer.from(value, "base64");
        // Must be at least 29 bytes (iv + authTag + 1 byte data)
        // And likely contains binary data (not valid UTF-8 for first 28 bytes)
        return decoded.length >= 29;
    } catch {
        return false;
    }
}

/**
 * Decrypt credential with fallback to legacy base64
 *
 * This allows gradual migration from base64 to encrypted credentials
 */
export function decryptCredentialWithFallback(value: string): string {
    // Try AES decryption first
    const decrypted = decryptCredential(value);
    if (decrypted !== null) {
        return decrypted;
    }

    // Fallback to legacy base64 (for migration)
    return Buffer.from(value, "base64").toString("utf-8");
}
