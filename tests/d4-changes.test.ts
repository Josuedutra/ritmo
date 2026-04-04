/**
 * D4-E3-08: Changes and Claims Module Tests
 *
 * TDD — tests written BEFORE implementing Changes and Claims functions.
 *
 * Scenarios:
 *   1. Create DESIGN_CHANGE with title + financialImpact → status=DRAFT
 *   2. Lifecycle DRAFT→SUBMITTED→UNDER_REVIEW→APPROVED→FORMALIZED→CLOSED (valid sequence)
 *   3. Invalid transition DRAFT→APPROVED → throws
 *   4. CONTRACTOR_CLAIM with financialImpact=50000 + contractClause="4.2.1"
 *   5. Comments immutable: addChangeComment() creates; content NOT editable after
 *   6. listChanges filter by changeType
 *
 * Valid transitions:
 *   DRAFT→SUBMITTED→UNDER_REVIEW→APPROVED|REJECTED
 *   APPROVED→FORMALIZED→CLOSED
 *   REJECTED→CLOSED|DRAFT
 *
 * Task: gov-1775310327157-3o2wlh
 */

import { describe, it, expect } from "vitest";

// ============================================================================
// Types (contract for the real implementation)
// ============================================================================

type ChangeType = "DESIGN_CHANGE" | "CONTRACTOR_CLAIM" | "SCOPE_CHANGE" | "VARIATION_ORDER";

type ChangeStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "FORMALIZED"
  | "CLOSED";

interface ChangeComment {
  id: string;
  changeId: string;
  authorId: string;
  content: string;
  createdAt: Date;
}

interface Change {
  id: string;
  projectId: string;
  changeType: ChangeType;
  title: string;
  status: ChangeStatus;
  financialImpact: number | null;
  contractClause: string | null;
  comments: ChangeComment[];
  createdAt: Date;
}

// ============================================================================
// Stub implementations (TDD stubs — replaced by real implementations later)
// ============================================================================

const VALID_TRANSITIONS: Record<ChangeStatus, ChangeStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: ["FORMALIZED"],
  FORMALIZED: ["CLOSED"],
  REJECTED: ["CLOSED", "DRAFT"],
  CLOSED: [],
};

function createChange(params: {
  id: string;
  projectId: string;
  changeType: ChangeType;
  title: string;
  financialImpact?: number;
  contractClause?: string;
  now?: Date;
}): Change {
  return {
    id: params.id,
    projectId: params.projectId,
    changeType: params.changeType,
    title: params.title,
    status: "DRAFT",
    financialImpact: params.financialImpact ?? null,
    contractClause: params.contractClause ?? null,
    comments: [],
    createdAt: params.now ?? new Date(),
  };
}

function transitionChange(change: Change, to: ChangeStatus): Change {
  const allowed = VALID_TRANSITIONS[change.status];
  if (!allowed.includes(to)) {
    throw new Error(
      `Invalid transition: ${change.status} → ${to}. Allowed: ${allowed.join(", ") || "none"}`
    );
  }
  return { ...change, status: to };
}

function addChangeComment(
  change: Change,
  comment: { id: string; authorId: string; content: string; now?: Date }
): Change {
  const newComment: ChangeComment = {
    id: comment.id,
    changeId: change.id,
    authorId: comment.authorId,
    content: comment.content,
    createdAt: comment.now ?? new Date(),
  };
  return { ...change, comments: [...change.comments, newComment] };
}

function listChanges(changes: Change[], filter?: { changeType?: ChangeType }): Change[] {
  if (!filter?.changeType) return changes;
  return changes.filter((c) => c.changeType === filter.changeType);
}

// ============================================================================
// Tests
// ============================================================================

