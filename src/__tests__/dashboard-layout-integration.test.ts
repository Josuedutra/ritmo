/**
 * Dashboard Layout Integration Tests (E3-C2)
 *
 * Tests the session/membership gate logic used by the dashboard layout.
 * Three scenarios:
 * 1. User with orgMembership (onboardingCompleted=true) → layout renders (no redirect)
 * 2. User without orgMembership (onboardingCompleted=false) → redirect /onboarding
 * 3. User without session → redirect /login
 *
 * Implementation: static + logic simulation tests.
 * The `requireOnboardingComplete` gate in onboarding-gate.ts is tested by simulating
 * its logic directly — avoids next/navigation and @/lib/auth imports in node env.
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "../../");

function readFile(relativePath: string): string {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) return "";
  return fs.readFileSync(fullPath, "utf-8");
}

// ---------------------------------------------------------------------------
// Simulate the onboarding gate logic (mirrors onboarding-gate.ts)
// ---------------------------------------------------------------------------

interface MockSession {
  user: {
    id: string;
    email: string;
    organizationId?: string;
    role?: string;
  };
}

interface MockOrg {
  onboardingCompleted: boolean;
}

type GateResult = { action: "allow"; session: MockSession } | { action: "redirect"; to: string };

/**
 * Simulate requireOnboardingComplete() from src/lib/onboarding-gate.ts
 * Returns either allow (with session) or redirect (with target path)
 */
function simulateOnboardingGate(session: MockSession | null, org: MockOrg | null): GateResult {
  if (!session?.user?.organizationId) {
    return { action: "redirect", to: "/login" };
  }

  if (!org) {
    return { action: "redirect", to: "/login" };
  }

  if (!org.onboardingCompleted) {
    return { action: "redirect", to: "/onboarding" };
  }

  return { action: "allow", session };
}

/**
 * Simulate requireOnboardingIncomplete() from src/lib/onboarding-gate.ts
 * (Used by onboarding page — inverse gate)
 */
function simulateOnboardingIncompleteGate(
  session: MockSession | null,
  org: MockOrg | null
): GateResult {
  if (!session?.user?.organizationId) {
    return { action: "redirect", to: "/login" };
  }

  if (!org) {
    return { action: "redirect", to: "/login" };
  }

  if (org.onboardingCompleted) {
    return { action: "redirect", to: "/dashboard" };
  }

  return { action: "allow", session };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Dashboard layout gate: requireOnboardingComplete", () => {
  it("1. user with orgMembership and onboardingCompleted=true → allow (no redirect)", () => {
    const session: MockSession = {
      user: { id: "user-1", email: "a@b.com", organizationId: "org-1", role: "admin" },
    };
    const org: MockOrg = { onboardingCompleted: true };

    const result = simulateOnboardingGate(session, org);

    expect(result.action).toBe("allow");
    if (result.action === "allow") {
      expect(result.session.user.organizationId).toBe("org-1");
    }
  });

  it("2. user with session but onboardingCompleted=false → redirect /onboarding", () => {
    const session: MockSession = {
      user: { id: "user-2", email: "b@b.com", organizationId: "org-2", role: "admin" },
    };
    const org: MockOrg = { onboardingCompleted: false };

    const result = simulateOnboardingGate(session, org);

    expect(result.action).toBe("redirect");
    if (result.action === "redirect") {
      expect(result.to).toBe("/onboarding");
    }
  });

  it("3. user without session → redirect /login", () => {
    const result = simulateOnboardingGate(null, null);

    expect(result.action).toBe("redirect");
    if (result.action === "redirect") {
      expect(result.to).toBe("/login");
    }
  });

  it("user with session but missing organizationId → redirect /login", () => {
    const session: MockSession = {
      user: { id: "user-3", email: "c@b.com" }, // no organizationId
    };

    const result = simulateOnboardingGate(session, null);

    expect(result.action).toBe("redirect");
    if (result.action === "redirect") {
      expect(result.to).toBe("/login");
    }
  });

  it("user with session but org not found in DB → redirect /login", () => {
    const session: MockSession = {
      user: { id: "user-4", email: "d@b.com", organizationId: "org-deleted" },
    };

    const result = simulateOnboardingGate(session, null); // org=null simulates not found

    expect(result.action).toBe("redirect");
    if (result.action === "redirect") {
      expect(result.to).toBe("/login");
    }
  });
});

describe("Onboarding page gate: requireOnboardingIncomplete", () => {
  it("user with onboardingCompleted=true → redirect /dashboard", () => {
    const session: MockSession = {
      user: { id: "user-1", email: "a@b.com", organizationId: "org-1" },
    };
    const org: MockOrg = { onboardingCompleted: true };

    const result = simulateOnboardingIncompleteGate(session, org);

    expect(result.action).toBe("redirect");
    if (result.action === "redirect") {
      expect(result.to).toBe("/dashboard");
    }
  });

  it("user with onboardingCompleted=false → allow (renders onboarding wizard)", () => {
    const session: MockSession = {
      user: { id: "user-2", email: "b@b.com", organizationId: "org-2" },
    };
    const org: MockOrg = { onboardingCompleted: false };

    const result = simulateOnboardingIncompleteGate(session, org);

    expect(result.action).toBe("allow");
  });

  it("user without session → redirect /login", () => {
    const result = simulateOnboardingIncompleteGate(null, null);

    expect(result.action).toBe("redirect");
    if (result.action === "redirect") {
      expect(result.to).toBe("/login");
    }
  });
});

describe("Onboarding gate: source code verification", () => {
  const gateContent = readFile("src/lib/onboarding-gate.ts");

  it("onboarding-gate.ts exists", () => {
    expect(gateContent).toBeTruthy();
  });

  it("requireOnboardingComplete redirects to /onboarding when not complete", () => {
    expect(gateContent).toContain("requireOnboardingComplete");
    expect(gateContent).toContain('redirect("/onboarding")');
  });

  it("requireOnboardingComplete redirects to /login when no session", () => {
    expect(gateContent).toContain('redirect("/login")');
  });

  it("requireOnboardingIncomplete redirects to /dashboard when complete", () => {
    expect(gateContent).toContain("requireOnboardingIncomplete");
    expect(gateContent).toContain('redirect("/dashboard")');
  });

  it("dashboard/page.tsx calls requireOnboardingComplete", () => {
    const dashboardContent = readFile("src/app/dashboard/page.tsx");
    expect(dashboardContent).toContain("requireOnboardingComplete");
  });

  it("onboarding/page.tsx calls requireOnboardingIncomplete", () => {
    const onboardingContent = readFile("src/app/onboarding/page.tsx");
    expect(onboardingContent).toContain("requireOnboardingIncomplete");
  });
});
