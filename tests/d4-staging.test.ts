/**
 * D4-E3-06: Staging Area Quarantine Tests
 *
 * TDD — tests written BEFORE implementing staging quarantine functions.
 *
 * Flows:
 *   Upload → StagingDocument PENDING → trigger validate → VALIDATING
 *   Validation passes → READY
 *   Promote → creates real Document, promotedDocId set, status=PROMOTED
 *   Reject → REJECTED with rejectionNote
 *   Auto-suggest metadata from filename
 *
 * Task: gov-1775310311080-v8f9xr
 */

import { describe, it, expect } from "vitest";

// ============================================================================
// Types (contract for the real implementation)
// ============================================================================

type StagingStatus = "PENDING" | "VALIDATING" | "READY" | "PROMOTED" | "REJECTED";

interface StagingDocument {
  id: string;
  filename: string;
  uploadedAt: Date;
  status: StagingStatus;
  /** Populated after promote */
  promotedDocId: string | null;
  /** Populated after reject */
  rejectionNote: string | null;
  suggestedMeta: SuggestedMeta | null;
}

interface SuggestedMeta {
  discipline: string | null;
  docType: string | null;
  zone: string | null;
}

interface ValidationResult {
  passed: boolean;
  errors: string[];
}

// ============================================================================
// Stub implementations (TDD stubs — replaced by real implementations later)
// ============================================================================

function createStagingDocument(
  id: string,
  filename: string,
  now: Date = new Date()
): StagingDocument {
  return {
    id,
    filename,
    uploadedAt: now,
    status: "PENDING",
    promotedDocId: null,
    rejectionNote: null,
    suggestedMeta: null,
  };
}

function triggerValidate(doc: StagingDocument): StagingDocument {
  if (doc.status !== "PENDING") return doc;
  return { ...doc, status: "VALIDATING" };
}

function applyValidationResult(doc: StagingDocument, result: ValidationResult): StagingDocument {
  if (doc.status !== "VALIDATING") return doc;
  if (result.passed) {
    return { ...doc, status: "READY" };
  }
  return {
    ...doc,
    status: "REJECTED",
    rejectionNote: result.errors.join("; "),
  };
}

function promoteDocument(doc: StagingDocument, newDocId: string): StagingDocument {
  if (doc.status !== "READY") return doc;
  return {
    ...doc,
    status: "PROMOTED",
    promotedDocId: newDocId,
  };
}

function rejectDocument(doc: StagingDocument, note: string): StagingDocument {
  if (doc.status === "PROMOTED") return doc; // cannot reject already promoted
  return {
    ...doc,
    status: "REJECTED",
    rejectionNote: note,
  };
}

/**
 * Parses a filename following the pattern: {docType}-{discipline}-{zone}-{rev}.pdf
 * e.g. "DWG-ARCH-Zone1-Rev01.pdf" → { discipline: "ARCH", docType: "DWG", zone: "Zone1" }
 */