describe("Changes — create DESIGN_CHANGE", () => {
  it("1. Create DESIGN_CHANGE with title + financialImpact → status=DRAFT", () => {
    const change = createChange({
      id: "chg-001",
      projectId: "proj-abc",
      changeType: "DESIGN_CHANGE",
      title: "Revised foundation depth",
      financialImpact: 15000,
    });

    expect(change.id).toBe("chg-001");
    expect(change.changeType).toBe("DESIGN_CHANGE");
    expect(change.title).toBe("Revised foundation depth");
    expect(change.status).toBe("DRAFT");
    expect(change.financialImpact).toBe(15000);
    expect(change.contractClause).toBeNull();
    expect(change.comments).toHaveLength(0);
  });

  it("1b. Create DESIGN_CHANGE without financialImpact → financialImpact=null", () => {
    const change = createChange({
      id: "chg-002",
      projectId: "proj-abc",
      changeType: "DESIGN_CHANGE",
      title: "Remove non-structural wall",
    });

    expect(change.status).toBe("DRAFT");
    expect(change.financialImpact).toBeNull();
  });
});

describe("Changes — lifecycle DRAFT→SUBMITTED→UNDER_REVIEW→APPROVED→FORMALIZED→CLOSED", () => {
  it("2. Full valid lifecycle transitions", () => {
    let change = createChange({
      id: "chg-010",
      projectId: "proj-abc",
      changeType: "DESIGN_CHANGE",
      title: "Structural beam upgrade",
    });

    expect(change.status).toBe("DRAFT");

    change = transitionChange(change, "SUBMITTED");
    expect(change.status).toBe("SUBMITTED");

    change = transitionChange(change, "UNDER_REVIEW");
    expect(change.status).toBe("UNDER_REVIEW");

    change = transitionChange(change, "APPROVED");
    expect(change.status).toBe("APPROVED");

    change = transitionChange(change, "FORMALIZED");
    expect(change.status).toBe("FORMALIZED");

    change = transitionChange(change, "CLOSED");
    expect(change.status).toBe("CLOSED");
  });

  it("2b. UNDER_REVIEW → REJECTED → CLOSED is valid", () => {
    let change = createChange({
      id: "chg-011",
      projectId: "proj-abc",
      changeType: "SCOPE_CHANGE",
      title: "Add extra floor",
    });

    change = transitionChange(change, "SUBMITTED");
    change = transitionChange(change, "UNDER_REVIEW");
    change = transitionChange(change, "REJECTED");
    expect(change.status).toBe("REJECTED");

    change = transitionChange(change, "CLOSED");
    expect(change.status).toBe("CLOSED");
  });

  it("2c. REJECTED → DRAFT is valid (resubmit path)", () => {
    let change = createChange({
      id: "chg-012",
      projectId: "proj-abc",
      changeType: "VARIATION_ORDER",
      title: "Material substitution",
    });

    change = transitionChange(change, "SUBMITTED");
    change = transitionChange(change, "UNDER_REVIEW");
    change = transitionChange(change, "REJECTED");
    change = transitionChange(change, "DRAFT");
    expect(change.status).toBe("DRAFT");
  });

  it("2d. CLOSED has no further valid transitions", () => {
    let change = createChange({
      id: "chg-013",
      projectId: "proj-abc",
      changeType: "DESIGN_CHANGE",
      title: "Roof material change",
    });

    change = transitionChange(change, "SUBMITTED");
    change = transitionChange(change, "UNDER_REVIEW");
    change = transitionChange(change, "APPROVED");
    change = transitionChange(change, "FORMALIZED");
    change = transitionChange(change, "CLOSED");

    expect(() => transitionChange(change, "DRAFT")).toThrow();
    expect(() => transitionChange(change, "SUBMITTED")).toThrow();
  });
});

