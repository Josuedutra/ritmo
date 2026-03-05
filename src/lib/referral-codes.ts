/**
 * Referral Code Generation
 *
 * Generates unique referral codes for partners.
 * Format: <slug><suffix> where slug is derived from partner name
 * and suffix is a random alphanumeric string.
 *
 * Example: "acmecorp" + "x7k2" = "acmecorpx7k2"
 */

import { customAlphabet } from "nanoid";
import { prisma } from "@/lib/prisma";

const SLUG_MAX_LENGTH = 8;
const SUFFIX_LENGTH = 4;
const FALLBACK_SUFFIX_LENGTH = 6;
const MAX_RETRIES = 5;

/** Lowercase alphanumeric alphabet for URL-safe referral codes */
const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const randomSuffix = customAlphabet(ALPHABET);

/**
 * Generate a slug from a partner name.
 * Strips non-alphanumeric chars, lowercases, truncates to 8 chars.
 */
export function generateSlug(partnerName: string): string {
  return partnerName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, SLUG_MAX_LENGTH);
}

/**
 * Generate a referral code from a partner name.
 * Format: slug (up to 8 chars) + random suffix (4 chars).
 * Does NOT check DB uniqueness — use generateUniqueReferralCode for that.
 */
export function generateReferralCode(partnerName: string): string {
  const slug = generateSlug(partnerName);
  const suffix = randomSuffix(SUFFIX_LENGTH);
  return `${slug}${suffix}`;
}

/**
 * Generate a unique referral code, retrying on collision.
 * After MAX_RETRIES failures, uses a longer suffix for extra entropy.
 *
 * @throws Error if unable to generate a unique code after all retries
 */
export async function generateUniqueReferralCode(
  partnerName: string
): Promise<string> {
  const slug = generateSlug(partnerName);

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const suffix = randomSuffix(SUFFIX_LENGTH);
    const code = `${slug}${suffix}`;

    const existing = await prisma.referralLink.findUnique({
      where: { code },
    });

    if (!existing) return code;
  }

  // Fallback: use longer suffix for extra uniqueness
  const fallbackSlug = slug.slice(0, 6);
  const fallbackSuffix = randomSuffix(FALLBACK_SUFFIX_LENGTH);
  const fallbackCode = `${fallbackSlug}${fallbackSuffix}`;

  const existing = await prisma.referralLink.findUnique({
    where: { code: fallbackCode },
  });

  if (!existing) return fallbackCode;

  throw new Error(
    `Unable to generate unique referral code for "${partnerName}" after ${MAX_RETRIES + 1} attempts`
  );
}

/**
 * Validate a referral code format.
 * Must be lowercase alphanumeric, 4-14 chars.
 */
export function isValidReferralCode(code: string): boolean {
  return /^[a-z0-9]{4,14}$/.test(code);
}
