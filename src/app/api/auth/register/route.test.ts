import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlags: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { POST } from "./route";
import { getFeatureFlags } from "@/lib/feature-flags";
import { db } from "@/lib/db";

const mockGetFeatureFlags = getFeatureFlags as ReturnType<typeof vi.fn>;
const mockDb = db as unknown as {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/register — openRegistration gate (REGRESSION)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when openRegistration is false", async () => {
    mockGetFeatureFlags.mockResolvedValue({
      openRegistration: false,
      enableSessionTesting: false,
      enableReleaseTracking: false,
    });

    const res = await POST(
      makeRequest({ email: "new@example.com", password: "password123" })
    );
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toMatch(/not open/i);
  });

  it("does not touch the DB when registration is closed", async () => {
    mockGetFeatureFlags.mockResolvedValue({ openRegistration: false });

    await POST(makeRequest({ email: "new@example.com", password: "password123" }));
    expect(mockDb.user.findUnique).not.toHaveBeenCalled();
    expect(mockDb.user.create).not.toHaveBeenCalled();
  });

  it("allows registration when openRegistration is true", async () => {
    mockGetFeatureFlags.mockResolvedValue({
      openRegistration: true,
      enableSessionTesting: false,
      enableReleaseTracking: false,
    });
    mockDb.user.findUnique.mockResolvedValue(null);
    mockDb.user.create.mockResolvedValue({
      id: "new-user",
      email: "new@example.com",
      name: null,
    });

    const res = await POST(
      makeRequest({ email: "new@example.com", password: "password123" })
    );
    expect(res.status).toBe(201);
  });

  it("returns 400 for invalid payload even when registration is open", async () => {
    mockGetFeatureFlags.mockResolvedValue({ openRegistration: true });

    const res = await POST(makeRequest({ email: "not-an-email", password: "x" }));
    expect(res.status).toBe(400);
  });

  it("returns 409 for duplicate email when registration is open", async () => {
    mockGetFeatureFlags.mockResolvedValue({ openRegistration: true });
    mockDb.user.findUnique.mockResolvedValue({ id: "existing" });

    const res = await POST(
      makeRequest({ email: "existing@example.com", password: "password123" })
    );
    expect(res.status).toBe(409);
  });
});
