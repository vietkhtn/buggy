import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/password", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed"),
}));

vi.mock("@/lib/projects", () => ({
  ensureProjectForUser: vi.fn().mockResolvedValue(null),
}));

import { PATCH } from "./route";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockDb = db as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
};

const session = { user: { id: "u1", isWorkspaceAdmin: false, mustChangePassword: true } };
const dbUser = { id: "u1", email: "alice@example.com" };

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/auth/change-password", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/auth/change-password", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PATCH(makeRequest({ password: "newpassword" }));
    expect(res.status).toBe(401);
  });

  it("returns 401 when user no longer exists in DB (stale JWT)", async () => {
    mockAuth.mockResolvedValue(session);
    mockDb.user.findUnique.mockResolvedValue(null);
    const res = await PATCH(makeRequest({ password: "newpassword" }));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Session invalid");
  });

  it("returns 400 when password is too short", async () => {
    mockAuth.mockResolvedValue(session);
    const res = await PATCH(makeRequest({ password: "short" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when password is too long", async () => {
    mockAuth.mockResolvedValue(session);
    const res = await PATCH(makeRequest({ password: "a".repeat(129) }));
    expect(res.status).toBe(400);
  });

  it("returns 200 and updates password on success", async () => {
    mockAuth.mockResolvedValue(session);
    mockDb.user.findUnique.mockResolvedValue(dbUser);
    mockDb.user.update.mockResolvedValue({ ...dbUser, mustChangePassword: false });
    const res = await PATCH(makeRequest({ password: "newpassword" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(mockDb.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "u1" },
        data: expect.objectContaining({ mustChangePassword: false }),
      })
    );
  });
});
