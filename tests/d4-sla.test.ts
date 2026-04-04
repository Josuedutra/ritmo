/**
 * D4-E3-05: SLA Engine Tests
 *
 * TDD — tests written BEFORE implementing SLA functions.
 *
 * Thresholds:
 *   < 70%  → ON_TRACK
 *   >= 70% → WARNING
 *   >= 90% → CRITICAL
 *   >= 100% → BREACHED
 *
 * 3-Level Escalation:
 *   Level 0→1: first BREACHED
 *   Level 1→2: 24h in BREACHED
 *   Level 2→3: 48h in BREACHED
 *
 * Task: gov-1775310306039-c58183
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Types (contract for the real implementation)
// ============================================================================

type SlaStatus = "ON_TRACK" | "WARNING" | "CRITICAL" | "BREACHED";

interface SlaConfig {
  /** Total duration in milliseconds */
  durationMs: number;
  /** Warning threshold (0–1), default 0.70 */
  warningThreshold?: number;
  /** Critical threshold (0–1), default 0.90 */
  criticalThreshold?: number;
}

interface SlaState {
  startedAt: Date;
  dueAt: Date;
  pausedAt: Date | null;
  /** Accumulated pause time in ms */
  pausedTotal: number;
  status: SlaStatus;
  escalationLevel: 0 | 1 | 2 | 3;
  /** Timestamp when first entered BREACHED */
  breachedAt: Date | null;
}

interface SlaSnapshot {
  elapsedMs: number;
  remainingMs: number;
  elapsedPct: number;
  status: SlaStatus;
  escalationLevel: 0 | 1 | 2 | 3;
  isPaused: boolean;
  pausedTotal: number;
}

// ============================================================================
// Stub implementations (TDD stubs — replaced by real implementations later)
// ============================================================================

function createSla(config: SlaConfig, now: Date = new Date()): SlaState {
  const duration = config.durationMs;
  return {
    startedAt: now,
    dueAt: new Date(now.getTime() + duration),
    pausedAt: null,
    pausedTotal: 0,
    status: "ON_TRACK",
    escalationLevel: 0,
    breachedAt: null,
  };
}

function computeSlaStatus(state: SlaState, config: SlaConfig, now: Date = new Date()): SlaSnapshot {
  const warnThreshold = config.warningThreshold ?? 0.7;
  const critThreshold = config.criticalThreshold ?? 0.9;
  const duration = config.durationMs;

  const effectiveElapsed =
    now.getTime() -
    state.startedAt.getTime() -
    state.pausedTotal -
    (state.pausedAt ? now.getTime() - state.pausedAt.getTime() : 0);

  const elapsedPct = effectiveElapsed / duration;
  const remainingMs = Math.max(0, duration - effectiveElapsed);

  let status: SlaStatus;
  if (elapsedPct >= 1) {
    status = "BREACHED";
  } else if (elapsedPct >= critThreshold) {
    status = "CRITICAL";
  } else if (elapsedPct >= warnThreshold) {
    status = "WARNING";
  } else {
    status = "ON_TRACK";
  }

  let escalationLevel = state.escalationLevel;
  if (status === "BREACHED") {
    if (escalationLevel === 0) {
      escalationLevel = 1;
    } else if (escalationLevel === 1 && state.breachedAt) {
      const hoursBreached = (now.getTime() - state.breachedAt.getTime()) / (1000 * 60 * 60);
      if (hoursBreached >= 48) {
        escalationLevel = 3;
      } else if (hoursBreached >= 24) {
        escalationLevel = 2;
      }
    } else if (escalationLevel === 2 && state.breachedAt) {
      const hoursBreached = (now.getTime() - state.breachedAt.getTime()) / (1000 * 60 * 60);
      if (hoursBreached >= 48) {
        escalationLevel = 3;
      }
    }
  }

  return {
    elapsedMs: effectiveElapsed,
    remainingMs,
    elapsedPct,
    status,
    escalationLevel: escalationLevel as 0 | 1 | 2 | 3,
    isPaused: state.pausedAt !== null,
    pausedTotal: state.pausedTotal,
  };
}

function pauseSla(state: SlaState, now: Date = new Date()): SlaState {
  if (state.pausedAt !== null) return state; // already paused
  return { ...state, pausedAt: now };
}

function resumeSla(state: SlaState, now: Date = new Date()): SlaState {
  if (state.pausedAt === null) return state; // not paused
  const additionalPause = now.getTime() - state.pausedAt.getTime();
  return {
    ...state,
    pausedAt: null,
    pausedTotal: state.pausedTotal + additionalPause,
  };
}