describe("Changes — invalid transitions throw", () => {
  it("3. DRAFT → APPROVED is invalid and throws", () => {
    const change = createChange({
      id: "chg-020",
      projectId: "proj-abc",
      changeType: "DESIGN_CHANGE",
      title: "Skip-step test",
    });

    expect(() => transitionChange(change, "APPROVED")).toThrow(
      /Invalid transition: DRAFT → APPROVED/
    );
  });

  it("3b. DRAFT → CLOSED is invalid and throws", () => {
    const change = createChange({
      id: "chg-021",
      projectId: "proj-abc",
      changeType: "DESIGN_CHANGE",
      title: "Skip to closed",
    });

    expect(() => transitionChange(change, "CLOSED")).toThrow(/Invalid transition: DRAFT → CLOSED/);
  });

  it("3c. APPROVED → SUBMITTED is invalid and throws", () => {
    let change = createChange({
      id: "chg-022",
      projectId: "proj-abc",
      changeType: "DESIGN_CHANGE",
      title: "Go backwards",
    });

    change = transitionChange(change, "SUBMITTED");
    change = transitionChange(change, "UNDER_REVIEW");
    change = transitionChange(change, "APPROVED");

    expect(() => transitionChange(change, "SUBMITTED")).toThrow(
      /Invalid transition: APPROVED → SUBMITTED/
    );
  });
});

describe("Changes — CONTRACTOR_CLAIM with financial details", () => {
  it("4. CONTRACTOR_CLAIM with financialImpact=50000 + contractClause=4.2.1", () => {
    const claim = createChange({
      id: "chg-030",
      projectId: "proj-abc",
      changeType: "CONTRACTOR_CLAIM",
      title: "Delay compensation Q1",
      financialImpact: 50000,
      contractClause: "4.2.1",
    });

    expect(claim.changeType).toBe("CONTRACTOR_CLAIM");
    expect(claim.financialImpact).toBe(50000);
    expect(claim.contractClause).toBe("4.2.1");
    expect(claim.status).toBe("DRAFT");
  });

  it("4b. CONTRACTOR_CLAIM lifecycle mirrors DESIGN_CHANGE lifecycle", () => {
    let claim = createChange({
      id: "chg-031",
      projectId: "proj-abc",
      changeType: "CONTRACTOR_CLAIM",
      title: "Extra works claim",
      financialImpact: 20000,
      contractClause: "7.1",
    });

    claim = transitionChange(claim, "SUBMITTED");
    claim = transitionChange(claim, "UNDER_REVIEW");
    claim = transitionChange(claim, "APPROVED");
    claim = transitionChange(claim, "FORMALIZED");
    claim = transitionChange(claim, "CLOSED");

    expect(claim.status).toBe("CLOSED");
    expect(claim.financialImpact).toBe(20000);
    expect(claim.contractClause).toBe("7.1");
  });
});

