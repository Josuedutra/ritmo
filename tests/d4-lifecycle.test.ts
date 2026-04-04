/**
 * D4-E3-02: CDE Document Lifecycle State Machine Tests
 *
 * TDD — tests written BEFORE implementing transitionDocumentLifecycle().
 * Models (Document, StatusTransitionLog) exist in the D4 migration (not yet on main).
 * Using dependency injection to avoid Prisma schema dependency.
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

// Minimal Prisma interface — matches the D4 schema models
interface LifecyclePrismaClient {
  document: {
    update: (args: { where: { id: string }; data: { status: string } }) => Promise<{
      id: string;
      status: DocumentStatus;
    }>;
  };
  statusTransitionLog: {
    create: (args: { data: object }) => Promise<StatusTransitionLog>;
  };
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
// Reference implementation with dependency injection
// (defines the contract — real impl comes next task)
// ============================================================================

async function transitionDocumentLifecycle(
  input: TransitionInput,
  db: LifecyclePrismaClient
): Promise<TransitionResult> {
  const { documentId, fromStatus, toStatus, reason, userId } = input;

  if (!reason || reason.trim() === "") {
    throw new Error("reason is required for lifecycle transitions");
  }

  const allowed = VALID_TRANSITIONS[fromStatus];
  if (!allowed.includes(toStatus)) {
    const allowedStr = allowed.length > 0 ? allowed.join(", ") : "none (terminal state)";
    throw new Error(`Invalid transition: ${fromStatus} → ${toStatus}. Allowed: ${allowedStr}`);
  }

  const updatedDocument = await db.document.update({
    where: { id: documentId },
    data: { status: toStatus },
  });

  const log = await db.statusTransitionLog.create({
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
// Mock Prisma factory
// ============================================================================

function makeMockDb() {
  return {
    document: {
      update: vi.fn(),
    },
    statusTransitionLog: {
      create: vi.fn(),
    },
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("D4-E3-02: Document Lifecycle State Machine", () => {
  let db: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    db = makeMockDb();
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

      db.document.update.mockResolvedValue(updatedDoc);
      db.statusTransitionLog.create.mockResolvedValue(logEntry);

      const result = await transitionDocumentLifecycle(
        {
          documentId: docId,
          fromStatus: "WIP",
          toStatus: "SHARED",
          reason: "Pronto para revisão pela equipa",
          userId: "user-001",
        },
        db
      );

      expect(result.document.status).toBe("SHARED");
      expect(result.log.fromStatus).toBe("WIP");
      expect(result.log.toStatus).toBe("SHARED");
      expect(result.log.reason).toBe("Pronto para revisão pela equipa");
      expect(db.document.update).toHaveBeenCalledOnce();
      expect(db.statusTransitionLog.create).toHaveBeenCalledOnce();
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

      db.document.update.mockResolvedValue(updatedDoc);
      db.statusTransitionLog.create.mockResolvedValue(logEntry);

      const result = await transitionDocumentLifecycle(
        {
          documentId: docId,
          fromStatus: "SHARED",
          toStatus: "PUBLISHED",
          reason: "Aprovado pela direcção",
          userId: "user-002",
        },
        db
      );

      expect(result.document.status).toBe("PUBLISHED");
      expect(result.log.fromStatus).toBe("SHARED");
      expect(result.log.toStatus).toBe("PUBLISHED");
      expect(db.statusTransitionLog.create).toHaveBeenCalledWith(
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
        transitionDocumentLifecycle(
          {
            documentId: "doc-003",
            fromStatus: "WIP",
            toStatus: "PUBLISHED",
            reason: "Tentativa de saltar etapas",
            userId: "user-003",
          },
          db
        )
      ).rejects.toThrow("Invalid transition: WIP → PUBLISHED");

      expect(db.document.update).not.toHaveBeenCalled();
      expect(db.statusTransitionLog.create).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Cenário 4: Transition without reason → must be rejected
  // ──────────────────────────────────────────────────────────────────────────
  describe("Scenario 4: Transition without reason (reason is mandatory)", () => {
    it("should throw when reason is empty string", async () => {
      await expect(
        transitionDocumentLifecycle(
          {
            documentId: "doc-004",
            fromStatus: "WIP",
            toStatus: "SHARED",
            reason: "",
            userId: "user-004",
          },
          db
        )
      ).rejects.toThrow("reason is required");

      expect(db.document.update).not.toHaveBeenCalled();
    });

    it("should throw when reason is whitespace only", async () => {
      await expect(
        transitionDocumentLifecycle(
          {
            documentId: "doc-004",
            fromStatus: "WIP",
            toStatus: "SHARED",
            reason: "   ",
            userId: "user-004",
          },
          db
        )
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

      db.document.update.mockResolvedValue(updatedDoc);
      db.statusTransitionLog.create.mockResolvedValue(logEntry);

      const result = await transitionDocumentLifecycle(
        {
          documentId: docId,
          fromStatus: "PUBLISHED",
          toStatus: "SUPERSEDED",
          reason: "Substituído pela versão v2.0",
          userId: "user-005",
        },
        db
      );

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
        transitionDocumentLifecycle(
          {
            documentId: "doc-006",
            fromStatus: "ARCHIVED",
            toStatus: "WIP",
            reason: "Tentar ressuscitar documento arquivado",
            userId: "user-006",
          },
          db
        )
      ).rejects.toThrow("Invalid transition: ARCHIVED → WIP");

      expect(db.document.update).not.toHaveBeenCalled();
      expect(db.statusTransitionLog.create).not.toHaveBeenCalled();
    });

    it("should include 'terminal state' hint in the error message", async () => {
      await expect(
        transitionDocumentLifecycle(
          {
            documentId: "doc-006",
            fromStatus: "ARCHIVED",
            toStatus: "WIP",
            reason: "Tentativa",
            userId: "user-006",
          },
          db
        )
      ).rejects.toThrow(/terminal state/i);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // StatusTransitionLog append-only guarantee
  // ──────────────────────────────────────────────────────────────────────────
  describe("StatusTransitionLog — append-only guarantee", () => {
    it("should call statusTransitionLog.create (not update/delete) on every valid transition", async () => {
      const docId = "doc-007";
      db.document.update.mockResolvedValue({ id: docId, status: "SHARED" });
      db.statusTransitionLog.create.mockResolvedValue({
        id: "log-007",
        documentId: docId,
        fromStatus: "WIP",
        toStatus: "SHARED",
        reason: "Primeira transição",
        userId: "user-007",
        createdAt: new Date(),
      });

      await transitionDocumentLifecycle(
        {
          documentId: docId,
          fromStatus: "WIP",
          toStatus: "SHARED",
          reason: "Primeira transição",
          userId: "user-007",
        },
        db
      );

      // Only create is called — never update or delete on the log (append-only)
      expect(db.statusTransitionLog.create).toHaveBeenCalledOnce();
      expect(db.document.update).toHaveBeenCalledOnce();
    });

    it("should accumulate multiple log entries across sequential transitions", async () => {
      const docId = "doc-008";

      // Transition 1: WIP → SHARED
      db.document.update.mockResolvedValueOnce({ id: docId, status: "SHARED" });
      db.statusTransitionLog.create.mockResolvedValueOnce({
        id: "log-008a",
        documentId: docId,
        fromStatus: "WIP",
        toStatus: "SHARED",
        reason: "Para revisão",
        userId: "user-008",
        createdAt: new Date(),
      });

      await transitionDocumentLifecycle(
        {
          documentId: docId,
          fromStatus: "WIP",
          toStatus: "SHARED",
          reason: "Para revisão",
          userId: "user-008",
        },
        db
      );

      // Transition 2: SHARED → PUBLISHED
      db.document.update.mockResolvedValueOnce({ id: docId, status: "PUBLISHED" });
      db.statusTransitionLog.create.mockResolvedValueOnce({
        id: "log-008b",
        documentId: docId,
        fromStatus: "SHARED",
        toStatus: "PUBLISHED",
        reason: "Aprovado",
        userId: "user-008",
        createdAt: new Date(),
      });

      await transitionDocumentLifecycle(
        {
          documentId: docId,
          fromStatus: "SHARED",
          toStatus: "PUBLISHED",
          reason: "Aprovado",
          userId: "user-008",
        },
        db
      );

      // Two create calls = two log entries appended (never overwritten)
      expect(db.statusTransitionLog.create).toHaveBeenCalledTimes(2);
      expect(db.document.update).toHaveBeenCalledTimes(2);
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