// ============================================================================
// Helper
// ============================================================================

/** Returns a Date offset by `ms` from `base` */
function offset(base: Date, ms: number): Date {
  return new Date(base.getTime() + ms);
}

const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * ONE_HOUR;

// ============================================================================
// Tests
// ============================================================================

describe("SLA Engine — status thresholds", () => {
  const config: SlaConfig = { durationMs: ONE_DAY }; // 24h SLA
  const start = new Date("2026-01-01T00:00:00.000Z");

  it("1. ON_TRACK: elapsed < 70% → status ON_TRACK", () => {
    const state = createSla(config, start);
    // 50% elapsed = 12h
    const now = offset(start, ONE_DAY * 0.5);
    const snap = computeSlaStatus(state, config, now);

    expect(snap.status).toBe("ON_TRACK");
    expect(snap.elapsedPct).toBeCloseTo(0.5, 5);
    expect(snap.escalationLevel).toBe(0);
  });

  it("1b. ON_TRACK: elapsed at exactly 69.9% → still ON_TRACK", () => {
    const state = createSla(config, start);
    const now = offset(start, ONE_DAY * 0.699);
    const snap = computeSlaStatus(state, config, now);

    expect(snap.status).toBe("ON_TRACK");
    expect(snap.elapsedPct).toBeLessThan(0.7);
  });

  it("2. WARNING: elapsed >= 70% and < 90% → WARNING", () => {
    const state = createSla(config, start);
    // 80% elapsed
    const now = offset(start, ONE_DAY * 0.8);
    const snap = computeSlaStatus(state, config, now);

    expect(snap.status).toBe("WARNING");
    expect(snap.elapsedPct).toBeCloseTo(0.8, 5);
    expect(snap.escalationLevel).toBe(0);
  });

  it("2b. WARNING: elapsed at exactly 70% → WARNING", () => {
    const state = createSla(config, start);
    const now = offset(start, ONE_DAY * 0.7);
    const snap = computeSlaStatus(state, config, now);

    expect(snap.status).toBe("WARNING");
    expect(snap.elapsedPct).toBeCloseTo(0.7, 5);
  });

  it("3. CRITICAL: elapsed >= 90% and < 100% → CRITICAL", () => {
    const state = createSla(config, start);
    // 95% elapsed
    const now = offset(start, ONE_DAY * 0.95);
    const snap = computeSlaStatus(state, config, now);

    expect(snap.status).toBe("CRITICAL");
    expect(snap.elapsedPct).toBeCloseTo(0.95, 5);
    expect(snap.escalationLevel).toBe(0);
  });

  it("3b. CRITICAL: elapsed at exactly 90% → CRITICAL", () => {
    const state = createSla(config, start);
    const now = offset(start, ONE_DAY * 0.9);
    const snap = computeSlaStatus(state, config, now);

    expect(snap.status).toBe("CRITICAL");
    expect(snap.elapsedPct).toBeCloseTo(0.9, 5);
  });

  it("4. BREACHED: elapsed >= 100% → BREACHED, escalationLevel increments to 1", () => {
    const state = createSla(config, start);
    // 110% elapsed — past due
    const now = offset(start, ONE_DAY * 1.1);
    const snap = computeSlaStatus(state, config, now);

    expect(snap.status).toBe("BREACHED");
    expect(snap.elapsedPct).toBeGreaterThanOrEqual(1);
    expect(snap.escalationLevel).toBe(1);
    expect(snap.remainingMs).toBe(0);
  });

  it("4b. BREACHED: elapsed at exactly 100% → BREACHED", () => {
    const state = createSla(config, start);
    const now = offset(start, ONE_DAY);
    const snap = computeSlaStatus(state, config, now);

    expect(snap.status).toBe("BREACHED");
    expect(snap.elapsedPct).toBeGreaterThanOrEqual(1);
  });
});

