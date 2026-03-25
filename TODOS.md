# TODOS

Items deferred from `/plan-ceo-review` on 2026-03-24.
Source plan: v1 REST API — Full CRUD Expansion (21 endpoints).

---

## P2 — E2E Test: Admin Invite + Forced Password Reset Flow

**What:** End-to-end test covering the full admin invite journey: admin creates a user
account → user logs in with the temp password → middleware redirects to `/change-password`
→ user sets a new password → signs out → re-logs in successfully with the new credentials.

**Why:** Unit tests cover each route in isolation (POST /api/admin/users, PATCH
/api/auth/change-password), but no test verifies the complete JWT-through-middleware
integration. A shape mismatch between `auth.ts` callbacks and the middleware session
check would pass all unit tests but fail in the browser. This flow is high-value and
straightforward to automate.

**Where to start:** Set up Playwright (`npm install -D @playwright/test`, add
`playwright.config.ts`). Write one spec file: `e2e/admin-invite.spec.ts`. Seed DB
with a workspace admin account, run the full flow, assert that the /dashboard is
reachable after password reset with the new credentials.

**Effort:** M (human: ~4h setup + test / CC: ~15min)
**Depends on:** Admin invite + forced password reset feature shipped (see design doc
`dnpi-master-design-20260325-150025.md`)

---

## P2 — Webhooks

**What:** Emit HTTP POST events to a caller-configured URL when key events happen
(`run.completed`, `test_case.created`, `suite.updated`, etc.), with HMAC-SHA256
signature verification and retry-with-backoff.

**Why:** Eliminates polling for event-driven integrations. Enables Slack notifications,
Jira ticket updates, and downstream pipeline triggers without writing polling loops.
Transforms itgrate from a data store into an event source.

**Where to start:** Add a `Webhook` model to the schema (`projectId`, `url`, `secret`,
`events: String[]`). Add a `WebhookDelivery` model for delivery tracking. On each
triggering event, queue a delivery. Delivery worker: HTTP POST with body +
`X-Itgrate-Signature: sha256=<HMAC>`. Retry up to 3× with exponential backoff.

**Effort:** L (human: ~1 week / CC: ~2 hours)
**Depends on:** v1 API shipped and in active use

---

## P2 — OpenAPI Spec + Interactive Docs

**What:** Generate `openapi.yaml` from the working v1 implementation (21 endpoints),
serve an interactive playground at `/api/v1/docs` (Scalar or Swagger UI).

**Why:** Enables SDK auto-generation in any language, gives integrators a testable
playground, and creates a formal contract for breaking-change detection in CI.

**Where to start:** After endpoints are stable, use `zod-to-openapi` or
`next-openapi-route-handler` to generate the spec from existing Zod schemas.
Alternatively, hand-write the spec post-shipping and validate it against live responses.

**Effort:** M (human: ~3 days / CC: ~1 hour)
**Depends on:** v1 API shipped and stable (all 21 endpoints)

---

## P3 — Rate Limiting

**What:** Cap requests per API key per minute (e.g. 100 req/min) using a Redis-backed
counter or Vercel edge middleware. Return 429 with a `Retry-After` header on violation.

**Why:** Without rate limiting, a single misbehaving CI pipeline can exhaust the
Postgres connection pool for all users. API keys are tied to known owners so abuse is
traceable today, but that's reactive not preventive.

**Where to start:** Evaluate `@upstash/ratelimit` (Redis-based, Vercel-compatible)
vs an in-process token-bucket counter. The `resolveApiKey()` function in
`src/lib/api-auth.ts` is the right place for public API checks. Also apply to
`/api/admin/*` routes (scope: admin-only, so lower urgency than public API).

**Effort:** M (human: ~1 day / CC: ~30 min)
**Trigger:** Add when active abuse patterns are observable in production logs.

---

## P3 — Personal Access Tokens (PATs)

**What:** Replace HTTP Basic Auth on `/api/v1/projects` and `/api/v1/api-keys` with
user-scoped PATs — long-lived tokens independent of the user's password, manageable
via UI, rotatable without a password change.

**Why:** Basic Auth is tied to login credentials. If itgrate supports team accounts,
service accounts, or SSO, Basic Auth becomes a security liability (shared email+password
for CI pipelines). PATs decouple automation credentials from personal logins.

**Where to start:** New `PersonalAccessToken` model (userId, name, tokenHash, scope,
lastUsedAt, expiresAt). UI in settings panel to create/revoke. Update `resolveBasicAuth`
to also accept PAT Bearer tokens. Backward-compatible — existing Basic Auth continues
to work during migration.

**Trigger:** If teams start sharing email+password credentials for CI/CD pipelines,
that's the signal to prioritize this.

**Effort:** L (human: ~1 week / CC: ~1 hour)

---

## P3 — Admin API JWT Re-validation

**What:** Add per-request DB re-validation to `/api/admin/*` routes. Currently, these
routes check `session.user.isWorkspaceAdmin` from the JWT. A demoted or deleted admin
retains access until their JWT expires. Per-request check:
`const user = await db.user.findUnique({ where: { id }, select: { isWorkspaceAdmin: true } })`

**Why:** JWT staleness is an accepted trade-off in the RBAC v1 plan, but it means a
demoted admin has a window of continued access. The window equals the JWT expiry duration.

**Pros:** Immediate effect on demotion/deletion. Closes the staleness window.
**Cons:** One extra DB query per admin API request. Low impact at self-hosted scale.
**Context:** Deferred from RBAC v1 as accepted trade-off. Documented in the RBAC design
doc. Low urgency — admin routes are admin-only and self-hosted instances rarely have
concurrent admins being demoted.

**Effort:** S (human: ~2 hours / CC: ~10 min)
**Trigger:** When a scenario requiring immediate admin demotion effect is reported.
