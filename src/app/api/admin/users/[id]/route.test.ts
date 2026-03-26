import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { DELETE, PATCH } from "./route";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockDb = db as unknown as {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

const adminSession = { user: { id: "admin1", isWorkspaceAdmin: true } };
const memberSession = { user: { id: "member1", isWorkspaceAdmin: false } };

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/admin/users/someId", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("DELETE /api/admin/users/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await DELETE(new Request("http://localhost"), makeParams("u2"));
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin", async () => {
    mockAuth.mockResolvedValue(memberSession);
    const res = await DELETE(new Request("http://localhost"), makeParams("u2"));
    expect(res.status).toBe(403);
  });

  it("returns 400 when admin tries to remove themselves", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const res = await DELETE(new Request("http://localhost"), makeParams("admin1"));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/yourself/i);
  });

  it("returns 404 when target user not found", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockDb.user.findUnique.mockResolvedValue(null);
    const res = await DELETE(new Request("http://localhost"), makeParams("ghost"));
    expect(res.status).toBe(404);
  });

  it("returns 400 when removing the last workspace admin", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockDb.user.findUnique.mockResolvedValue({ isWorkspaceAdmin: true });
    mockDb.user.count.mockResolvedValue(1);

    const res = await DELETE(new Request("http://localhost"), makeParams("u2"));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/last/i);
  });

  it("deletes user when all guards pass", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockDb.user.findUnique.mockResolvedValue({ isWorkspaceAdmin: false });
    mockDb.user.delete.mockResolvedValue({});

    const res = await DELETE(new Request("http://localhost"), makeParams("u2"));
    expect(res.status).toBe(200);
    expect(mockDb.user.delete).toHaveBeenCalledWith({ where: { id: "u2" } });
  });

  it("allows removing an admin when multiple admins exist", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockDb.user.findUnique.mockResolvedValue({ isWorkspaceAdmin: true });
    mockDb.user.count.mockResolvedValue(2);
    mockDb.user.delete.mockResolvedValue({});

    const res = await DELETE(new Request("http://localhost"), makeParams("u2"));
    expect(res.status).toBe(200);
  });
});

describe("PATCH /api/admin/users/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PATCH(makeRequest({}), makeParams("u2"));
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin", async () => {
    mockAuth.mockResolvedValue(memberSession);
    const res = await PATCH(makeRequest({}), makeParams("u2"));
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid payload", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const res = await PATCH(makeRequest({ isWorkspaceAdmin: "yes" }), makeParams("u2"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when target user not found", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockDb.user.findUnique.mockResolvedValue(null);
    const res = await PATCH(makeRequest({ isWorkspaceAdmin: false }), makeParams("ghost"));
    expect(res.status).toBe(404);
  });

  it("returns 400 when demoting the last workspace admin", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockDb.user.findUnique.mockResolvedValue({ isWorkspaceAdmin: true });
    mockDb.user.count.mockResolvedValue(1);

    const res = await PATCH(makeRequest({ isWorkspaceAdmin: false }), makeParams("u2"));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/last/i);
  });

  it("promotes user to admin", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockDb.user.findUnique.mockResolvedValue({ isWorkspaceAdmin: false });
    const updated = { id: "u2", isWorkspaceAdmin: true };
    mockDb.user.update.mockResolvedValue(updated);

    const res = await PATCH(makeRequest({ isWorkspaceAdmin: true }), makeParams("u2"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.isWorkspaceAdmin).toBe(true);
  });

  it("demotes admin when multiple admins exist", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockDb.user.findUnique.mockResolvedValue({ isWorkspaceAdmin: true });
    mockDb.user.count.mockResolvedValue(2);
    mockDb.user.update.mockResolvedValue({ id: "u2", isWorkspaceAdmin: false });

    const res = await PATCH(makeRequest({ isWorkspaceAdmin: false }), makeParams("u2"));
    expect(res.status).toBe(200);
  });
});
