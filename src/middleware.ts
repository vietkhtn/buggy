export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

// Set-once cache: once a workspace admin exists, it's permanent (last-admin guard
// prevents deleting the only admin). No TTL needed.
let setupComplete = false;

// Paths that bypass all redirect rules
const PUBLIC_PATHS = new Set(["/login", "/api/auth"]);
const SETUP_PATHS = new Set(["/setup", "/setup/settings"]);
const SETUP_API_PATHS = new Set(["/api/setup"]);
const STATIC_PREFIXES = ["/_next/", "/favicon.ico", "/api/auth/"];
const CHANGE_PASSWORD_PATH = "/change-password";

function isStaticOrPublic(pathname: string): boolean {
  if (STATIC_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  if (PUBLIC_PATHS.has(pathname)) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow static assets and auth routes
  if (isStaticOrPublic(pathname)) return NextResponse.next();

  // Check setup completion (set-once cache)
  if (!setupComplete) {
    const adminCount = await db.user.count({ where: { isWorkspaceAdmin: true } });
    if (adminCount > 0) setupComplete = true;
  }

  // Setup gate: if no workspace admin exists, redirect everything to /setup
  // (except /setup itself, /setup/settings, and the setup API)
  if (!setupComplete) {
    if (
      !SETUP_PATHS.has(pathname) &&
      !SETUP_API_PATHS.has(pathname)
    ) {
      return NextResponse.redirect(new URL("/setup", request.url));
    }
    return NextResponse.next();
  }

  // Setup lockout: /setup (step 1 only) is inaccessible once setup is done.
  // /setup/settings is NOT locked out — needed for the wizard flow after step 1.
  if (pathname === "/setup") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // JWT decode — no DB call; runs once for both admin guard + mustChangePassword gate
  const session = await auth();

  // Admin guard: /admin/** requires isWorkspaceAdmin in session
  if (pathname.startsWith("/admin")) {
    if (!session?.user?.isWorkspaceAdmin) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // mustChangePassword gate: redirect everywhere except /change-password itself
  if (session?.user?.mustChangePassword && pathname !== CHANGE_PASSWORD_PATH) {
    return NextResponse.redirect(new URL(CHANGE_PASSWORD_PATH, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
