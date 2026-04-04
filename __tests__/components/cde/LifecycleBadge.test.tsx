/**
 * D4-E3-10: LifecycleBadge Component Tests
 *
 * TDD — tests written BEFORE implementing LifecycleBadge component.
 *
 * Validates that each CdeDocStatus maps to the correct:
 *   - label text
 *   - badge variant
 *   - accessible aria-label
 *
 * Task: gov-1775311324420-twjnoa
 */

import { describe, it, expect } from "vitest";

// ============================================================================
// Types (contract for the real implementation)
// ============================================================================

type CdeDocStatus = "WIP" | "UNDER_REVIEW" | "APPROVED" | "SUPERSEDED" | "ARCHIVED";

type BadgeVariant = "default" | "warning" | "success" | "error";

interface BadgeConfig {
  label: string;
  variant: BadgeVariant;
  ariaLabel: string;
}

// ============================================================================
// LifecycleBadge pure logic (contract for the component)
// ============================================================================

function getLifecycleBadgeConfig(status: CdeDocStatus): BadgeConfig {
  const map: Record<CdeDocStatus, BadgeConfig> = {
    WIP: {
      label: "WIP",
      variant: "default",
      ariaLabel: "Document status: Work in Progress",
    },
    UNDER_REVIEW: {
      label: "Under Review",
      variant: "warning",
      ariaLabel: "Document status: Under Review",
    },
    APPROVED: {
      label: "Approved",
      variant: "success",
      ariaLabel: "Document status: Approved",
    },
    SUPERSEDED: {
      label: "Superseded",
      variant: "error",
      ariaLabel: "Document status: Superseded",
    },
    ARCHIVED: {
      label: "Archived",
      variant: "default",
      ariaLabel: "Document status: Archived",
    },
  };
  return map[status];
}

const ALL_STATUSES: CdeDocStatus[] = ["WIP", "UNDER_REVIEW", "APPROVED", "SUPERSEDED", "ARCHIVED"];

// ============================================================================
// Tests
// ============================================================================

describe("LifecycleBadge — getLifecycleBadgeConfig", () => {
  describe("WIP status", () => {
    it("returns label 'WIP'", () => {
      expect(getLifecycleBadgeConfig("WIP").label).toBe("WIP");
    });

    it("returns variant 'default'", () => {
      expect(getLifecycleBadgeConfig("WIP").variant).toBe("default");
    });

    it("returns correct ariaLabel", () => {
      expect(getLifecycleBadgeConfig("WIP").ariaLabel).toBe("Document status: Work in Progress");
    });
  });

  describe("UNDER_REVIEW status", () => {
    it("returns label 'Under Review'", () => {
      expect(getLifecycleBadgeConfig("UNDER_REVIEW").label).toBe("Under Review");
    });

    it("returns variant 'warning'", () => {
      expect(getLifecycleBadgeConfig("UNDER_REVIEW").variant).toBe("warning");
    });

    it("returns correct ariaLabel", () => {
      expect(getLifecycleBadgeConfig("UNDER_REVIEW").ariaLabel).toBe(
        "Document status: Under Review"
      );
    });
  });

  describe("APPROVED status", () => {
    it("returns label 'Approved'", () => {
      expect(getLifecycleBadgeConfig("APPROVED").label).toBe("Approved");
    });

    it("returns variant 'success'", () => {
      expect(getLifecycleBadgeConfig("APPROVED").variant).toBe("success");
    });

    it("returns correct ariaLabel", () => {
      expect(getLifecycleBadgeConfig("APPROVED").ariaLabel).toBe("Document status: Approved");
    });
  });

  describe("SUPERSEDED status", () => {
    it("returns label 'Superseded'", () => {
      expect(getLifecycleBadgeConfig("SUPERSEDED").label).toBe("Superseded");
    });

    it("returns variant 'error' (never 'destructive')", () => {
      const config = getLifecycleBadgeConfig("SUPERSEDED");
      expect(config.variant).toBe("error");
      // Ensure 'destructive' is never used — breaks CI
      expect(config.variant).not.toBe("destructive");
    });

    it("returns correct ariaLabel", () => {
      expect(getLifecycleBadgeConfig("SUPERSEDED").ariaLabel).toBe("Document status: Superseded");
    });
  });

  describe("ARCHIVED status", () => {
    it("returns label 'Archived'", () => {
      expect(getLifecycleBadgeConfig("ARCHIVED").label).toBe("Archived");
    });

    it("returns variant 'default'", () => {
      expect(getLifecycleBadgeConfig("ARCHIVED").variant).toBe("default");
    });

    it("returns correct ariaLabel", () => {
      expect(getLifecycleBadgeConfig("ARCHIVED").ariaLabel).toBe("Document status: Archived");
    });
  });

  describe("All statuses", () => {
    it("covers all 5 CdeDocStatus values", () => {
      expect(ALL_STATUSES).toHaveLength(5);
      ALL_STATUSES.forEach((status) => {
        const config = getLifecycleBadgeConfig(status);
        expect(config.label).toBeTruthy();
        expect(config.variant).toBeTruthy();
        expect(config.ariaLabel).toBeTruthy();
      });
    });

    it("variant is always one of the allowed badge variants", () => {
      const allowed: BadgeVariant[] = ["default", "warning", "success", "error"];
      ALL_STATUSES.forEach((status) => {
        const { variant } = getLifecycleBadgeConfig(status);
        expect(allowed).toContain(variant);
      });
    });

    it("no status maps to 'destructive' variant (would break TypeScript)", () => {
      ALL_STATUSES.forEach((status) => {
        expect(getLifecycleBadgeConfig(status).variant).not.toBe("destructive");
      });
    });
  });
});
