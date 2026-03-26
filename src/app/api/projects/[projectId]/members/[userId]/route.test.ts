import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    projectMember: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    apiKey: { deleteMany: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/projects", () => ({ userIsProjectAdmin: vi.fn() }));

import { PATCH, DELETE } from "./route";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { userIsProjectAdmin } from "@/lib/projects";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockIsAdmin = userIsProjectAdmin as ReturnType<typeof vi.fn>;
const mockDb = db as unknown as {
  projectMember: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  apiKey: { deleteMany: ReturnType<typeof vi.fn> };
  auditLog: { create: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

const session = { user: { id: "u1" } };
const routeParams = { params: Promise.resolve({ projectId: "p1", userId: "u2" }) };
const selfParams = { params: Promise.resolve({ projectId: "p1", userId: "u1" }) };

function makePatch(body: unknown) {
  return new Request("http://localhost/api/projects/p1/members/u2", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/projects/[projectId]/members/[userId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PATCH(makePatch({ role: "MEMBER" }), routeParams);
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-project-admin", async () => {
    mockAuth.mockResolvedValue(session);
    mockIsAdmin.mockResolvedValue(false);
    const res = await PATCH(makePatch({ role: "MEMBER" }), routeParams);
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid role", async () => {
    mockAuth.mockResolvedValue(session);
    mockIsAdmin.mockResolvedValue(true);
    const res = await PATCH(makePatch({ role: "SUPERUSER" }), routeParams);
    expect(res.status).toBe(400);
  });

  it("returns 404 when member not found", async () => {
    mockAuth.mockResolvedValue(session);
    mockIsAdmin.mockResolvedValue(true);
    mockDb.projectMember.findUnique.mockResolvedValue(null);
    const res = await PATCH(makePatch({ role: "MEMBER" }), routeParams);
    expect(res.status).toBe(404);
  });

  it("returns 400 when demoting last project admin", async () => {
    mockAuth.mockResolvedValue(session);
    mockIsAdmin.mockResolvedValue(true);
    mockDb.projectMember.findUnique.mockResolvedValue({ role: "ADMIN" });
    mockDb.projectMember.count.mockResolvedValue(0); // no other admins
    const res = await PATCH(makePatch({ role: "MEMBER" }), routeParams);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/last project admin/i);
  });

  it("returns 200 on successful role change", async () => {
    mockAuth.mockResolvedValue(session);
    mockIsAdmin.mockResolvedValue(true);
    mockDb.projectMember.findUnique.mockResolvedValue({ role: "MEMBER" });
    mockDb.$transaction.mockResolvedValue([{}, {}]);
    const res = await PATCH(makePatch({ role: "ADMIN" }), routeParams);
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/projects/[projectId]/members/[userId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await DELETE(new Request("http://localhost"), routeParams);
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-project-admin", async () => {
    mockAuth.mockResolvedValue(session);
    mockIsAdmin.mockResolvedValue(false);
    const res = await DELETE(new Request("http://localhost"), routeParams);
    expect(res.status).toBe(403);
  });

  it("returns 404 when member not found", async () => {
    mockAuth.mockResolvedValue(session);
    mockIsAdmin.mockResolvedValue(true);
    mockDb.projectMember.findUnique.mockResolvedValue(null);
    const res = await DELETE(new Request("http://localhost"), routeParams);
    expect(res.status).toBe(404);
  });

  it("returns 400 when self-removing as last project admin", async () => {
    mockAuth.mockResolvedValue(session);
    mockIsAdmin.mockResolvedValue(true);
    mockDb.projectMember.findUnique.mockResolvedValue({ role: "ADMIN" });
    mockDb.projectMember.count.mockResolvedValue(0); // no other admins
    const res = await DELETE(new Request("http://localhost"), selfParams);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/last project admin/i);
  });

  it("returns 200 and cleans up API keys on success", async () => {
    mockAuth.mockResolvedValue(session);
    mockIsAdmin.mockResolvedValue(true);
    mockDb.projectMember.findUnique.mockResolvedValue({ role: "MEMBER" });
    mockDb.$transaction.mockResolvedValue([{}, {}, {}]);
    const res = await DELETE(new Request("http://localhost"), routeParams);
    expect(res.status).toBe(200);
    // $transaction called — API key cleanup is inside it
    expect(mockDb.$transaction).toHaveBeenCalledTimes(1);
  });
});
