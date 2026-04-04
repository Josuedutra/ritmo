/**
 * D4-E3-02: CDE Document Lifecycle State Machine Tests
 *
 * TDD — tests written BEFORE implementing transitionDocumentLifecycle().
 *
 * Valid transition map:
 *   WIP        → SHARED
 *   SHARED     → PUBLISHED | WIP  (retract)
 *   PUBLISHED  → SUPERSEDED | ARCHIVED
 *   SUPERSEDED → ARCHIVED
 *   ARCHIVED   → (terminal — no outgoing transitions)
 *
 * Task: gov-1775310255872-9rj4cu
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Types (contract for the real implementation)
// ============================================================================

type DocumentStatus = "WIP" | "SHARED" | "PUBLISHED" | "SUPERSEDED" | "ARCHIVED";

interface TransitionInput {
  documentId: string;
  fromStatus: DocumentStatus;
  toStatus: DocumentStatus;
  reason: string;
  userId: string;
}

interface StatusTransitionLog {
  id: string;
  documentId: string;
  fromStatus: string;
  toStatus: string;
  reason: string;
  userId: string;
  createdAt: Date;
}

interface TransitionResult {
  document: { id: string; status: DocumentStatus };
  log: StatusTransitionLog;
}

// ============================================================================
// State machine — valid transitions map
// ============================================================================

const VALID_TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = {
  WIP: ["SHARED"],
  SHARED: ["PUBLISHED", "WIP"],
  PUBLISHED: ["SUPERSEDED", "ARCHIVED"],
  SUPERSEDED: ["ARCHIVED"],
  ARCHIVED: [],
};

// ============================================================================
// Mock Prisma — using vi.mock + vi.mocked() pattern
// ============================================================================

vi.mock("@/lib/prisma", () => ({
  prisma: {
    document: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    statusTransitionLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

// Safe typed helpers for mock operations
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const docUpdate = vi.mocked((prisma.document as any).update) as ReturnType<typeof vi.fn>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const logCreate = vi.mocked((prisma.statusTransitionLog as any).create) as ReturnType<typeof vi.fn>;

// ============================================================================
// Reference implementation (defines the contract — real impl comes next task)
// ============================================================================

async function transitionDocumentLifecycle(input: TransitionInput): Promise<TransitionResult> {
  const { documentId, fromStatus, toStatus, reason, userId } = input;

  if (!reason || reason.trim() === "") {
    throw new Error("reason is required for lifecycle transitions");
  }

  const allowed = VALID_TRANSITIONS[fromStatus];
  if (!allowed.includes(toStatus)) {
    const allowedStr = allowed.length > 0 ? allowed.join(", ") : "none (terminal state)";
    throw new Error(`Invalid transition: ${fromStatus} → ${toStatus}. Allowed: ${allowedStr}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatedDocument = await (prisma.document as any).update({
    where: { id: documentId },
    data: { status: toStatus },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const log = await (prisma.statusTransitionLog as any).create({
    data: {
      documentId,
      fromStatus,
      toStatus,
      reason: reason.trim(),
      userId,
      createdAt: new Date(),
    },
  });

  return { document: updatedDocument, log };
}

// ============================================================================
// Tests
// ============================================================================

describe("D4-E3-02: Document Lifecycle State Machine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Cenário 1: WIP → SHARED (valid transition, reason provided)
  // ──────────────────────────────────────────────────────────────────────────
  describe("Scenario 1: WIP → SHARED (valid transition)", () => {
    it("should succeed and create a StatusTransitionLog entry", async () => {
      const docId = "doc-001";
      const updatedDoc = { id: docId, status: "SHARED" as DocumentStatus };
      const logEntry: StatusTransitionLog = {
        id: "log-001",
        documentId: docId,
        fromStatus: "WIP",
        toStatus: "SHARED",
        reason: "Pronto para revisão pela equipa",
        userId: "user-001",
        createdAt: new Date(),
      };

      docUpdate.mockResolvedValue(updatedDoc);
      logCreate.mockResolvedValue(logEntry);

      const result = await transitionDocumentLifecycle({
        documentId: docId,
        fromStatus: "WIP",
        toStatus: "SHARED",
        reason: "Pronto para revisão pela equipa",
        userId: "user-001",
      });

      expect(result.document.status).toBe("SHARED");
      expect(result.log.fromStatus).toBe("WIP");
      expect(result.log.toStatus).toBe("SHARED");
      expect(result.log.reason).toBe("Pronto para revisão pela equipa");
      expect(docUpdate).toHaveBeenCalledOnce();
      expect(logCreate).toHaveBeenCalledOnce();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Cenário 2: SHARED → PUBLISHED (valid transition)
  // ──────────────────────────────────────────────────────────────────────────
  describe("Scenario 2: SHARED → PUBLISHED (valid transition)", () => {
    it("should succeed and return the updated document with PUBLISHED status", async () => {
      const docId = "doc-002";
      const updatedDoc = { id: docId, status: "PUBLISHED" as DocumentStatus };
      const logEntry: StatusTransitionLog = {
        id: "log-002",
        documentId: docId,
        fromStatus: "SHARED",
        toStatus: "PUBLISHED",
        reason: "Aprovado pela direcção",
        userId: "user-002",
        createdAt: new Date(),
      };

      docUpdate.mockResolvedValue(updatedDoc);
      logCreate.mockResolvedValue(logEntry);

      const result = await transitionDocumentLifecycle({
        documentId: docId,
        fromStatus: "SHARED",
        toStatus: "PUBLISHED",
        reason: "Aprovado pela direcção",
        userId: "user-002",
      });

      expect(result.document.status).toBe("PUBLISHED");
      expect(result.log.fromStatus).toBe("SHARED");
      expect(result.log.toStatus).toBe("PUBLISHED");
      expect(logCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fromStatus: "SHARED",
            toStatus: "PUBLISHED",
          }),
        })
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Cenário 3: WIP → PUBLISHED (invalid — skip not allowed)
  // ──────────────────────────────────────────────────────────────────────────
  describe("Scenario 3: WIP → PUBLISHED (invalid transition — skip not allowed)", () => {
    it("should throw an error and not touch the database", async () => {
      await expect(
        transitionDocumentLifecycle({
          documentId: "doc-003",
          fromStatus: "WIP",
          toStatus: "PUBLISHED",
          reason: "Tentativa de saltar etapas",
          userId: "user-003",
        })
      ).rejects.toThrow("Invalid transition: WIP → PUBLISHED");

      expect(docUpdate).not.toHaveBeenCalled();
      expect(logCreate).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Cenário 4: Transition without reason → must be rejected
  // ──────────────────────────────────────────────────────────────────────────
  describe("Scenario 4: Transition without reason (reason is mandatory)", () => {
    it("should throw when reason is empty string", async () => {
      await expect(
        transitionDocumentLifecycle({
          documentId: "doc-004",
          fromStatus: "WIP",
          toStatus: "SHARED",
          reason: "",
          userId: "user-004",
        })
      ).rejects.toThrow("reason is required");

      expect(docUpdate).not.toHaveBeenCalled();
    });

    it("should throw when reason is whitespace only", async () => {
      await expect(
        transitionDocumentLifecycle({
          documentId: "doc-004",
          fromStatus: "WIP",
          toStatus: "SHARED",
          reason: "   ",
          userId: "user-004",
        })
      ).rejects.toThrow("reason is required");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Cenário 5: PUBLISHED → SUPERSEDED (valid transition)
  // ──────────────────────────────────────────────────────────────────────────
  describe("Scenario 5: PUBLISHED → SUPERSEDED (valid transition)", () => {
    it("should succeed and log the transition", async () => {
      const docId = "doc-005";
      const updatedDoc = { id: docId, status: "SUPERSEDED" as DocumentStatus };
      const logEntry: StatusTransitionLog = {
        id: "log-005",
        documentId: docId,
        fromStatus: "PUBLISHED",
        toStatus: "SUPERSEDED",
        reason: "Substituído pela versão v2.0",
        userId: "user-005",
        createdAt: new Date(),
      };

      docUpdate.mockResolvedValue(updatedDoc);
      logCreate.mockResolvedValue(logEntry);

      const result = await transitionDocumentLifecycle({
        documentId: docId,
        fromStatus: "PUBLISHED",
        toStatus: "SUPERSEDED",
        reason: "Substituído pela versão v2.0",
        userId: "user-005",
      });

      expect(result.document.status).toBe("SUPERSEDED");
      expect(result.log.fromStatus).toBe("PUBLISHED");
      expect(result.log.toStatus).toBe("SUPERSEDED");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Cenário 6: ARCHIVED → WIP (invalid — terminal state)
  // ──────────────────────────────────────────────────────────────────────────
  describe("Scenario 6: ARCHIVED → WIP (invalid — terminal state)", () => {
    it("should throw because ARCHIVED is a terminal state with no outgoing transitions", async () => {
      await expect(
        transitionDocumentLifecycle({
          documentId: "doc-006",
          fromStatus: "ARCHIVED",
          toStatus: "WIP",
          reason: "Tentar ressuscitar documento arquivado",
          userId: "user-006",
        })
      ).rejects.toThrow("Invalid transition: ARCHIVED → WIP");

      expect(docUpdate).not.toHaveBeenCalled();
      expect(logCreate).not.toHaveBeenCalled();
    });

    it("should include 'terminal state' hint in the error message", async () => {
      await expect(
        transitionDocumentLifecycle({
          documentId: "doc-006",
          fromStatus: "ARCHIVED",
          toStatus: "WIP",
          reason: "Tentativa",
          userId: "user-006",
        })
      ).rejects.toThrow(/terminal state/i);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // StatusTransitionLog append-only guarantee
  // ──────────────────────────────────────────────────────────────────────────
  describe("StatusTransitionLog — append-only guarantee", () => {
    it("should call statusTransitionLog.create (not update/delete) on every valid transition", async () => {
      const docId = "doc-007";
      docUpdate.mockResolvedValue({ id: docId, status: "SHARED" });
      logCreate.mockResolvedValue({
        id: "log-007",
        documentId: docId,
        fromStatus: "WIP",
        toStatus: "SHARED",
        reason: "Primeira transição",
        userId: "user-007",
        createdAt: new Date(),
      });

      await transitionDocumentLifecycle({
        documentId: docId,
        fromStatus: "WIP",
        toStatus: "SHARED",
        reason: "Primeira transição",
        userId: "user-007",
      });

      // Only create is called — never update or delete on the log
      expect(logCreate).toHaveBeenCalledOnce();
      expect(docUpdate).toHaveBeenCalledOnce();
    });

    it("should accumulate multiple log entries across sequential transitions", async () => {
      const docId = "doc-008";

      // Transition 1: WIP → SHARED
      docUpdate.mockResolvedValueOnce({ id: docId, status: "SHARED" });
      logCreate.mockResolvedValueOnce({
        id: "log-008a",
        documentId: docId,
        fromStatus: "WIP",
        toStatus: "SHARED",
        reason: "Para revisão",
        userId: "user-008",
        createdAt: new Date(),
      });

      await transitionDocumentLifecycle({
        documentId: docId,
        fromStatus: "WIP",
        toStatus: "SHARED",
        reason: "Para revisão",
        userId: "user-008",
      });

      // Transition 2: SHARED → PUBLISHED
      docUpdate.mockResolvedValueOnce({ id: docId, status: "PUBLISHED" });
      logCreate.mockResolvedValueOnce({
        id: "log-008b",
        documentId: docId,
        fromStatus: "SHARED",
        toStatus: "PUBLISHED",
        reason: "Aprovado",
        userId: "user-008",
        createdAt: new Date(),
      });

      await transitionDocumentLifecycle({
        documentId: docId,
        fromStatus: "SHARED",
        toStatus: "PUBLISHED",
        reason: "Aprovado",
        userId: "user-008",
      });

      // Two create calls = two log entries appended (never overwritten)
      expect(logCreate).toHaveBeenCalledTimes(2);
      expect(docUpdate).toHaveBeenCalledTimes(2);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // VALID_TRANSITIONS map — pure state machine unit tests
  // ──────────────────────────────────────────────────────────────────────────
  describe("VALID_TRANSITIONS map", () => {
    it("WIP can only transition to SHARED", () => {
      expect(VALID_TRANSITIONS["WIP"]).toEqual(["SHARED"]);
    });

    it("SHARED can transition to PUBLISHED or retract to WIP", () => {
      expect(VALID_TRANSITIONS["SHARED"]).toContain("PUBLISHED");
      expect(VALID_TRANSITIONS["SHARED"]).toContain("WIP");
    });

    it("PUBLISHED can transition to SUPERSEDED or ARCHIVED", () => {
      expect(VALID_TRANSITIONS["PUBLISHED"]).toContain("SUPERSEDED");
      expect(VALID_TRANSITIONS["PUBLISHED"]).toContain("ARCHIVED");
    });

    it("SUPERSEDED can only transition to ARCHIVED", () => {
      expect(VALID_TRANSITIONS["SUPERSEDED"]).toEqual(["ARCHIVED"]);
    });

    it("ARCHIVED is terminal — no outgoing transitions", () => {
      expect(VALID_TRANSITIONS["ARCHIVED"]).toHaveLength(0);
    });
  });
});
