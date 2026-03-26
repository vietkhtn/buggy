import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    projectMember: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    user: { findUnique: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/projects", () => ({ userIsProjectAdmin: vi.fn() }));

import { GET, POST } from "./route";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { userIsProjectAdmin } from "@/lib/projects";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockIsAdmin = userIsProjectAdmin as ReturnType<typeof vi.fn>;
const mockDb = db as unknown as {
  projectMember: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  user: { findUnique: ReturnType<typeof vi.fn> };
  auditLog: { create: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

const session = { user: { id: "u1", isWorkspaceAdmin: false } };
const projectParams = { params: Promise.resolve({ projectId: "p1" }) };

function makePostRequest(body: unknown) {
  return new Request("http://localhost/api/projects/p1/members", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/projects/[projectId]/members", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost"), projectParams);
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-project-admin", async () => {
    mockAuth.mockResolvedValue(session);
    mockIsAdmin.mockResolvedValue(false);
    const res = await GET(new Request("http://localhost"), projectParams);
    expect(res.status).toBe(403);
  });

  it("returns member list for project admin", async () => {
    mockAuth.mockResolvedValue(session);
    mockIsAdmin.mockResolvedValue(true);
    mockDb.projectMember.findMany.mockResolvedValue([
      {
        userId: "u2",
        role: "MEMBER",
        createdAt: new Date("2024-01-01"),
        user: { name: "Bob", email: "bob@example.com" },
      },
    ]);
    const res = await GET(new Request("http://localhost"), projectParams);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.members).toHaveLength(1);
    expect(data.members[0].email).toBe("bob@example.com");
  });
});

describe("POST /api/projects/[projectId]/members", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makePostRequest({ userId: "u2", role: "MEMBER" }), projectParams);
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-project-admin", async () => {
    mockAuth.mockResolvedValue(session);
    mockIsAdmin.mockResolvedValue(false);
    const res = await POST(makePostRequest({ userId: "u2", role: "MEMBER" }), projectParams);
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid payload", async () => {
    mockAuth.mockResolvedValue(session);
    mockIsAdmin.mockResolvedValue(true);
    const res = await POST(makePostRequest({ userId: "u2", role: "INVALID" }), projectParams);
    expect(res.status).toBe(400);
  });

  it("returns 404 when user does not exist", async () => {
    mockAuth.mockResolvedValue(session);
    mockIsAdmin.mockResolvedValue(true);
    mockDb.user.findUnique.mockResolvedValue(null);
    const res = await POST(makePostRequest({ userId: "u99", role: "MEMBER" }), projectParams);
    expect(res.status).toBe(404);
  });

  it("returns 409 when already a member", async () => {
    mockAuth.mockResolvedValue(session);
    mockIsAdmin.mockResolvedValue(true);
    mockDb.user.findUnique.mockResolvedValue({ id: "u2" });
    mockDb.projectMember.findUnique.mockResolvedValue({ id: "pm1" });
    const res = await POST(makePostRequest({ userId: "u2", role: "MEMBER" }), projectParams);
    expect(res.status).toBe(409);
  });

  it("returns 201 on success", async () => {
    mockAuth.mockResolvedValue(session);
    mockIsAdmin.mockResolvedValue(true);
    mockDb.user.findUnique.mockResolvedValue({ id: "u2" });
    mockDb.projectMember.findUnique.mockResolvedValue(null);
    mockDb.$transaction.mockResolvedValue([{}, {}]);
    const res = await POST(makePostRequest({ userId: "u2", role: "MEMBER" }), projectParams);
    expect(res.status).toBe(201);
  });
});