describe("SLA Engine — 3-level escalation", () => {
  const config: SlaConfig = { durationMs: ONE_HOUR }; // 1h SLA for speed
  const start = new Date("2026-01-01T00:00:00.000Z");

  it("Level 0→1: first time reaching BREACHED sets escalationLevel to 1", () => {
    const state = createSla(config, start);
    const now = offset(start, ONE_HOUR * 1.01); // just past due
    const snap = computeSlaStatus(state, config, now);

    expect(snap.status).toBe("BREACHED");
    expect(snap.escalationLevel).toBe(1);
  });

  it("Level 1→2: 24h in BREACHED → escalationLevel 2", () => {
    // State already at level 1, breached 25h ago
    const breachedAt = new Date("2026-01-01T00:00:00.000Z");
    const state: SlaState = {
      startedAt: offset(breachedAt, -ONE_HOUR), // started 1h before breach
      dueAt: breachedAt,
      pausedAt: null,
      pausedTotal: 0,
      status: "BREACHED",
      escalationLevel: 1,
      breachedAt,
    };
    const now = offset(breachedAt, 25 * ONE_HOUR); // 25h after breach
    const snap = computeSlaStatus(state, config, now);

    expect(snap.status).toBe("BREACHED");
    expect(snap.escalationLevel).toBe(2);
  });

  it("Level 2→3: 48h in BREACHED → escalationLevel 3", () => {
    const breachedAt = new Date("2026-01-01T00:00:00.000Z");
    const state: SlaState = {
      startedAt: offset(breachedAt, -ONE_HOUR),
      dueAt: breachedAt,
      pausedAt: null,
      pausedTotal: 0,
      status: "BREACHED",
      escalationLevel: 2,
      breachedAt,
    };
    const now = offset(breachedAt, 49 * ONE_HOUR); // 49h after breach
    const snap = computeSlaStatus(state, config, now);

    expect(snap.status).toBe("BREACHED");
    expect(snap.escalationLevel).toBe(3);
  });

  it("escalation does NOT increment when status is CRITICAL (not yet BREACHED)", () => {
    const state = createSla(config, start);
    const now = offset(start, ONE_HOUR * 0.95); // 95% — CRITICAL
    const snap = computeSlaStatus(state, config, now);

    expect(snap.status).toBe("CRITICAL");
    expect(snap.escalationLevel).toBe(0);
  });

  it("escalation stays at 1 if <24h has passed since BREACHED", () => {
    const breachedAt = new Date("2026-01-01T00:00:00.000Z");
    const state: SlaState = {
      startedAt: offset(breachedAt, -ONE_HOUR),
      dueAt: breachedAt,
      pausedAt: null,
      pausedTotal: 0,
      status: "BREACHED",
      escalationLevel: 1,
      breachedAt,
    };
    const now = offset(breachedAt, 10 * ONE_HOUR); // only 10h
    const snap = computeSlaStatus(state, config, now);

    expect(snap.escalationLevel).toBe(1);
  });
});

describe("SLA Engine — pause/resume", () => {
  const config: SlaConfig = { durationMs: ONE_DAY };
  const start = new Date("2026-01-01T00:00:00.000Z");

  it("5. Pause: pauseSla() freezes elapsed time counting", () => {
    const state = createSla(config, start);
    // Advance 6h, then pause
    const pauseTime = offset(start, 6 * ONE_HOUR);
    const paused = pauseSla(state, pauseTime);

    expect(paused.pausedAt).toEqual(pauseTime);
    expect(paused.pausedTotal).toBe(0);

    // Advance another 6h — but those should NOT count
    const later = offset(pauseTime, 6 * ONE_HOUR);
    const snap = computeSlaStatus(paused, config, later);

    // Only 6h of the 24h SLA should have elapsed (25%)
    expect(snap.elapsedPct).toBeCloseTo(0.25, 2);
    expect(snap.status).toBe("ON_TRACK");
    expect(snap.isPaused).toBe(true);
  });

  it("5b. Resume: resumeSla() unpauses and accumulates pausedTotal", () => {
    const state = createSla(config, start);
    // Pause at 6h
    const paused = pauseSla(state, offset(start, 6 * ONE_HOUR));
    // Resume at 12h → 6h of pause accumulated
    const resumeTime = offset(start, 12 * ONE_HOUR);
    const resumed = resumeSla(paused, resumeTime);

    expect(resumed.pausedAt).toBeNull();
    expect(resumed.pausedTotal).toBe(6 * ONE_HOUR);
    expect(resumed.isPaused).toBeUndefined(); // isPaused is on snapshot, not state
  });

  it("5c. Resume: pausedTotal accumulates correctly and elapsed continues from pre-pause point", () => {
    const state = createSla(config, start);
    // Pause at 6h, resume at 12h (6h paused)
    let s = pauseSla(state, offset(start, 6 * ONE_HOUR));
    s = resumeSla(s, offset(start, 12 * ONE_HOUR));

    // Now at 18h wall-clock, 6h effective (18h wall - 6h pause = 12h effective... wait)
    // Wall: 18h. Elapsed wall: 18h. Paused: 6h. Effective: 12h = 50%
    const snap = computeSlaStatus(s, config, offset(start, 18 * ONE_HOUR));

    expect(snap.pausedTotal).toBe(6 * ONE_HOUR);
    expect(snap.elapsedPct).toBeCloseTo(0.5, 2); // 12h / 24h
    expect(snap.status).toBe("ON_TRACK");
    expect(snap.isPaused).toBe(false);
  });

  it("5d. Double-pause is idempotent — second pauseSla() has no effect", () => {
    const state = createSla(config, start);
    const paused1 = pauseSla(state, offset(start, 4 * ONE_HOUR));
    const paused2 = pauseSla(paused1, offset(start, 8 * ONE_HOUR)); // try to pause again

    // Should still have pausedAt from first pause
    expect(paused2.pausedAt).toEqual(paused1.pausedAt);
  });

  it("5e. Double-resume is idempotent — second resumeSla() has no effect", () => {
    const state = createSla(config, start);
    const paused = pauseSla(state, offset(start, 4 * ONE_HOUR));
    const resumed1 = resumeSla(paused, offset(start, 8 * ONE_HOUR));
    const resumed2 = resumeSla(resumed1, offset(start, 10 * ONE_HOUR)); // try to resume again

    expect(resumed2.pausedTotal).toBe(resumed1.pausedTotal);
    expect(resumed2.pausedAt).toBeNull();
  });

  it("5f. Pause while BREACHED: pausedTotal prevents further elapsed accumulation", () => {
    const state = createSla(config, start);
    // SLA already breached at start+24h; pause at start+25h
    const pauseTime = offset(start, 25 * ONE_HOUR);
    const paused = pauseSla(state, pauseTime);

    // 10h later — elapsed should NOT increase beyond pause point
    const later = offset(pauseTime, 10 * ONE_HOUR);
    const snapBefore = computeSlaStatus(paused, config, pauseTime);
    const snapAfter = computeSlaStatus(paused, config, later);

    expect(snapBefore.status).toBe("BREACHED");
    expect(snapAfter.status).toBe("BREACHED");
    // Effective elapsed should be the same at pause point
    expect(snapAfter.elapsedMs).toBe(snapBefore.elapsedMs);
  });
});

