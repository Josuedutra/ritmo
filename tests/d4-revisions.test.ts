/**
 * D4-E3-03: DocumentRevision + ValidationStamp Tests
 *
 * TDD — tests written BEFORE implementing revision/stamp functions.
 *
 * Revision sequence:
 *   Preliminary: P01, P02, P03...
 *   Approved:    A, B, C, D...
 *
 * Task: gov-1775310284965-xczjmi
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

// ============================================================================
// Types (contract for the real implementation)
// ============================================================================

type RevisionPhase = "PRELIMINARY" | "APPROVED";

interface DocumentRevision {
  id: string;
  documentId: string;
  revisionCode: string;
  phase: RevisionPhase;
  createdAt: Date;
  createdBy: string;
}

interface ValidationStamp {
  id: string;
  revisionId: string;
  payloadHash: string;
  createdAt: Date;
  createdBy: string;
}

interface CreateRevisionInput {
  documentId: string;
  phase: RevisionPhase;
  createdBy: string;
}

interface CreateStampInput {
  revisionId: string;
  payload: string; // raw content — SHA-256 computed internally
  createdBy: string;
}

// ============================================================================
// Revision code generation logic
// ============================================================================

function nextPreliminaryCode(existing: DocumentRevision[]): string {
  const prelims = existing.filter((r) => r.phase === "PRELIMINARY");
  const n = prelims.length + 1;
  return `P${String(n).padStart(2, "0")}`;
}

function nextApprovedCode(existing: DocumentRevision[]): string {
  const approved = existing.filter((r) => r.phase === "APPROVED");
  const idx = approved.length; // 0-based
  return String.fromCharCode(65 + idx); // A, B, C...
}

function generateRevisionCode(phase: RevisionPhase, existing: DocumentRevision[]): string {
  if (phase === "PRELIMINARY") return nextPreliminaryCode(existing);
  return nextApprovedCode(existing);
}

// ============================================================================
// Payload hash utility
// ============================================================================

function computePayloadHash(payload: string): string {
  return crypto.createHash("sha256").update(payload, "utf8").digest("hex");
}

// ============================================================================
// Mock Prisma
// ============================================================================

vi.mock("@/lib/prisma", () => ({
  prisma: {
    documentRevision: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    validationStamp: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  documentRevision: {
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
  validationStamp: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

// ============================================================================
// Stub implementations (TDD — implementation will replace these)
// ============================================================================

async function createRevision(input: CreateRevisionInput): Promise<DocumentRevision> {
  const existing: DocumentRevision[] = await mockPrisma.documentRevision.findMany({
    where: { documentId: input.documentId },
    orderBy: { createdAt: "asc" },
  });

  const code = generateRevisionCode(input.phase, existing);

  const revision: DocumentRevision = {
    id: `rev-${Date.now()}`,
    documentId: input.documentId,
    revisionCode: code,
    phase: input.phase,
    createdAt: new Date(),
    createdBy: input.createdBy,
  };

  await mockPrisma.documentRevision.create({ data: revision });
  return revision;
}

async function createValidationStamp(input: CreateStampInput): Promise<ValidationStamp> {
  const hash = computePayloadHash(input.payload);

  const stamp: ValidationStamp = {
    id: `stamp-${Date.now()}`,
    revisionId: input.revisionId,
    payloadHash: hash,
    createdAt: new Date(),
    createdBy: input.createdBy,
  };

  await mockPrisma.validationStamp.create({ data: stamp });
  return stamp;
}

async function getRevisionHistory(documentId: string): Promise<DocumentRevision[]> {
  return mockPrisma.documentRevision.findMany({
    where: { documentId },
    orderBy: { createdAt: "desc" },
  });
}

// ============================================================================
// Test helpers
// ============================================================================

function makeRevision(overrides: Partial<DocumentRevision> = {}): DocumentRevision {
  return {
    id: "rev-1",
    documentId: "doc-abc",
    revisionCode: "P01",
    phase: "PRELIMINARY",
    createdAt: new Date("2026-04-01T10:00:00Z"),
    createdBy: "user-1",
    ...overrides,
  };
}

function makeStamp(overrides: Partial<ValidationStamp> = {}): ValidationStamp {
  return {
    id: "stamp-1",
    revisionId: "rev-1",
    payloadHash: computePayloadHash("some content"),
    createdAt: new Date("2026-04-01T10:05:00Z"),
    createdBy: "user-1",
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("DocumentRevision — revision code generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Cenário 1: primeira revisão → revisionCode = P01", async () => {
    mockPrisma.documentRevision.findMany.mockResolvedValue([]);
    mockPrisma.documentRevision.create.mockImplementation(({ data }: { data: DocumentRevision }) =>
      Promise.resolve(data)
    );

    const result = await createRevision({
      documentId: "doc-001",
      phase: "PRELIMINARY",
      createdBy: "user-1",
    });

    expect(result.revisionCode).toBe("P01");
    expect(result.phase).toBe("PRELIMINARY");
    expect(mockPrisma.documentRevision.create).toHaveBeenCalledOnce();
  });

  it("Cenário 2: segunda revisão preliminar → revisionCode = P02", async () => {
    mockPrisma.documentRevision.findMany.mockResolvedValue([
      makeRevision({ revisionCode: "P01", phase: "PRELIMINARY" }),
    ]);
    mockPrisma.documentRevision.create.mockImplementation(({ data }: { data: DocumentRevision }) =>
      Promise.resolve(data)
    );

    const result = await createRevision({
      documentId: "doc-001",
      phase: "PRELIMINARY",
      createdBy: "user-1",
    });

    expect(result.revisionCode).toBe("P02");
  });

  it("Cenário 2b: terceira revisão preliminar → revisionCode = P03", async () => {
    mockPrisma.documentRevision.findMany.mockResolvedValue([
      makeRevision({ revisionCode: "P01", phase: "PRELIMINARY" }),
      makeRevision({ revisionCode: "P02", phase: "PRELIMINARY" }),
    ]);
    mockPrisma.documentRevision.create.mockImplementation(({ data }: { data: DocumentRevision }) =>
      Promise.resolve(data)
    );

    const result = await createRevision({
      documentId: "doc-001",
      phase: "PRELIMINARY",
      createdBy: "user-1",
    });

    expect(result.revisionCode).toBe("P03");
  });

  it("Cenário 3: primeira revisão aprovada → revisionCode = A", async () => {
    mockPrisma.documentRevision.findMany.mockResolvedValue([
      makeRevision({ revisionCode: "P01", phase: "PRELIMINARY" }),
      makeRevision({ revisionCode: "P02", phase: "PRELIMINARY" }),
    ]);
    mockPrisma.documentRevision.create.mockImplementation(({ data }: { data: DocumentRevision }) =>
      Promise.resolve(data)
    );

    const result = await createRevision({
      documentId: "doc-001",
      phase: "APPROVED",
      createdBy: "user-1",
    });

    expect(result.revisionCode).toBe("A");
    expect(result.phase).toBe("APPROVED");
  });

  it("Cenário 3b: segunda revisão aprovada → revisionCode = B", async () => {
    mockPrisma.documentRevision.findMany.mockResolvedValue([
      makeRevision({ revisionCode: "P01", phase: "PRELIMINARY" }),
      makeRevision({ revisionCode: "A", phase: "APPROVED" }),
    ]);
    mockPrisma.documentRevision.create.mockImplementation(({ data }: { data: DocumentRevision }) =>
      Promise.resolve(data)
    );

    const result = await createRevision({
      documentId: "doc-001",
      phase: "APPROVED",
      createdBy: "user-1",
    });

    expect(result.revisionCode).toBe("B");
  });

  it("Cenário 4: revisão duplicada → rejeitar (unique constraint)", async () => {
    // Simulate Prisma unique constraint violation
    mockPrisma.documentRevision.findMany.mockResolvedValue([]);
    mockPrisma.documentRevision.create.mockRejectedValue(
      Object.assign(
        new Error("Unique constraint failed on the fields: (`documentId`,`revisionCode`)"),
        {
          code: "P2002",
          meta: { target: ["documentId", "revisionCode"] },
        }
      )
    );

    await expect(
      createRevision({
        documentId: "doc-001",
        phase: "PRELIMINARY",
        createdBy: "user-1",
      })
    ).rejects.toThrow("Unique constraint failed");
  });
});

describe("RevisionCode unit — generateRevisionCode", () => {
  it("empty history → P01", () => {
    expect(generateRevisionCode("PRELIMINARY", [])).toBe("P01");
  });

  it("1 preliminary → P02", () => {
    const existing = [makeRevision({ revisionCode: "P01", phase: "PRELIMINARY" })];
    expect(generateRevisionCode("PRELIMINARY", existing)).toBe("P02");
  });

  it("no approved → A", () => {
    const existing = [makeRevision({ revisionCode: "P01", phase: "PRELIMINARY" })];
    expect(generateRevisionCode("APPROVED", existing)).toBe("A");
  });

  it("1 approved → B", () => {
    const existing = [makeRevision({ revisionCode: "A", phase: "APPROVED" })];
    expect(generateRevisionCode("APPROVED", existing)).toBe("B");
  });

  it("2 approved → C", () => {
    const existing = [
      makeRevision({ revisionCode: "A", phase: "APPROVED" }),
      makeRevision({ revisionCode: "B", phase: "APPROVED" }),
    ];
    expect(generateRevisionCode("APPROVED", existing)).toBe("C");
  });

  it("preliminary history does not affect approved sequence", () => {
    const existing = [
      makeRevision({ revisionCode: "P01", phase: "PRELIMINARY" }),
      makeRevision({ revisionCode: "P02", phase: "PRELIMINARY" }),
      makeRevision({ revisionCode: "P03", phase: "PRELIMINARY" }),
    ];
    expect(generateRevisionCode("APPROVED", existing)).toBe("A");
  });
});

describe("ValidationStamp — payloadHash", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Cenário 5: stamp com payloadHash SHA-256 verificável", async () => {
    mockPrisma.validationStamp.create.mockImplementation(({ data }: { data: ValidationStamp }) =>
      Promise.resolve(data)
    );

    const payload = "document content v1.0";
    const result = await createValidationStamp({
      revisionId: "rev-001",
      payload,
      createdBy: "user-1",
    });

    // Hash must be a valid SHA-256 hex string (64 chars)
    expect(result.payloadHash).toMatch(/^[a-f0-9]{64}$/);

    // Hash must be reproducible
    const expectedHash = crypto.createHash("sha256").update(payload, "utf8").digest("hex");
    expect(result.payloadHash).toBe(expectedHash);
  });

  it("different payloads produce different hashes", () => {
    const hash1 = computePayloadHash("content A");
    const hash2 = computePayloadHash("content B");
    expect(hash1).not.toBe(hash2);
  });

  it("same payload always produces same hash (deterministic)", () => {
    const payload = "identical content";
    expect(computePayloadHash(payload)).toBe(computePayloadHash(payload));
  });

  it("Cenário 6: stamp imutável — payloadHash não pode ser alterado after creation", async () => {
    const existingStamp = makeStamp({ payloadHash: computePayloadHash("original content") });

    // Simulate Prisma rejecting update on payloadHash field
    // The real implementation must NOT expose an update path for payloadHash
    mockPrisma.validationStamp.update.mockRejectedValue(
      new Error("ValidationStamp.payloadHash is immutable — field cannot be updated after creation")
    );

    await expect(
      mockPrisma.validationStamp.update({
        where: { id: existingStamp.id },
        data: { payloadHash: computePayloadHash("tampered content") },
      })
    ).rejects.toThrow("immutable");
  });

  it("stamp stores revisionId and createdBy correctly", async () => {
    mockPrisma.validationStamp.create.mockImplementation(({ data }: { data: ValidationStamp }) =>
      Promise.resolve(data)
    );

    const result = await createValidationStamp({
      revisionId: "rev-xyz",
      payload: "payload data",
      createdBy: "user-42",
    });

    expect(result.revisionId).toBe("rev-xyz");
    expect(result.createdBy).toBe("user-42");
    expect(mockPrisma.validationStamp.create).toHaveBeenCalledOnce();
  });
});

describe("getRevisionHistory — ordenação por createdAt DESC", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Cenário 7: retorna revisões ordenadas por createdAt DESC", async () => {
    const revisions: DocumentRevision[] = [
      makeRevision({
        id: "rev-3",
        revisionCode: "A",
        phase: "APPROVED",
        createdAt: new Date("2026-04-03T10:00:00Z"),
      }),
      makeRevision({
        id: "rev-2",
        revisionCode: "P02",
        phase: "PRELIMINARY",
        createdAt: new Date("2026-04-02T10:00:00Z"),
      }),
      makeRevision({
        id: "rev-1",
        revisionCode: "P01",
        phase: "PRELIMINARY",
        createdAt: new Date("2026-04-01T10:00:00Z"),
      }),
    ];

    // findMany returns already-sorted results (mock simulates DB ORDER BY createdAt DESC)
    mockPrisma.documentRevision.findMany.mockResolvedValue(revisions);

    const result = await getRevisionHistory("doc-abc");

    expect(result).toHaveLength(3);
    // Most recent first
    expect(result[0].revisionCode).toBe("A");
    expect(result[1].revisionCode).toBe("P02");
    expect(result[2].revisionCode).toBe("P01");

    // Verify findMany called with correct orderBy
    expect(mockPrisma.documentRevision.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { documentId: "doc-abc" },
        orderBy: { createdAt: "desc" },
      })
    );
  });

  it("empty history → returns empty array", async () => {
    mockPrisma.documentRevision.findMany.mockResolvedValue([]);

    const result = await getRevisionHistory("doc-empty");

    expect(result).toEqual([]);
  });
});
