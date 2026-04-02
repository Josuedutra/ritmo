/**
 * RLS End-to-End Audit Tests (D3-12)
 *
 * Verifies that ALL Duedilis D1+D2+D3 endpoints:
 * 1. Require authentication (no session → return [] or throw 401)
 * 2. Filter by orgId (no cross-tenant data leakage)
 * 3. Verify org membership before returning/modifying data
 * 4. Check cross-org access on specific resource operations
 *
 * Groups:
 * - D1: project-actions (listProjects, createProject, updateProject)
 * - D1: membership-actions (listMembers, addMember, removeMember, updateRole)
 * - D2: upload-actions (presignUpload, verifyUploadHash, createUploadBatch, confirmBatch, createIndividualDocument)
 * - D2: approval-actions (createApproval, reviewApproval)
 * - D2: photo-actions (uploadPhoto, listPhotosByProject, listPhotosByIssue, deletePhoto)
 * - D3: meeting-actions (createMeeting, listMeetings, updateMeeting, addParticipant, publishMinutes)
 * - D3: evidence-link-actions (createEvidenceLink, listLinksForEntity, updateEvidenceLink, deleteEvidenceLink)
 * - D3: notification-actions (listNotifications, markAsRead, markAllAsRead, getUnreadCount)
 * - API routes: /api/notifications, /api/notifications/read-all, /api/notifications/[id]/read
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mock: @/lib/auth
// ---------------------------------------------------------------------------

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock: @/lib/prisma
// The mock must cover all D1/D2/D3 models used via `prisma as any`
// ---------------------------------------------------------------------------

const mockDb = {
  orgMembership: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  project: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  uploadBatch: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  document: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  approval: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  evidence: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  // evidence-link-actions uses photo.findUnique for EntityType 'photo'
  photo: {
    findUnique: vi.fn(),
  },
  meeting: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  meetingParticipant: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  meetingMinutes: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  actionItem: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  evidenceLink: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  issue: {
    findUnique: vi.fn(),
  },
  notification: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  },
  notificationOutbox: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: mockDb,
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { auth } from "@/lib/auth";

const mockAuth = auth as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ORG_A = "org-aaa";
const ORG_B = "org-bbb";
const USER_1 = "user-111";
const USER_2 = "user-222";
const PROJECT_1 = "proj-001";
const MEETING_1 = "meeting-001";

function mockSession(userId: string) {
  mockAuth.mockResolvedValue({ user: { id: userId } });
}

function mockNoSession() {
  mockAuth.mockResolvedValue(null);
}

function mockMembership(orgId: string, userId: string, role = "GESTOR_PROJETO") {
  mockDb.orgMembership.findUnique.mockImplementation(
    (args: { where: { userId_orgId: { userId: string; orgId: string } } }) => {
      const { userId: u, orgId: o } = args.where.userId_orgId;
      if (u === userId && o === orgId) {
        return Promise.resolve({ userId, orgId, role });
      }
      return Promise.resolve(null);
    }
  );
}

function mockNoMembership() {
  mockDb.orgMembership.findUnique.mockResolvedValue(null);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// D1: project-actions
// ===========================================================================

describe("D1 — project-actions", () => {
  describe("listProjects", () => {
    it("returns [] when not authenticated", async () => {
      const { listProjects } = await import("@/lib/actions/project-actions");
      mockNoSession();
      const result = await listProjects({ orgId: ORG_A });
      expect(result).toEqual([]);
      expect(mockDb.project.findMany).not.toHaveBeenCalled();
    });

    it("returns [] when not a member of the org", async () => {
      const { listProjects } = await import("@/lib/actions/project-actions");
      mockSession(USER_1);
      mockNoMembership();
      const result = await listProjects({ orgId: ORG_A });
      expect(result).toEqual([]);
      expect(mockDb.project.findMany).not.toHaveBeenCalled();
    });

    it("filters by orgId when listing projects", async () => {
      const { listProjects } = await import("@/lib/actions/project-actions");
      mockSession(USER_1);
      mockMembership(ORG_A, USER_1);
      mockDb.project.findMany.mockResolvedValue([{ id: PROJECT_1, orgId: ORG_A }]);
      await listProjects({ orgId: ORG_A });
      expect(mockDb.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ orgId: ORG_A }),
        })
      );
    });
  });

  describe("createProject", () => {
    it("throws 401 when not authenticated", async () => {
      const { createProject } = await import("@/lib/actions/project-actions");
      mockNoSession();
      await expect(createProject({ orgId: ORG_A, name: "Test" })).rejects.toThrow("401");
    });

    it("throws 403 when not a member", async () => {
      const { createProject } = await import("@/lib/actions/project-actions");
      mockSession(USER_1);
      mockNoMembership();
      await expect(createProject({ orgId: ORG_A, name: "Test" })).rejects.toThrow("403");
    });

    it("creates project scoped to orgId", async () => {
      const { createProject } = await import("@/lib/actions/project-actions");
      mockSession(USER_1);
      mockMembership(ORG_A, USER_1);
      mockDb.project.create.mockResolvedValue({ id: PROJECT_1, orgId: ORG_A, name: "Test" });
      await createProject({ orgId: ORG_A, name: "Test" });
      expect(mockDb.project.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ orgId: ORG_A, createdById: USER_1 }),
        })
      );
    });
  });

  describe("updateProject", () => {
    it("throws 403 on cross-org access", async () => {
      const { updateProject } = await import("@/lib/actions/project-actions");
      mockSession(USER_1);
      mockMembership(ORG_A, USER_1);
      // Project belongs to ORG_B but caller claims ORG_A
      mockDb.project.findUnique.mockResolvedValue({ id: PROJECT_1, orgId: ORG_B });
      await expect(
        updateProject({ orgId: ORG_A, projectId: PROJECT_1, name: "Hack" })
      ).rejects.toThrow("403");
    });

    it("updates only own-org project", async () => {
      const { updateProject } = await import("@/lib/actions/project-actions");
      mockSession(USER_1);
      mockMembership(ORG_A, USER_1);
      mockDb.project.findUnique.mockResolvedValue({ id: PROJECT_1, orgId: ORG_A });
      mockDb.project.update.mockResolvedValue({ id: PROJECT_1, orgId: ORG_A, name: "Updated" });
      await updateProject({ orgId: ORG_A, projectId: PROJECT_1, name: "Updated" });
      expect(mockDb.project.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: PROJECT_1 } })
      );
    });
  });
});

// ===========================================================================
// D1: membership-actions
// ===========================================================================

describe("D1 — membership-actions", () => {
  describe("listMembers", () => {
    it("returns [] when not authenticated", async () => {
      const { listMembers } = await import("@/lib/actions/membership-actions");
      mockNoSession();
      const result = await listMembers({ orgId: ORG_A });
      expect(result).toEqual([]);
    });

    it("returns [] when not a member of the org", async () => {
      const { listMembers } = await import("@/lib/actions/membership-actions");
      mockSession(USER_1);
      mockNoMembership();
      const result = await listMembers({ orgId: ORG_A });
      expect(result).toEqual([]);
      expect(mockDb.orgMembership.findMany).not.toHaveBeenCalled();
    });

    it("lists members filtered by orgId", async () => {
      const { listMembers } = await import("@/lib/actions/membership-actions");
      mockSession(USER_1);
      mockMembership(ORG_A, USER_1);
      mockDb.orgMembership.findMany.mockResolvedValue([]);
      await listMembers({ orgId: ORG_A });
      expect(mockDb.orgMembership.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { orgId: ORG_A } })
      );
    });
  });

  describe("addMember", () => {
    it("throws 401 when not authenticated", async () => {
      const { addMember } = await import("@/lib/actions/membership-actions");
      mockNoSession();
      await expect(
        addMember({ orgId: ORG_A, targetUserId: USER_2, role: "TECNICO" })
      ).rejects.toThrow("401");
    });

    it("throws 403 when caller is not ADMIN_ORG", async () => {
      const { addMember } = await import("@/lib/actions/membership-actions");
      mockSession(USER_1);
      mockMembership(ORG_A, USER_1, "GESTOR_PROJETO"); // not admin
      await expect(
        addMember({ orgId: ORG_A, targetUserId: USER_2, role: "TECNICO" })
      ).rejects.toThrow("403");
    });

    it("adds member when caller is ADMIN_ORG", async () => {
      const { addMember } = await import("@/lib/actions/membership-actions");
      mockSession(USER_1);
      mockMembership(ORG_A, USER_1, "ADMIN_ORG");
      mockDb.orgMembership.create.mockResolvedValue({
        userId: USER_2,
        orgId: ORG_A,
        role: "TECNICO",
      });
      await addMember({ orgId: ORG_A, targetUserId: USER_2, role: "TECNICO" });
      expect(mockDb.orgMembership.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ orgId: ORG_A, userId: USER_2 }),
        })
      );
    });
  });

  describe("removeMember", () => {
    it("throws 403 when not ADMIN_ORG", async () => {
      const { removeMember } = await import("@/lib/actions/membership-actions");
      mockSession(USER_1);
      mockMembership(ORG_A, USER_1, "FISCAL");
      await expect(removeMember({ orgId: ORG_A, targetUserId: USER_2 })).rejects.toThrow("403");
    });
  });

  describe("updateRole", () => {
    it("throws 404 when target membership not in same org", async () => {
      const { updateRole } = await import("@/lib/actions/membership-actions");
      mockSession(USER_1);
      // Caller is ADMIN of ORG_A, but target is in ORG_B
      mockDb.orgMembership.findUnique.mockImplementation(
        (args: { where: { userId_orgId: { userId: string; orgId: string } } }) => {
          const { userId, orgId } = args.where.userId_orgId;
          // Return admin for USER_1 in ORG_A, null for USER_2 in ORG_A
          if (userId === USER_1 && orgId === ORG_A) {
            return Promise.resolve({ userId: USER_1, orgId: ORG_A, role: "ADMIN_ORG" });
          }
          return Promise.resolve(null);
        }
      );
      await expect(
        updateRole({ orgId: ORG_A, targetUserId: USER_2, role: "FISCAL" })
      ).rejects.toThrow("404");
    });
  });
});

// ===========================================================================
// D2: upload-actions
// ===========================================================================

describe("D2 — upload-actions", () => {
  describe("presignUpload", () => {
    it("throws 401 when not authenticated", async () => {
      const { presignUpload } = await import("@/lib/actions/upload-actions");
      mockNoSession();
      await expect(
        presignUpload({
          orgId: ORG_A,
          projectId: PROJECT_1,
          filename: "test.pdf",
          mimeType: "application/pdf",
          sizeBytes: 100,
        })
      ).rejects.toThrow("401");
    });

    it("throws 403 when not a member", async () => {
      const { presignUpload } = await import("@/lib/actions/upload-actions");
      mockSession(USER_1);
      mockNoMembership();
      await expect(
        presignUpload({
          orgId: ORG_A,
          projectId: PROJECT_1,
          filename: "test.pdf",
          mimeType: "application/pdf",
          sizeBytes: 100,
        })
      ).rejects.toThrow("403");
    });

    it("scopes storage key to orgId", async () => {
      const { presignUpload } = await import("@/lib/actions/upload-actions");
      mockSession(USER_1);
      mockMembership(ORG_A, USER_1);
      const result = await presignUpload({
        orgId: ORG_A,
        projectId: PROJECT_1,
        filename: "test.pdf",
        mimeType: "application/pdf",
        sizeBytes: 100,
      });
      expect(result.storageKey).toContain(ORG_A);
    });
  });

  describe("confirmBatch", () => {
    it("throws 403 on cross-org batch access", async () => {
      const { confirmBatch } = await import("@/lib/actions/upload-actions");
      mockSession(USER_1);
      mockMembership(ORG_A, USER_1);
      // Batch belongs to ORG_B
      mockDb.uploadBatch.findUnique.mockResolvedValue({ id: "batch-1", orgId: ORG_B });
      await expect(confirmBatch({ orgId: ORG_A, batchId: "batch-1" })).rejects.toThrow("403");
    });

    it("confirms own-org batch", async () => {
      const { confirmBatch } = await import("@/lib/actions/upload-actions");
      mockSession(USER_1);
      mockMembership(ORG_A, USER_1);
      mockDb.uploadBatch.findUnique.mockResolvedValue({ id: "batch-1", orgId: ORG_A });
      mockDb.uploadBatch.update.mockResolvedValue({
        id: "batch-1",
        orgId: ORG_A,
        status: "CONFIRMED",
      });
      await confirmBatch({ orgId: ORG_A, batchId: "batch-1" });
      expect(mockDb.uploadBatch.update).toHaveBeenCalled();
    });
  });

  describe("createIndividualDocument", () => {
    it("scopes document to orgId", async () => {
      const { createIndividualDocument } = await import("@/lib/actions/upload-actions");
      mockSession(USER_1);
      mockMembership(ORG_A, USER_1);
      mockDb.document.create.mockResolvedValue({ id: "doc-1", orgId: ORG_A });
      await createIndividualDocument({
        orgId: ORG_A,
        projectId: PROJECT_1,
        filename: "test.pdf",
        mimeType: "application/pdf",
        sizeBytes: 100,
        storageKey: `orgs/${ORG_A}/test.pdf`,
      });
      expect(mockDb.document.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ orgId: ORG_A, uploadedById: USER_1 }),
        })
      );
    });
  });
});

// ===========================================================================
// D2: approval-actions
// ===========================================================================

describe("D2 — approval-actions", () => {
  describe("createApproval", () => {
    it("throws 401 when not authenticated", async () => {
      const { createApproval } = await import("@/lib/actions/approval-actions");
      mockNoSession();
      await expect(
        createApproval({ orgId: ORG_A, entityType: "document", entityId: "doc-1" })
      ).rejects.toThrow("401");
    });

    it("throws 403 when not a member", async () => {
      const { createApproval } = await import("@/lib/actions/approval-actions");
      mockSession(USER_1);
      mockNoMembership();
      await expect(
        createApproval({ orgId: ORG_A, entityType: "document", entityId: "doc-1" })
      ).rejects.toThrow("403");
    });

    it("creates approval scoped to orgId", async () => {
      const { createApproval } = await import("@/lib/actions/approval-actions");
      mockSession(USER_1);
      mockMembership(ORG_A, USER_1);
      mockDb.approval.create.mockResolvedValue({ id: "appr-1", orgId: ORG_A, status: "PENDING" });
      await createApproval({ orgId: ORG_A, entityType: "document", entityId: "doc-1" });
      expect(mockDb.approval.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ orgId: ORG_A, requestedById: USER_1, status: "PENDING" }),
        })
      );
    });
  });

  describe("reviewApproval", () => {
    it("throws 403 when caller lacks review role", async () => {
      const { reviewApproval } = await import("@/lib/actions/approval-actions");
      mockSession(USER_1);
      mockMembership(ORG_A, USER_1, "TECNICO"); // not ADMIN or FISCAL
      await expect(
        reviewApproval({ orgId: ORG_A, approvalId: "appr-1", decision: "APPROVED" })
      ).rejects.toThrow("403");
    });

    it("throws 403 on cross-org approval access", async () => {
      const { reviewApproval } = await import("@/lib/actions/approval-actions");
      mockSession(USER_1);
      mockMembership(ORG_A, USER_1, "FISCAL");
      // Approval belongs to ORG_B
      mockDb.approval.findUnique.mockResolvedValue({ id: "appr-1", orgId: ORG_B });
      await expect(
        reviewApproval({ orgId: ORG_A, approvalId: "appr-1", decision: "APPROVED" })
      ).rejects.toThrow("403");
    });

    it("reviews own-org approval", async () => {
      const { reviewApproval } = await import("@/lib/actions/approval-actions");
      mockSession(USER_1);
      mockMembership(ORG_A, USER_1, "ADMIN_ORG");
      mockDb.approval.findUnique.mockResolvedValue({ id: "appr-1", orgId: ORG_A });
      mockDb.approval.update.mockResolvedValue({ id: "appr-1", orgId: ORG_A, status: "APPROVED" });
      await reviewApproval({ orgId: ORG_A, approvalId: "appr-1", decision: "APPROVED" });
      expect(mockDb.approval.update).toHaveBeenCalled();
    });
  });
});

// ===========================================================================
// D2: photo-actions
// ===========================================================================

describe("D2 — photo-actions", () => {
  describe("uploadPhoto", () => {
    it("throws 401 when not authenticated", async () => {
      const { uploadPhoto } = await import("@/lib/actions/photo-actions");
      mockNoSession();
      await expect(
        uploadPhoto({ orgId: ORG_A, projectId: PROJECT_1, filename: "img.jpg", storageKey: "key" })
      ).rejects.toThrow("401");
    });

    it("scopes photo to orgId", async () => {
      const { uploadPhoto } = await import("@/lib/actions/photo-actions");
      mockSession(USER_1);
      mockMembership(ORG_A, USER_1);
      mockDb.evidence.create.mockResolvedValue({ id: "photo-1", orgId: ORG_A });
      await uploadPhoto({
        orgId: ORG_A,
        projectId: PROJECT_1,
        filename: "img.jpg",
        storageKey: "key",
      });
      expect(mockDb.evidence.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ orgId: ORG_A, uploadedById: USER_1 }),
        })
      );
    });
  });

  describe("listPhotosByProject", () => {
    it("returns [] for non-member", async () => {
      const { listPhotosByProject } = await import("@/lib/actions/photo-actions");
      mockSession(USER_1);
      mockNoMembership();
      const result = await listPhotosByProject({ orgId: ORG_A, projectId: PROJECT_1 });
      expect(result).toEqual([]);
      expect(mockDb.evidence.findMany).not.toHaveBeenCalled();
    });

    it("filters by orgId and projectId", async () => {
      const { listPhotosByProject } = await import("@/lib/actions/photo-actions");
      mockSession(USER_1);
      mockMembership(ORG_A, USER_1);
      mockDb.evidence.findMany.mockResolvedValue([]);
      await listPhotosByProject({ orgId: ORG_A, projectId: PROJECT_1 });
      expect(mockDb.evidence.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ orgId: ORG_A, projectId: PROJECT_1 }),
        })
      );
    });
  });

  describe("listPhotosByIssue", () => {
    it("filters by orgId and issueId (no cross-org leak)", async () => {
      const { listPhotosByIssue } = await import("@/lib/actions/photo-actions");
      mockSession(USER_1);
      mockMembership(ORG_A, USER_1);
      mockDb.evidence.findMany.mockResolvedValue([]);
      await listPhotosByIssue({ orgId: ORG_A, issueId: "issue-1" });
      expect(mockDb.evidence.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ orgId: ORG_A, issueId: "issue-1" }),
        })
      );
    });
  });

  describe("deletePhoto", () => {
    it("throws 403 on cross-org photo delete", async () => {
      const { deletePhoto } = await import("@/lib/actions/photo-actions");
      mockSession(USER_1);
      mockMembership(ORG_A, USER_1);
      // Photo belongs to ORG_B
      mockDb.evidence.findUnique.mockResolvedValue({ id: "photo-1", orgId: ORG_B });
      await expect(deletePhoto({ orgId: ORG_A, photoId: "photo-1" })).rejects.toThrow("403");
    });

    it("throws 404 when photo not found", async () => {
      const { deletePhoto } = await import("@/lib/actions/photo-actions");
      mockSession(USER_1);
      mockMembership(ORG_A, USER_1);
      mockDb.evidence.findUnique.mockResolvedValue(null);
      await expect(deletePhoto({ orgId: ORG_A, photoId: "ghost-photo" })).rejects.toThrow("404");
    });

    it("deletes own-org photo", async () => {
      const { deletePhoto } = await import("@/lib/actions/photo-actions");
      mockSession(USER_1);
      mockMembership(ORG_A, USER_1);
      mockDb.evidence.findUnique.mockResolvedValue({ id: "photo-1", orgId: ORG_A });
      mockDb.evidence.delete.mockResolvedValue({ id: "photo-1" });
      await deletePhoto({ orgId: ORG_A, photoId: "photo-1" });
      expect(mockDb.evidence.delete).toHaveBeenCalledWith({ where: { id: "photo-1" } });
    });
  });
});

// ===========================================================================
// D3: meeting-actions
// ===========================================================================

describe("D3 — meeting-actions", () => {
  describe("createMeeting", () => {
    it("throws 401 when not authenticated", async () => {
      const { createMeeting } = await import("@/lib/actions/meeting-actions");
      mockNoSession();
      await expect(
        createMeeting({
          orgId: ORG_A,
          projectId: PROJECT_1,
          title: "Test",
          scheduledAt: new Date(),
        })
      ).rejects.toThrow("401");
    });

    it("throws 403 when not a member", async () => {
      const { createMeeting } = await import("@/lib/actions/meeting-actions");
      mockSession(USER_1);
      mockNoMembership();
      await expect(
        createMeeting({
          orgId: ORG_A,
          projectId: PROJECT_1,
          title: "Test",
          scheduledAt: new Date(),
        })
      ).rejects.toThrow("403");
    });

    it("creates meeting scoped to orgId", async () => {
      const { createMeeting } = await import("@/lib/actions/meeting-actions");
      mockSession(USER_1);
      mockMembership(ORG_A, USER_1);
      mockDb.meeting.create.mockResolvedValue({ id: MEETING_1, orgId: ORG_A });
      const scheduledAt = new Date("2026-05-01T10:00:00Z");
      await createMeeting({
        orgId: ORG_A,
        projectId: PROJECT_1,
        title: "Sprint Review",
        scheduledAt,
      });
      expect(mockDb.meeting.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ orgId: ORG_A, createdById: USER_1 }),
        })
      );
    });
  });

  describe("listMeetings", () => {
    it("returns [] for non-member (RLS: no cross-tenant leak)", async () => {
      const { listMeetings } = await import("@/lib/actions/meeting-actions");
      mockSession(USER_1);
      mockNoMembership();
      const result = await listMeetings({ orgId: ORG_A });
      expect(result).toEqual([]);
      expect(mockDb.meeting.findMany).not.toHaveBeenCalled();
    });

    it("filters by orgId", async () => {
      const { listMeetings } = await import("@/lib/actions/meeting-actions");
      mockSession(USER_1);
      mockMembership(ORG_A, USER_1);
      mockDb.meeting.findMany.mockResolvedValue([]);
      await listMeetings({ orgId: ORG_A });
      const call = mockDb.meeting.findMany.mock.calls[0][0] as { where: { orgId: string } };
      expect(call.where.orgId).toBe(ORG_A);
    });
  });

  describe("updateMeeting", () => {
    it("throws 403 on cross-org meeting update", async () => {
      const { updateMeeting } = await import("@/lib/actions/meeting-actions");
      mockSession(USER_1);
      mockMembership(ORG_A, USER_1);
      // Meeting belongs to ORG_B
      mockDb.meeting.findUnique.mockResolvedValue({ id: MEETING_1, orgId: ORG_B });
      await expect(
        updateMeeting({ orgId: ORG_A, meetingId: MEETING_1, title: "Hacked" })
      ).rejects.toThrow("403");
    });
  });

  describe("addParticipant", () => {
    it("throws 403 when target user is not org member", async () => {
      const { addParticipant } = await import("@/lib/actions/meeting-actions");
      mockSession(USER_1);
      mockDb.meeting.findUnique.mockResolvedValue({ id: MEETING_1, orgId: ORG_A });
      mockDb.orgMembership.findUnique.mockImplementation(
        (args: { where: { userId_orgId: { userId: string; orgId: string } } }) => {
          const { userId, orgId } = args.where.userId_orgId;
          // Requester (USER_1) is member of ORG_A, target (USER_2) is not
          if (userId === USER_1 && orgId === ORG_A) {
            return Promise.resolve({ userId: USER_1, orgId: ORG_A, role: "ADMIN_ORG" });
          }
          return Promise.resolve(null);
        }
      );
      await expect(
        addParticipant({ orgId: ORG_A, meetingId: MEETING_1, userId: USER_2 })
      ).rejects.toThrow("403");
    });
  });

  describe("publishMinutes", () => {
    it("throws 403 when caller lacks permission", async () => {
      const { publishMinutes } = await import("@/lib/actions/meeting-actions");
      mockSession(USER_1);
      mockMembership(ORG_A, USER_1, "TECNICO"); // insufficient role
      await expect(
        publishMinutes({ orgId: ORG_A, meetingId: MEETING_1, content: "Minutes..." })
      ).rejects.toThrow("403");
    });

    it("throws 403 on cross-org meeting minutes", async () => {
      const { publishMinutes } = await import("@/lib/actions/meeting-actions");
      mockSession(USER_1);
      mockMembership(ORG_A, USER_1, "ADMIN_ORG");
      // Meeting belongs to ORG_B
      mockDb.meeting.findUnique.mockResolvedValue({ id: MEETING_1, orgId: ORG_B });
      await expect(
        publishMinutes({ orgId: ORG_A, meetingId: MEETING_1, content: "Minutes..." })
      ).rejects.toThrow("403");
    });
  });
});

// ===========================================================================
// D3: evidence-link-actions
// ===========================================================================

describe("D3 — evidence-link-actions", () => {
  describe("createEvidenceLink", () => {
    it("throws 401 when not authenticated", async () => {
      const { createEvidenceLink } = await import("@/lib/actions/evidence-link-actions");
      mockNoSession();
      await expect(
        createEvidenceLink({
          orgId: ORG_A,
          sourceType: "issue",
          sourceId: "iss-1",
          targetType: "document",
          targetId: "doc-1",
        })
      ).rejects.toThrow("401");
    });

    it("throws 403 when not a member", async () => {
      const { createEvidenceLink } = await import("@/lib/actions/evidence-link-actions");
      mockSession(USER_1);
      mockNoMembership();
      await expect(
        createEvidenceLink({
          orgId: ORG_A,
          sourceType: "issue",
          sourceId: "iss-1",
          targetType: "document",
          targetId: "doc-1",
        })
      ).rejects.toThrow("403");
    });

    it("throws 403 when source entity belongs to different org", async () => {
      const { createEvidenceLink } = await import("@/lib/actions/evidence-link-actions");
      mockSession(USER_1);
      mockMembership(ORG_A, USER_1);
      // Source entity (issue) belongs to ORG_B
      mockDb.issue.findUnique.mockResolvedValue({ id: "iss-1", orgId: ORG_B });
      await expect(
        createEvidenceLink({
          orgId: ORG_A,
          sourceType: "issue",
          sourceId: "iss-1",
          targetType: "document",
          targetId: "doc-1",
        })
      ).rejects.toThrow("403");
    });

    it("throws 403 when target entity belongs to different org", async () => {
      const { createEvidenceLink } = await import("@/lib/actions/evidence-link-actions");
      mockSession(USER_1);
      mockMembership(ORG_A, USER_1);
      mockDb.issue.findUnique.mockResolvedValue({ id: "iss-1", orgId: ORG_A });
      // Target entity (document) belongs to ORG_B
      mockDb.document.findUnique.mockResolvedValue({ id: "doc-1", orgId: ORG_B });
      await expect(
        createEvidenceLink({
          orgId: ORG_A,
          sourceType: "issue",
          sourceId: "iss-1",
          targetType: "document",
          targetId: "doc-1",
        })
      ).rejects.toThrow("403");
    });

    it("creates link with audit hash when both entities are in same org", async () => {
      const { createEvidenceLink } = await import("@/lib/actions/evidence-link-actions");
      mockSession(USER_1);
      mockMembership(ORG_A, USER_1);
      mockDb.issue.findUnique.mockResolvedValue({ id: "iss-1", orgId: ORG_A });
      mockDb.document.findUnique.mockResolvedValue({ id: "doc-1", orgId: ORG_A });
      mockDb.evidenceLink.create.mockResolvedValue({
        id: "link-1",
        orgId: ORG_A,
        hash: "abc123",
      });
      await createEvidenceLink({
        orgId: ORG_A,
        sourceType: "issue",
        sourceId: "iss-1",
        targetType: "document",
        targetId: "doc-1",
      });
      expect(mockDb.evidenceLink.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orgId: ORG_A,
            createdById: USER_1,
            hash: expect.any(String),
          }),
        })
      );
    });
  });

  describe("listLinksForEntity", () => {
    it("returns [] for non-member", async () => {
      const { listLinksForEntity } = await import("@/lib/actions/evidence-link-actions");
      mockSession(USER_1);
      mockNoMembership();
      const result = await listLinksForEntity({
        orgId: ORG_A,
        entityType: "issue",
        entityId: "iss-1",
      });
      expect(result).toEqual([]);
      expect(mockDb.evidenceLink.findMany).not.toHaveBeenCalled();
    });

    it("filters all queries by orgId (no cross-org leak)", async () => {
      const { listLinksForEntity } = await import("@/lib/actions/evidence-link-actions");
      mockSession(USER_1);
      mockMembership(ORG_A, USER_1);
      mockDb.evidenceLink.findMany.mockResolvedValue([]);
      await listLinksForEntity({ orgId: ORG_A, entityType: "issue", entityId: "iss-1" });
      // Both findMany calls (asSource + asTarget) must include orgId
      const calls = mockDb.evidenceLink.findMany.mock.calls;
      expect(calls.length).toBe(2);
      for (const [call] of calls) {
        const typed = call as { where: { orgId: string } };
        expect(typed.where.orgId).toBe(ORG_A);
      }
    });
  });

  describe("updateEvidenceLink / deleteEvidenceLink", () => {
    it("updateEvidenceLink always throws 403 — immutable", async () => {
      const { updateEvidenceLink } = await import("@/lib/actions/evidence-link-actions");
      await expect(updateEvidenceLink({})).rejects.toThrow("403");
      await expect(updateEvidenceLink({})).rejects.toThrow("imutável");
    });

    it("deleteEvidenceLink always throws 403 — immutable", async () => {
      const { deleteEvidenceLink } = await import("@/lib/actions/evidence-link-actions");
      await expect(deleteEvidenceLink({})).rejects.toThrow("403");
      await expect(deleteEvidenceLink({})).rejects.toThrow("imutável");
    });
  });
});

// ===========================================================================
// D3: notification-actions
// ===========================================================================

describe("D3 — notification-actions", () => {
  describe("listNotifications", () => {
    it("returns [] when not authenticated", async () => {
      const { listNotifications } = await import("@/lib/actions/notification-actions");
      mockNoSession();
      const result = await listNotifications({ orgId: ORG_A });
      expect(result).toEqual([]);
      expect(mockDb.notification.findMany).not.toHaveBeenCalled();
    });

    it("filters by orgId and userId (no cross-user leak)", async () => {
      const { listNotifications } = await import("@/lib/actions/notification-actions");
      mockSession(USER_1);
      mockDb.notification.findMany.mockResolvedValue([]);
      await listNotifications({ orgId: ORG_A });
      expect(mockDb.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ orgId: ORG_A, userId: USER_1 }),
        })
      );
    });
  });

  describe("markAsRead", () => {
    it("throws 403 when trying to mark another user's notification", async () => {
      const { markAsRead } = await import("@/lib/actions/notification-actions");
      mockSession(USER_1);
      // Notification belongs to USER_2
      mockDb.notification.findUnique.mockResolvedValue({
        id: "notif-1",
        userId: USER_2,
        orgId: ORG_A,
        read: false,
      });
      await expect(markAsRead("notif-1")).rejects.toThrow("403");
    });

    it("marks own notification as read", async () => {
      const { markAsRead } = await import("@/lib/actions/notification-actions");
      mockSession(USER_1);
      mockDb.notification.findUnique.mockResolvedValue({
        id: "notif-1",
        userId: USER_1,
        orgId: ORG_A,
        read: false,
      });
      mockDb.notification.update.mockResolvedValue({
        id: "notif-1",
        userId: USER_1,
        orgId: ORG_A,
        read: true,
      });
      await markAsRead("notif-1");
      expect(mockDb.notification.update).toHaveBeenCalled();
    });
  });

  describe("markAllAsRead", () => {
    it("filters by orgId and userId", async () => {
      const { markAllAsRead } = await import("@/lib/actions/notification-actions");
      mockSession(USER_1);
      mockDb.notification.updateMany.mockResolvedValue({ count: 3 });
      await markAllAsRead(ORG_A);
      expect(mockDb.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ orgId: ORG_A, userId: USER_1 }),
        })
      );
    });
  });

  describe("getUnreadCount", () => {
    it("returns 0 when not authenticated", async () => {
      const { getUnreadCount } = await import("@/lib/actions/notification-actions");
      mockNoSession();
      const result = await getUnreadCount(ORG_A);
      expect(result).toBe(0);
    });

    it("filters by orgId and userId", async () => {
      const { getUnreadCount } = await import("@/lib/actions/notification-actions");
      mockSession(USER_1);
      mockDb.notification.count.mockResolvedValue(5);
      const result = await getUnreadCount(ORG_A);
      expect(result).toBe(5);
      expect(mockDb.notification.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ orgId: ORG_A, userId: USER_1 }),
        })
      );
    });
  });
});

// ===========================================================================
// API Routes: /api/notifications
// ===========================================================================

describe("API Routes — /api/notifications", () => {
  describe("GET /api/notifications", () => {
    it("returns 401 when not authenticated", async () => {
      const { GET } = await import("@/app/api/notifications/route");
      mockNoSession();
      const request = new NextRequest("http://localhost/api/notifications?orgId=org-aaa");
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("returns 400 when orgId missing", async () => {
      const { GET } = await import("@/app/api/notifications/route");
      mockSession(USER_1);
      const request = new NextRequest("http://localhost/api/notifications");
      const response = await GET(request);
      expect(response.status).toBe(400);
    });

    it("returns 200 with notifications for authenticated user", async () => {
      const { GET } = await import("@/app/api/notifications/route");
      mockSession(USER_1);
      mockDb.notification.findMany.mockResolvedValue([]);
      mockDb.notification.count.mockResolvedValue(0);
      const request = new NextRequest(`http://localhost/api/notifications?orgId=${ORG_A}`);
      const response = await GET(request);
      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/notifications/read-all", () => {
    it("returns 401 when not authenticated", async () => {
      const { POST } = await import("@/app/api/notifications/read-all/route");
      mockNoSession();
      const request = new NextRequest("http://localhost/api/notifications/read-all", {
        method: "POST",
        body: JSON.stringify({ orgId: ORG_A }),
        headers: { "content-type": "application/json" },
      });
      const response = await POST(request);
      expect(response.status).toBe(401);
    });
  });
});