describe("SLA Engine — custom thresholds", () => {
  const start = new Date("2026-01-01T00:00:00.000Z");

  it("custom warningThreshold: 0.5 → WARNING at 50%", () => {
    const config: SlaConfig = {
      durationMs: ONE_DAY,
      warningThreshold: 0.5,
      criticalThreshold: 0.8,
    };
    const state = createSla(config, start);
    const snap = computeSlaStatus(state, config, offset(start, ONE_DAY * 0.6));

    expect(snap.status).toBe("WARNING");
  });

  it("custom criticalThreshold: 0.8 → CRITICAL at 85%", () => {
    const config: SlaConfig = {
      durationMs: ONE_DAY,
      warningThreshold: 0.5,
      criticalThreshold: 0.8,
    };
    const state = createSla(config, start);
    const snap = computeSlaStatus(state, config, offset(start, ONE_DAY * 0.85));

    expect(snap.status).toBe("CRITICAL");
  });

  it("default thresholds used when not specified", () => {
    const config: SlaConfig = { durationMs: ONE_DAY };
    const state = createSla(config, start);

    expect(computeSlaStatus(state, config, offset(start, ONE_DAY * 0.69)).status).toBe("ON_TRACK");
    expect(computeSlaStatus(state, config, offset(start, ONE_DAY * 0.75)).status).toBe("WARNING");
    expect(computeSlaStatus(state, config, offset(start, ONE_DAY * 0.92)).status).toBe("CRITICAL");
    expect(computeSlaStatus(state, config, offset(start, ONE_DAY * 1.05)).status).toBe("BREACHED");
  });
});

describe("SLA Engine — remainingMs and elapsedMs", () => {
  const config: SlaConfig = { durationMs: ONE_DAY };
  const start = new Date("2026-01-01T00:00:00.000Z");

  it("remainingMs is 0 when breached (never negative)", () => {
    const state = createSla(config, start);
    const snap = computeSlaStatus(state, config, offset(start, ONE_DAY * 2));

    expect(snap.remainingMs).toBe(0);
  });

  it("elapsedMs + remainingMs = durationMs when ON_TRACK", () => {
    const state = createSla(config, start);
    const snap = computeSlaStatus(state, config, offset(start, ONE_DAY * 0.5));

    expect(snap.elapsedMs + snap.remainingMs).toBeCloseTo(ONE_DAY, -1);
  });
});
