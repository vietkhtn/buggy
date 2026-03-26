import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/password", () => ({ hashPassword: vi.fn().mockResolvedValue("hashed") }));
vi.mock("crypto", () => ({ randomBytes: vi.fn(() => ({ toString: () => "tmp-reset-pw" })) }));

import { POST } from "./route";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockDb = db as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  auditLog: { create: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

const adminSession = { user: { id: "admin1", isWorkspaceAdmin: true } };
const memberSession = { user: { id: "u2", isWorkspaceAdmin: false } };

function makeRequest(targetId: string) {
  return new Request(`http://localhost/api/admin/users/${targetId}/reset-password`, {
    method: "POST",
  });
}

describe("POST /api/admin/users/:id/reset-password", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makeRequest("u99"), { params: Promise.resolve({ id: "u99" }) });
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin", async () => {
    mockAuth.mockResolvedValue(memberSession);
    const res = await POST(makeRequest("u99"), { params: Promise.resolve({ id: "u99" }) });
    expect(res.status).toBe(403);
  });

  it("returns 400 when resetting own password", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const res = await POST(makeRequest("admin1"), { params: Promise.resolve({ id: "admin1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 404 when user not found", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockDb.user.findUnique.mockResolvedValue(null);
    const res = await POST(makeRequest("u99"), { params: Promise.resolve({ id: "u99" }) });
    expect(res.status).toBe(404);
  });

  it("returns 200 with tempPassword on success", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockDb.user.findUnique.mockResolvedValue({ id: "u99" });
    mockDb.$transaction.mockResolvedValue([{}, {}]);
    const res = await POST(makeRequest("u99"), { params: Promise.resolve({ id: "u99" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data.tempPassword).toBe("string");
  });
});
