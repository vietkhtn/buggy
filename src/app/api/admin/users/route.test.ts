import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/password", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed"),
}));

vi.mock("crypto", () => ({
  randomBytes: vi.fn(() => ({ toString: () => "tmp-password-123" })),
}));

import { GET, POST } from "./route";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockDb = db as unknown as {
  user: { findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
};

const adminSession = { user: { id: "u1", isWorkspaceAdmin: true } };
const memberSession = { user: { id: "u2", isWorkspaceAdmin: false } };

describe("GET /api/admin/users", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin", async () => {
    mockAuth.mockResolvedValue(memberSession);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns user list for workspace admin", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const users = [
      {
        id: "u1",
        name: "Alice",
        email: "alice@example.com",
        isWorkspaceAdmin: true,
        createdAt: new Date("2024-01-01"),
        _count: { projects: 2 },
      },
    ];
    mockDb.user.findMany.mockResolvedValue(users);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].email).toBe("alice@example.com");
  });
});

const newUser = {
  id: "u99",
  name: "Bob",
  email: "bob@example.com",
  isWorkspaceAdmin: false,
  mustChangePassword: true,
  createdAt: new Date("2024-06-01"),
  _count: { projects: 0 },
};

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/users", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makeRequest({ email: "bob@example.com" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin", async () => {
    mockAuth.mockResolvedValue(memberSession);
    const res = await POST(makeRequest({ email: "bob@example.com" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid email", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const res = await POST(makeRequest({ email: "not-an-email" }));
    expect(res.status).toBe(400);
  });

  it("returns 409 for duplicate email", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const { Prisma } = await import("@prisma/client");
    const dupError = new Prisma.PrismaClientKnownRequestError("Unique constraint", {
      code: "P2002",
      clientVersion: "5.0.0",
    });
    mockDb.user.create.mockRejectedValue(dupError);
    const res = await POST(makeRequest({ email: "bob@example.com" }));
    expect(res.status).toBe(409);
  });

  it("returns 201 with user and tempPassword on success", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockDb.user.create.mockResolvedValue(newUser);
    const res = await POST(makeRequest({ email: "bob@example.com", name: "Bob" }));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.user.email).toBe("bob@example.com");
    expect(data.user.mustChangePassword).toBe(true);
    expect(typeof data.tempPassword).toBe("string");
  });
});