function suggestMetaFromFilename(filename: string): SuggestedMeta {
  // Strip extension
  const base = filename.replace(/\.[^.]+$/, "");
  const parts = base.split("-");

  if (parts.length < 3) {
    return { discipline: null, docType: null, zone: null };
  }

  const [docType, discipline, zone] = parts;

  return {
    docType: docType || null,
    discipline: discipline || null,
    zone: zone || null,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("Staging Quarantine — upload and validation trigger", () => {
  it("1. Upload creates StagingDocument with status PENDING", () => {
    const doc = createStagingDocument("stg-001", "DWG-ARCH-Zone1-Rev01.pdf");

    expect(doc.id).toBe("stg-001");
    expect(doc.filename).toBe("DWG-ARCH-Zone1-Rev01.pdf");
    expect(doc.status).toBe("PENDING");
    expect(doc.promotedDocId).toBeNull();
    expect(doc.rejectionNote).toBeNull();
  });

  it("1b. triggerValidate transitions PENDING → VALIDATING", () => {
    const doc = createStagingDocument("stg-002", "SPEC-STRUCT-Zone2-Rev03.pdf");
    const validating = triggerValidate(doc);

    expect(validating.status).toBe("VALIDATING");
    // Original untouched
    expect(doc.status).toBe("PENDING");
  });

  it("1c. triggerValidate is idempotent if already VALIDATING", () => {
    const doc = createStagingDocument("stg-003", "DWG-MEP-Zone3-Rev01.pdf");
    const v1 = triggerValidate(doc);
    const v2 = triggerValidate(v1); // call again

    expect(v2.status).toBe("VALIDATING");
  });

  it("1d. triggerValidate does nothing if status is not PENDING", () => {
    const doc = createStagingDocument("stg-004", "DWG-ARCH-Zone1-Rev01.pdf");
    const rejected = rejectDocument(doc, "Invalid format");
    const result = triggerValidate(rejected);

    expect(result.status).toBe("REJECTED");
  });
});

describe("Staging Quarantine — validation pass → READY", () => {
  it("2. Validation passes → status becomes READY", () => {
    const doc = createStagingDocument("stg-010", "DWG-ARCH-Zone1-Rev01.pdf");
    const validating = triggerValidate(doc);
    const result = applyValidationResult(validating, { passed: true, errors: [] });

    expect(result.status).toBe("READY");
    expect(result.rejectionNote).toBeNull();
  });

  it("2b. READY document has no rejectionNote and no promotedDocId", () => {
    const doc = createStagingDocument("stg-011", "SPEC-ARCH-Zone1-Rev02.pdf");
    const ready = applyValidationResult(triggerValidate(doc), { passed: true, errors: [] });

    expect(ready.promotedDocId).toBeNull();
    expect(ready.rejectionNote).toBeNull();
  });

  it("2c. applyValidationResult does nothing if status is not VALIDATING", () => {
    const doc = createStagingDocument("stg-012", "DWG-MEP-Zone2-Rev01.pdf");
    // Still PENDING, not VALIDATING
    const result = applyValidationResult(doc, { passed: true, errors: [] });

    expect(result.status).toBe("PENDING");
  });
});

describe("Staging Quarantine — promote flow", () => {
  it("3. Promote READY doc → PROMOTED, promotedDocId set", () => {
    const doc = createStagingDocument("stg-020", "DWG-ARCH-Zone1-Rev01.pdf");
    const ready = applyValidationResult(triggerValidate(doc), { passed: true, errors: [] });
    const promoted = promoteDocument(ready, "doc-real-001");

    expect(promoted.status).toBe("PROMOTED");
    expect(promoted.promotedDocId).toBe("doc-real-001");
  });

  it("3b. Promoted doc retains original filename and id", () => {
    const doc = createStagingDocument("stg-021", "SPEC-STRUCT-Zone3-Rev05.pdf");
    const ready = applyValidationResult(triggerValidate(doc), { passed: true, errors: [] });
    const promoted = promoteDocument(ready, "doc-real-002");

    expect(promoted.id).toBe("stg-021");
    expect(promoted.filename).toBe("SPEC-STRUCT-Zone3-Rev05.pdf");
  });

  it("3c. promoteDocument does nothing if status is not READY", () => {
    const doc = createStagingDocument("stg-022", "DWG-ARCH-Zone1-Rev01.pdf");
    // Still PENDING
    const result = promoteDocument(doc, "doc-real-003");

    expect(result.status).toBe("PENDING");
    expect(result.promotedDocId).toBeNull();
  });

  it("3d. promoteDocument does nothing if already PROMOTED", () => {
    const doc = createStagingDocument("stg-023", "DWG-MEP-Zone1-Rev01.pdf");
    const ready = applyValidationResult(triggerValidate(doc), { passed: true, errors: [] });
    const promoted = promoteDocument(ready, "doc-real-004");
    const promotedAgain = promoteDocument(promoted, "doc-real-999");

    // promotedDocId should not change
    expect(promotedAgain.promotedDocId).toBe("doc-real-004");
  });
});

describe("Staging Quarantine — reject flow", () => {
  it("4. Reject PENDING doc → REJECTED with rejectionNote", () => {
    const doc = createStagingDocument("stg-030", "DWG-ARCH-Zone1-Rev01.pdf");
    const rejected = rejectDocument(doc, "File format not supported");

    expect(rejected.status).toBe("REJECTED");
    expect(rejected.rejectionNote).toBe("File format not supported");
  });

  it("4b. Reject READY doc → REJECTED (manual QA rejection)", () => {
    const doc = createStagingDocument("stg-031", "SPEC-ARCH-Zone1-Rev01.pdf");
    const ready = applyValidationResult(triggerValidate(doc), { passed: true, errors: [] });
    const rejected = rejectDocument(ready, "Does not match revision control");

    expect(rejected.status).toBe("REJECTED");
    expect(rejected.rejectionNote).toBe("Does not match revision control");
    expect(rejected.promotedDocId).toBeNull();
  });

  it("4c. Reject VALIDATING doc (validation failure) → REJECTED with error list", () => {
    const doc = createStagingDocument("stg-032", "DWG-ARCH-Zone1-Rev01.pdf");
    const validating = triggerValidate(doc);
    const rejected = applyValidationResult(validating, {
      passed: false,
      errors: ["Missing metadata", "Invalid file hash"],
    });

    expect(rejected.status).toBe("REJECTED");
    expect(rejected.rejectionNote).toBe("Missing metadata; Invalid file hash");
  });

  it("4d. Cannot reject an already-PROMOTED document", () => {
    const doc = createStagingDocument("stg-033", "DWG-MEP-Zone2-Rev01.pdf");
    const ready = applyValidationResult(triggerValidate(doc), { passed: true, errors: [] });
    const promoted = promoteDocument(ready, "doc-real-005");
    const result = rejectDocument(promoted, "Too late");

    expect(result.status).toBe("PROMOTED");
    expect(result.rejectionNote).toBeNull();
  });
});

describe("Staging Quarantine — auto-suggest metadata from filename", () => {
  it("5. DWG-ARCH-Zone1-Rev01.pdf → discipline: ARCH, docType: DWG, zone: Zone1", () => {
    const meta = suggestMetaFromFilename("DWG-ARCH-Zone1-Rev01.pdf");

    expect(meta.discipline).toBe("ARCH");
    expect(meta.docType).toBe("DWG");
    expect(meta.zone).toBe("Zone1");
  });

  it("5b. SPEC-STRUCT-Zone3-Rev05.pdf → discipline: STRUCT, docType: SPEC, zone: Zone3", () => {
    const meta = suggestMetaFromFilename("SPEC-STRUCT-Zone3-Rev05.pdf");

    expect(meta.discipline).toBe("STRUCT");
    expect(meta.docType).toBe("SPEC");
    expect(meta.zone).toBe("Zone3");
  });

  it("5c. Filename without enough segments → nulls for unresolved fields", () => {
    const meta = suggestMetaFromFilename("unknown.pdf");

    expect(meta.discipline).toBeNull();
    expect(meta.docType).toBeNull();
    expect(meta.zone).toBeNull();
  });

  it("5d. Case preserved — discipline and docType returned as-is from filename", () => {
    const meta = suggestMetaFromFilename("dwg-arch-zone1-rev01.pdf");

    expect(meta.docType).toBe("dwg");
    expect(meta.discipline).toBe("arch");
    expect(meta.zone).toBe("zone1");
  });

  it("5e. Extension stripped correctly — .PDF uppercase extension", () => {
    const meta = suggestMetaFromFilename("DWG-MEP-Zone2-Rev02.PDF");

    expect(meta.docType).toBe("DWG");
    expect(meta.discipline).toBe("MEP");
    expect(meta.zone).toBe("Zone2");
  });
});

describe("Staging Quarantine — full lifecycle", () => {
  it("Full happy path: PENDING → VALIDATING → READY → PROMOTED", () => {
    const doc = createStagingDocument("stg-100", "DWG-ARCH-Zone1-Rev01.pdf");

    expect(doc.status).toBe("PENDING");

    const validating = triggerValidate(doc);
    expect(validating.status).toBe("VALIDATING");

    const ready = applyValidationResult(validating, { passed: true, errors: [] });
    expect(ready.status).toBe("READY");

    const promoted = promoteDocument(ready, "doc-real-100");
    expect(promoted.status).toBe("PROMOTED");
    expect(promoted.promotedDocId).toBe("doc-real-100");
  });

  it("Failure path: PENDING → VALIDATING → REJECTED (validation failure)", () => {
    const doc = createStagingDocument("stg-101", "CORRUPT-FILE.pdf");

    const validating = triggerValidate(doc);
    expect(validating.status).toBe("VALIDATING");

    const rejected = applyValidationResult(validating, {
      passed: false,
      errors: ["Corrupt file detected"],
    });
    expect(rejected.status).toBe("REJECTED");
    expect(rejected.rejectionNote).toBe("Corrupt file detected");
    expect(rejected.promotedDocId).toBeNull();
  });

  it("Manual rejection path: PENDING → VALIDATING → READY → REJECTED (QA review)", () => {
    const doc = createStagingDocument("stg-102", "DWG-ARCH-Zone1-Rev01.pdf");

    const ready = applyValidationResult(triggerValidate(doc), { passed: true, errors: [] });
    expect(ready.status).toBe("READY");

    const rejected = rejectDocument(ready, "Wrong project — upload to Project B");
    expect(rejected.status).toBe("REJECTED");
    expect(rejected.rejectionNote).toBe("Wrong project — upload to Project B");
  });
});
