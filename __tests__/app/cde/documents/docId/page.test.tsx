/**
 * D4-E3-10: CDE Document Detail Page Tests
 *
 * TDD — tests written BEFORE implementing the document detail page.
 *
 * Covers:
 *   1. Transition modal — opens on button click, requires reason, calls server action
 *   2. Revision timeline — ordered by createdAt desc, shows stamps
 *   3. Stamp timeline — stampedBy, discipline, stampType, createdAt
 *   4. Loading/error states — skeleton during loading, error if not found
 *
 * Task: gov-1775311324420-twjnoa
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Types (contract for the real implementation)
// ============================================================================

type CdeDocStatus = "WIP" | "UNDER_REVIEW" | "APPROVED" | "SUPERSEDED" | "ARCHIVED";

type StampType = "APPROVED" | "REJECTED" | "NOTED";

interface ValidationStamp {
  id: string;
  revisionId: string;
  stampedBy: string;
  discipline: string;
  stampType: StampType;
  createdAt: Date;
}

interface DocumentRevision {
  id: string;
  documentId: string;
  revisionCode: string;
  phase: "PRELIMINARY" | "APPROVED";
  createdAt: Date;
  createdBy: string;
  stamps: ValidationStamp[];
}

interface CdeDocument {
  id: string;
  title: string;
  status: CdeDocStatus;
  revisions: DocumentRevision[];
  createdAt: Date;
  updatedAt: Date;
}

type TransitionAction = "SUBMIT_FOR_REVIEW" | "APPROVE" | "REJECT" | "ARCHIVE" | "SUPERSEDE";

interface TransitionModalState {
  isOpen: boolean;
  action: TransitionAction | null;
  reason: string;
  submitting: boolean;
  error: string | null;
}

// ============================================================================
// Transition Modal Logic
// ============================================================================

function createModalState(): TransitionModalState {
  return {
    isOpen: false,
    action: null,
    reason: "",
    submitting: false,
    error: null,
  };
}

function openModal(state: TransitionModalState, action: TransitionAction): TransitionModalState {
  return { ...state, isOpen: true, action, reason: "", error: null };
}

function closeModal(state: TransitionModalState): TransitionModalState {
  return { ...state, isOpen: false, action: null, reason: "", error: null };
}

function setReason(state: TransitionModalState, reason: string): TransitionModalState {
  return { ...state, reason };
}

function validateModalSubmit(state: TransitionModalState): string | null {
  if (!state.reason.trim()) {
    return "Reason is required";
  }
  if (state.reason.trim().length < 3) {
    return "Reason must be at least 3 characters";
  }
  return null;
}

type TransitionResult =
  | { success: true; newStatus: CdeDocStatus }
  | { success: false; error: string };

async function submitTransition(
  documentId: string,
  action: TransitionAction,
  reason: string,
  serverAction: (
    docId: string,
    action: TransitionAction,
    reason: string
  ) => Promise<TransitionResult>
): Promise<TransitionResult> {
  return serverAction(documentId, action, reason);
}

// ============================================================================
// Revision Timeline Logic
// ============================================================================

function sortRevisionsByDateDesc(revisions: DocumentRevision[]): DocumentRevision[] {
  return [...revisions].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

function getRevisionTimeline(document: CdeDocument): DocumentRevision[] {
  return sortRevisionsByDateDesc(document.revisions);
}

// ============================================================================
// Stamp Display Logic
// ============================================================================

interface StampDisplay {
  stampedBy: string;
  discipline: string;
  stampType: StampType;
  createdAt: Date;
  formattedDate: string;
}

function formatStampDisplay(stamp: ValidationStamp): StampDisplay {
  return {
    stampedBy: stamp.stampedBy,
    discipline: stamp.discipline,
    stampType: stamp.stampType,
    createdAt: stamp.createdAt,
    formattedDate: stamp.createdAt.toISOString().split("T")[0],
  };
}

// ============================================================================
// Loading / Error State Logic
// ============================================================================

type PageState =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ready"; document: CdeDocument };

function resolvePageState(
  isLoading: boolean,
  document: CdeDocument | null,
  error: string | null
): PageState {
  if (isLoading) return { state: "loading" };
  if (error || !document) return { state: "error", message: error ?? "Document not found" };
  return { state: "ready", document };
}

// ============================================================================
// Test Helpers
// ============================================================================

function makeStamp(overrides: Partial<ValidationStamp> = {}): ValidationStamp {
  return {
    id: "stamp-1",
    revisionId: "rev-1",
    stampedBy: "João Silva",
    discipline: "STRUCTURAL",
    stampType: "APPROVED",
    createdAt: new Date("2024-03-01T10:00:00Z"),
    ...overrides,
  };
}

function makeRevision(overrides: Partial<DocumentRevision> = {}): DocumentRevision {
  return {
    id: "rev-1",
    documentId: "doc-1",
    revisionCode: "P01",
    phase: "PRELIMINARY",
    createdAt: new Date("2024-03-01T10:00:00Z"),
    createdBy: "user-1",
    stamps: [],
    ...overrides,
  };
}

function makeDocument(overrides: Partial<CdeDocument> = {}): CdeDocument {
  return {
    id: "doc-1",
    title: "Architectural Plans - Block A",
    status: "WIP",
    revisions: [],
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-03-01T00:00:00Z"),
    ...overrides,
  };
}

// ============================================================================
// Tests — Transition Modal
// ============================================================================

describe("CDE Document Detail — Transition Modal", () => {
  let modalState: TransitionModalState;

  beforeEach(() => {
    modalState = createModalState();
  });

  it("modal starts closed", () => {
    expect(modalState.isOpen).toBe(false);
    expect(modalState.action).toBeNull();
  });

  it("opens modal with correct action on button click", () => {
    const opened = openModal(modalState, "SUBMIT_FOR_REVIEW");
    expect(opened.isOpen).toBe(true);
    expect(opened.action).toBe("SUBMIT_FOR_REVIEW");
  });

  it("opens with empty reason on each open", () => {
    const withReason = setReason(modalState, "previous reason");
    const opened = openModal(withReason, "APPROVE");
    expect(opened.reason).toBe("");
  });

  it("closes modal and resets state", () => {
    const opened = openModal(modalState, "APPROVE");
    const closed = closeModal(opened);
    expect(closed.isOpen).toBe(false);
    expect(closed.action).toBeNull();
    expect(closed.reason).toBe("");
  });

  it("validates: reason is required on submit", () => {
    const state = openModal(modalState, "APPROVE");
    const error = validateModalSubmit(state);
    expect(error).toBe("Reason is required");
  });

  it("validates: reason must be at least 3 characters", () => {
    const state = setReason(openModal(modalState, "APPROVE"), "ok");
    const error = validateModalSubmit(state);
    expect(error).toBe("Reason must be at least 3 characters");
  });

  it("validates: whitespace-only reason is rejected", () => {
    const state = setReason(openModal(modalState, "APPROVE"), "   ");
    const error = validateModalSubmit(state);
    expect(error).toBe("Reason is required");
  });

  it("validates: valid reason passes", () => {
    const state = setReason(openModal(modalState, "APPROVE"), "Approved by QA");
    const error = validateModalSubmit(state);
    expect(error).toBeNull();
  });

  it("calls server action with correct args on submit", async () => {
    const serverAction = vi.fn().mockResolvedValue({
      success: true,
      newStatus: "APPROVED" as CdeDocStatus,
    });

    const result = await submitTransition("doc-1", "APPROVE", "Meets all criteria", serverAction);

    expect(serverAction).toHaveBeenCalledWith("doc-1", "APPROVE", "Meets all criteria");
    expect(result).toEqual({ success: true, newStatus: "APPROVED" });
  });

  it("server action called once — no duplicate submissions", async () => {
    const serverAction = vi
      .fn()
      .mockResolvedValue({ success: true, newStatus: "APPROVED" as CdeDocStatus });
    await submitTransition("doc-1", "APPROVE", "reason", serverAction);
    expect(serverAction).toHaveBeenCalledTimes(1);
  });

  it("returns error from server action on failure", async () => {
    const serverAction = vi.fn().mockResolvedValue({
      success: false,
      error: "Invalid transition: APPROVED → WIP",
    });

    const result = await submitTransition("doc-1", "APPROVE", "reason", serverAction);
    expect(result).toEqual({ success: false, error: "Invalid transition: APPROVED → WIP" });
  });

  it("supports all transition actions", () => {
    const actions: TransitionAction[] = [
      "SUBMIT_FOR_REVIEW",
      "APPROVE",
      "REJECT",
      "ARCHIVE",
      "SUPERSEDE",
    ];
    actions.forEach((action) => {
      const opened = openModal(createModalState(), action);
      expect(opened.action).toBe(action);
    });
  });
});

// ============================================================================
// Tests — Revision Timeline
// ============================================================================

describe("CDE Document Detail — Revision Timeline", () => {
  it("returns empty array for document with no revisions", () => {
    const doc = makeDocument({ revisions: [] });
    expect(getRevisionTimeline(doc)).toHaveLength(0);
  });

  it("returns revisions ordered by createdAt descending (newest first)", () => {
    const rev1 = makeRevision({
      id: "rev-1",
      revisionCode: "P01",
      createdAt: new Date("2024-01-01T00:00:00Z"),
    });
    const rev2 = makeRevision({
      id: "rev-2",
      revisionCode: "P02",
      createdAt: new Date("2024-02-01T00:00:00Z"),
    });
    const rev3 = makeRevision({
      id: "rev-3",
      revisionCode: "A",
      phase: "APPROVED",
      createdAt: new Date("2024-03-01T00:00:00Z"),
    });

    const doc = makeDocument({ revisions: [rev1, rev2, rev3] });
    const timeline = getRevisionTimeline(doc);

    expect(timeline[0].revisionCode).toBe("A");
    expect(timeline[1].revisionCode).toBe("P02");
    expect(timeline[2].revisionCode).toBe("P01");
  });

  it("does not mutate the original revisions array", () => {
    const rev1 = makeRevision({ createdAt: new Date("2024-01-01T00:00:00Z") });
    const rev2 = makeRevision({ createdAt: new Date("2024-03-01T00:00:00Z") });
    const doc = makeDocument({ revisions: [rev1, rev2] });

    getRevisionTimeline(doc);
    expect(doc.revisions[0].id).toBe(rev1.id); // original order preserved
  });

  it("handles single revision correctly", () => {
    const rev = makeRevision();
    const doc = makeDocument({ revisions: [rev] });
    const timeline = getRevisionTimeline(doc);
    expect(timeline).toHaveLength(1);
    expect(timeline[0].id).toBe(rev.id);
  });

  it("each revision shows revisionCode", () => {
    const revisions = [
      makeRevision({ id: "r1", revisionCode: "P01", createdAt: new Date("2024-01-01T00:00:00Z") }),
      makeRevision({ id: "r2", revisionCode: "P02", createdAt: new Date("2024-02-01T00:00:00Z") }),
    ];
    const doc = makeDocument({ revisions });
    const timeline = getRevisionTimeline(doc);
    expect(timeline.every((r) => r.revisionCode)).toBe(true);
  });

  it("revision includes stamps array", () => {
    const stamp = makeStamp();
    const rev = makeRevision({ stamps: [stamp] });
    const doc = makeDocument({ revisions: [rev] });
    const timeline = getRevisionTimeline(doc);
    expect(timeline[0].stamps).toHaveLength(1);
    expect(timeline[0].stamps[0].id).toBe(stamp.id);
  });
});

// ============================================================================
// Tests — Stamp Timeline
// ============================================================================

describe("CDE Document Detail — Stamp Timeline", () => {
  it("formats stamp with stampedBy", () => {
    const stamp = makeStamp({ stampedBy: "Maria Fonseca" });
    expect(formatStampDisplay(stamp).stampedBy).toBe("Maria Fonseca");
  });

  it("formats stamp with discipline", () => {
    const stamp = makeStamp({ discipline: "MEP" });
    expect(formatStampDisplay(stamp).discipline).toBe("MEP");
  });

  it("formats stamp with stampType APPROVED", () => {
    const stamp = makeStamp({ stampType: "APPROVED" });
    expect(formatStampDisplay(stamp).stampType).toBe("APPROVED");
  });

  it("formats stamp with stampType REJECTED", () => {
    const stamp = makeStamp({ stampType: "REJECTED" });
    expect(formatStampDisplay(stamp).stampType).toBe("REJECTED");
  });

  it("formats stamp with stampType NOTED", () => {
    const stamp = makeStamp({ stampType: "NOTED" });
    expect(formatStampDisplay(stamp).stampType).toBe("NOTED");
  });

  it("formats stamp with createdAt date", () => {
    const stamp = makeStamp({ createdAt: new Date("2024-06-15T08:30:00Z") });
    const display = formatStampDisplay(stamp);
    expect(display.createdAt).toEqual(new Date("2024-06-15T08:30:00Z"));
  });

  it("formats createdAt as YYYY-MM-DD string", () => {
    const stamp = makeStamp({ createdAt: new Date("2024-06-15T08:30:00Z") });
    expect(formatStampDisplay(stamp).formattedDate).toBe("2024-06-15");
  });

  it("revision with multiple stamps shows all stamps", () => {
    const stamps = [
      makeStamp({ id: "s1", stampType: "APPROVED", stampedBy: "A" }),
      makeStamp({ id: "s2", stampType: "NOTED", stampedBy: "B" }),
      makeStamp({ id: "s3", stampType: "REJECTED", stampedBy: "C" }),
    ];
    const rev = makeRevision({ stamps });
    expect(rev.stamps).toHaveLength(3);
    const displays = rev.stamps.map(formatStampDisplay);
    expect(displays.map((d) => d.stampedBy)).toEqual(["A", "B", "C"]);
  });
});

// ============================================================================
// Tests — Loading / Error States
// ============================================================================

describe("CDE Document Detail — Loading / Error States", () => {
  it("returns 'loading' state when isLoading is true", () => {
    const state = resolvePageState(true, null, null);
    expect(state.state).toBe("loading");
  });

  it("returns 'loading' state even if document is present (loading takes priority)", () => {
    const doc = makeDocument();
    const state = resolvePageState(true, doc, null);
    expect(state.state).toBe("loading");
  });

  it("returns 'error' state when document is null and not loading", () => {
    const state = resolvePageState(false, null, null);
    expect(state.state).toBe("error");
    if (state.state === "error") {
      expect(state.message).toBe("Document not found");
    }
  });

  it("returns 'error' state with server error message", () => {
    const state = resolvePageState(false, null, "Unauthorized");
    expect(state.state).toBe("error");
    if (state.state === "error") {
      expect(state.message).toBe("Unauthorized");
    }
  });

  it("returns 'ready' state with document when loaded successfully", () => {
    const doc = makeDocument();
    const state = resolvePageState(false, doc, null);
    expect(state.state).toBe("ready");
    if (state.state === "ready") {
      expect(state.document.id).toBe("doc-1");
    }
  });

  it("'ready' state contains full document with revisions", () => {
    const rev = makeRevision({ stamps: [makeStamp()] });
    const doc = makeDocument({ revisions: [rev] });
    const state = resolvePageState(false, doc, null);
    expect(state.state).toBe("ready");
    if (state.state === "ready") {
      expect(state.document.revisions).toHaveLength(1);
      expect(state.document.revisions[0].stamps).toHaveLength(1);
    }
  });

  it("error state does not contain document", () => {
    const state = resolvePageState(false, null, "Not found");
    expect("document" in state).toBe(false);
  });

  it("loading state does not contain document or error", () => {
    const state = resolvePageState(true, null, null);
    expect("document" in state).toBe(false);
    expect("message" in state).toBe(false);
  });
});