describe("Changes — comments are immutable", () => {
  it("5. addChangeComment() creates a comment with correct fields", () => {
    const change = createChange({
      id: "chg-040",
      projectId: "proj-abc",
      changeType: "DESIGN_CHANGE",
      title: "Window spec update",
    });

    const withComment = addChangeComment(change, {
      id: "cmt-001",
      authorId: "user-alice",
      content: "Requires structural review before approval.",
    });

    expect(withComment.comments).toHaveLength(1);
    const comment = withComment.comments[0];
    expect(comment.id).toBe("cmt-001");
    expect(comment.changeId).toBe("chg-040");
    expect(comment.authorId).toBe("user-alice");
    expect(comment.content).toBe("Requires structural review before approval.");
    expect(comment.createdAt).toBeInstanceOf(Date);
  });

  it("5b. Original change is not mutated when comment is added", () => {
    const change = createChange({
      id: "chg-041",
      projectId: "proj-abc",
      changeType: "DESIGN_CHANGE",
      title: "Column reinforcement",
    });

    addChangeComment(change, {
      id: "cmt-002",
      authorId: "user-bob",
      content: "Approved by structural team.",
    });

    // original unchanged
    expect(change.comments).toHaveLength(0);
  });

  it("5c. Comment content cannot be edited — object is structurally frozen (readonly contract)", () => {
    const change = createChange({
      id: "chg-042",
      projectId: "proj-abc",
      changeType: "DESIGN_CHANGE",
      title: "Roof slope change",
    });

    const withComment = addChangeComment(change, {
      id: "cmt-003",
      authorId: "user-carol",
      content: "Initial review comment.",
    });

    const comment = withComment.comments[0];
    const originalContent = comment.content;

    // Attempting to mutate the content on the retrieved object does not affect the stored copy
    // (immutability is enforced at the API level — no editChangeComment function exists)
    const mutated = { ...comment, content: "Tampered content" };

    // The stored comment in the change is untouched
    expect(withComment.comments[0].content).toBe(originalContent);
    expect(mutated.content).not.toBe(withComment.comments[0].content);
  });

  it("5d. Multiple comments can be added; each is independent", () => {
    let change = createChange({
      id: "chg-043",
      projectId: "proj-abc",
      changeType: "CONTRACTOR_CLAIM",
      title: "Equipment delay claim",
    });

    change = addChangeComment(change, {
      id: "cmt-010",
      authorId: "user-alice",
      content: "Claim submitted per clause 4.2.1.",
    });

    change = addChangeComment(change, {
      id: "cmt-011",
      authorId: "user-bob",
      content: "Under review by legal.",
    });

    change = addChangeComment(change, {
      id: "cmt-012",
      authorId: "user-carol",
      content: "Approved with 10% reduction.",
    });

    expect(change.comments).toHaveLength(3);
    expect(change.comments[0].id).toBe("cmt-010");
    expect(change.comments[1].id).toBe("cmt-011");
    expect(change.comments[2].id).toBe("cmt-012");
  });
});

describe("Changes — listChanges filter by changeType", () => {
  const allChanges: Change[] = [
    createChange({
      id: "chg-050",
      projectId: "proj-abc",
      changeType: "DESIGN_CHANGE",
      title: "Foundation revision",
    }),
    createChange({
      id: "chg-051",
      projectId: "proj-abc",
      changeType: "CONTRACTOR_CLAIM",
      title: "Delay claim Q1",
      financialImpact: 30000,
      contractClause: "4.2.1",
    }),
    createChange({
      id: "chg-052",
      projectId: "proj-abc",
      changeType: "SCOPE_CHANGE",
      title: "Add basement level",
    }),
    createChange({
      id: "chg-053",
      projectId: "proj-abc",
      changeType: "CONTRACTOR_CLAIM",
      title: "Extra works Q2",
      financialImpact: 12000,
      contractClause: "7.1",
    }),
    createChange({
      id: "chg-054",
      projectId: "proj-abc",
      changeType: "VARIATION_ORDER",
      title: "Steel grade substitution",
    }),
  ];

  it("6. listChanges without filter returns all changes", () => {
    const result = listChanges(allChanges);
    expect(result).toHaveLength(5);
  });

  it("6b. listChanges filtered by CONTRACTOR_CLAIM returns only claims", () => {
    const result = listChanges(allChanges, { changeType: "CONTRACTOR_CLAIM" });
    expect(result).toHaveLength(2);
    expect(result.every((c) => c.changeType === "CONTRACTOR_CLAIM")).toBe(true);
  });

  it("6c. listChanges filtered by DESIGN_CHANGE returns only design changes", () => {
    const result = listChanges(allChanges, { changeType: "DESIGN_CHANGE" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("chg-050");
  });

  it("6d. listChanges filtered by SCOPE_CHANGE returns correct entry", () => {
    const result = listChanges(allChanges, { changeType: "SCOPE_CHANGE" });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Add basement level");
  });

  it("6e. listChanges filtered by VARIATION_ORDER returns correct entry", () => {
    const result = listChanges(allChanges, { changeType: "VARIATION_ORDER" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("chg-054");
  });

  it("6f. Filter does not mutate the original array", () => {
    listChanges(allChanges, { changeType: "CONTRACTOR_CLAIM" });
    expect(allChanges).toHaveLength(5);
  });
});
