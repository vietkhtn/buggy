import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      count: vi.fn().mockResolvedValue(1),
    },
  },
}));

import { middleware } from "./middleware";
import { auth } from "@/auth";

const mockAuth = auth as ReturnType<typeof vi.fn>;

function makeRequest(pathname: string) {
  return new NextRequest(new URL(`http://localhost${pathname}`));
}

const adminSession = { user: { id: "u1", isWorkspaceAdmin: true, mustChangePassword: false } };
const memberSession = { user: { id: "u2", isWorkspaceAdmin: false, mustChangePassword: false } };
const mustChangeSession = { user: { id: "u3", isWorkspaceAdmin: false, mustChangePassword: true } };

describe("middleware — mustChangePassword gate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redirects to /change-password when mustChangePassword=true and not already there", async () => {
    mockAuth.mockResolvedValue(mustChangeSession);
    const res = await middleware(makeRequest("/dashboard"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/change-password");
  });

  it("does NOT redirect when already on /change-password", async () => {
    mockAuth.mockResolvedValue(mustChangeSession);
    const res = await middleware(makeRequest("/change-password"));
    expect(res.status).toBe(200);
  });

  it("does NOT redirect when mustChangePassword=false", async () => {
    mockAuth.mockResolvedValue(memberSession);
    const res = await middleware(makeRequest("/dashboard"));
    expect(res.status).toBe(200);
  });

  it("redirects admin away from /admin when not workspace admin", async () => {
    mockAuth.mockResolvedValue(memberSession);
    const res = await middleware(makeRequest("/admin"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/dashboard");
  });

  it("allows workspace admin to access /admin", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const res = await middleware(makeRequest("/admin"));
    expect(res.status).toBe(200);
  });
});
