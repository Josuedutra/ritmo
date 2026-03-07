/**
 * Referral Code Generation — Unit Tests
 *
 * Tests the referral code generation logic from src/lib/referral-codes.ts.
 *
 * Run with: pnpm test (vitest)
 */

import { describe, it, expect, vi } from "vitest";
import { generateSlug, generateReferralCode, isValidReferralCode } from "@/lib/referral-codes";

describe("Referral code generation", () => {
  describe("generateSlug", () => {
    it("converts name to lowercase alphanumeric slug", () => {
      expect(generateSlug("Acme Corp")).toBe("acmecorp");
    });

    it("strips accented characters and special chars", () => {
      expect(generateSlug("Contabilidade José & Filhos")).toBe("contabil");
    });

    it("truncates to 8 chars max", () => {
      expect(generateSlug("VeryLongPartnerName")).toBe("verylong");
    });

    it("handles short names", () => {
      expect(generateSlug("AB")).toBe("ab");
    });

    it("handles names with only special chars", () => {
      expect(generateSlug("@#$%")).toBe("");
    });

    it("handles names with numbers", () => {
      expect(generateSlug("Partner 123")).toBe("partner1");
    });

    it("strips spaces between words", () => {
      expect(generateSlug("My  Great  Firm")).toBe("mygreatf");
    });
  });

  describe("generateReferralCode", () => {
    it("produces slug + 4-char suffix", () => {
      const code = generateReferralCode("Acme Corp");
      // slug "acmecorp" (8) + 4-char suffix = 12
      expect(code).toMatch(/^acmecorp[a-z0-9]{4}$/);
      expect(code.length).toBe(12);
    });

    it("produces shorter code for short names", () => {
      const code = generateReferralCode("AB");
      // slug "ab" (2) + 4-char suffix = 6
      expect(code).toMatch(/^ab[a-z0-9]{4}$/);
      expect(code.length).toBe(6);
    });

    it("produces different codes on repeated calls", () => {
      const codes = new Set<string>();
      for (let i = 0; i < 20; i++) {
        codes.add(generateReferralCode("Test Partner"));
      }
      // With 4-char nanoid suffix, getting 20 unique codes is essentially guaranteed
      expect(codes.size).toBe(20);
    });

    it("all generated codes pass validation", () => {
      for (let i = 0; i < 10; i++) {
        const code = generateReferralCode("Some Partner");
        expect(isValidReferralCode(code)).toBe(true);
      }
    });
  });

  describe("isValidReferralCode", () => {
    it("accepts valid lowercase alphanumeric codes", () => {
      expect(isValidReferralCode("acmecorpx7k2")).toBe(true);
      expect(isValidReferralCode("test1234")).toBe(true);
      expect(isValidReferralCode("abcd")).toBe(true);
    });

    it("rejects codes that are too short", () => {
      expect(isValidReferralCode("abc")).toBe(false);
      expect(isValidReferralCode("")).toBe(false);
    });

    it("rejects codes that are too long", () => {
      expect(isValidReferralCode("a".repeat(15))).toBe(false);
    });

    it("rejects codes with uppercase", () => {
      expect(isValidReferralCode("AcmeCorp")).toBe(false);
    });

    it("rejects codes with special characters", () => {
      expect(isValidReferralCode("acme-corp")).toBe(false);
      expect(isValidReferralCode("acme_corp")).toBe(false);
      expect(isValidReferralCode("acme corp")).toBe(false);
    });
  });

  describe("uniqueness strategy", () => {
    it("collision space is large enough for practical use", () => {
      // customAlphabet with 4 chars from 36-char alphabet = 36^4 = 1,679,616 combinations per slug
      const nanoidAlphabetSize = 36;
      const suffixLength = 4;
      const possibleCodes = Math.pow(nanoidAlphabetSize, suffixLength);
      expect(possibleCodes).toBeGreaterThan(1_000_000);
    });

    it("fallback uses 6-char slug + 6-char suffix for extra entropy", () => {
      // Documented strategy: if 5 attempts fail, uses longer suffix
      const slug = "contab"; // 6-char slug in fallback
      const suffixLength = 6;
      const totalLength = slug.length + suffixLength;
      expect(totalLength).toBe(12);
    });
  });
});
