import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: vi.fn() },
    workspaceSettings: { findFirst: vi.fn() },
  },
}));
vi.mock("@/lib/projects", () => ({ userIsProjectAdmin: vi.fn() }));

import { GET } from "./route";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { userIsProjectAdmin } from "@/lib/projects";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockIsAdmin = userIsProjectAdmin as ReturnType<typeof vi.fn>;
const mockDb = db as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn> };
  workspaceSettings: { findFirst: ReturnType<typeof vi.fn> };
};

const session = { user: { id: "u1" } };
const projectParams = { params: Promise.resolve({ projectId: "p1" }) };

function makeRequest(email: string) {
  return new Request(`http://localhost/api/projects/p1/members/lookup?email=${encodeURIComponent(email)}`);
}

describe("GET /api/projects/[projectId]/members/lookup", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(makeRequest("a@b.com"), projectParams);
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-project-admin", async () => {
    mockAuth.mockResolvedValue(session);
    mockIsAdmin.mockResolvedValue(false);
    const res = await GET(makeRequest("a@b.com"), projectParams);
    expect(res.status).toBe(403);
  });

  it("returns 400 when email param is missing", async () => {
    mockAuth.mockResolvedValue(session);
    mockIsAdmin.mockResolvedValue(true);
    const res = await GET(new Request("http://localhost/api/projects/p1/members/lookup"), projectParams);
    expect(res.status).toBe(400);
  });

  it("returns found:true with user when email matches", async () => {
    mockAuth.mockResolvedValue(session);
    mockIsAdmin.mockResolvedValue(true);
    mockDb.user.findUnique.mockResolvedValue({ id: "u2", name: "Bob", email: "bob@example.com" });
    const res = await GET(makeRequest("bob@example.com"), projectParams);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.found).toBe(true);
    expect(data.user.id).toBe("u2");
  });

  it("returns found:false with openRegistration:false when user not found and registration closed", async () => {
    mockAuth.mockResolvedValue(session);
    mockIsAdmin.mockResolvedValue(true);
    mockDb.user.findUnique.mockResolvedValue(null);
    mockDb.workspaceSettings.findFirst.mockResolvedValue({ openRegistration: false });
    const res = await GET(makeRequest("nobody@example.com"), projectParams);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.found).toBe(false);
    expect(data.openRegistration).toBe(false);
  });

  it("returns found:false with openRegistration:true when user not found and registration open", async () => {
    mockAuth.mockResolvedValue(session);
    mockIsAdmin.mockResolvedValue(true);
    mockDb.user.findUnique.mockResolvedValue(null);
    mockDb.workspaceSettings.findFirst.mockResolvedValue({ openRegistration: true });
    const res = await GET(makeRequest("nobody@example.com"), projectParams);
    const data = await res.json();
    expect(data.found).toBe(false);
    expect(data.openRegistration).toBe(true);
  });

  it("defaults openRegistration to false when workspaceSettings row is null", async () => {
    mockAuth.mockResolvedValue(session);
    mockIsAdmin.mockResolvedValue(true);
    mockDb.user.findUnique.mockResolvedValue(null);
    mockDb.workspaceSettings.findFirst.mockResolvedValue(null);
    const res = await GET(makeRequest("nobody@example.com"), projectParams);
    const data = await res.json();
    expect(data.openRegistration).toBe(false);
  });

  it("normalizes email to lowercase before lookup", async () => {
    mockAuth.mockResolvedValue(session);
    mockIsAdmin.mockResolvedValue(true);
    mockDb.user.findUnique.mockResolvedValue({ id: "u2", name: "Bob", email: "bob@example.com" });
    await GET(makeRequest("BOB@EXAMPLE.COM"), projectParams);
    expect(mockDb.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "bob@example.com" } })
    );
  });
});
