# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev              # Next.js dev server
npm run build            # Production build
npm run lint             # ESLint
npx tsc --noEmit         # TypeScript check

# Database (Prisma)
npx prisma generate      # Regenerate client after schema changes
npx prisma db push       # Sync schema to DB (no migration files)
npx prisma studio        # GUI browser

# Testing (Vitest)
npx vitest run                              # All tests
npx vitest run src/lib/foo.test.ts          # Single file
npx vitest run --grep "pattern"             # By pattern
npx vitest run --coverage                   # With coverage
```

## Local Development Setup

1. Copy `.env.example` to `.env`
2. Start DB: `docker compose -f docker-compose.dev.yml up -d`
3. Run `npx prisma generate && npx prisma db push`
4. Run `npm run dev`

For full stack (DB + app + migrations): `docker compose up --build -d`

## Architecture

**Next.js App Router** with server components by default. `"use client"` only for interactive components (useState, useEffect, browser hooks).

```
src/
├── app/
│   ├── page.tsx / login/ / register/   # Auth pages
│   ├── dashboard/[projectId]/          # Per-project routes (tests, metrics, settings)
│   ├── (report)/report/runs/[runId]/   # Print-friendly report route group
│   └── api/
│       ├── v1/runs/                    # Public REST API (API key auth)
│       ├── auth/                       # NextAuth + registration
│       └── ...                         # Internal CRUD routes
├── components/
│   ├── ui/                             # Base UI wrappers (Button, Dialog, etc.)
│   ├── tests-panel.tsx                 # Manual test execution UI
│   ├── metrics-panel.tsx               # Dashboard charts
│   └── active-run-panel.tsx / run-report.tsx / settings-panel.tsx
├── lib/
│   ├── db.ts                           # Prisma singleton — always import from here
│   ├── auth.ts                         # NextAuth v5 config (JWT strategy)
│   ├── projects.ts                     # ensureProjectForUser() — auto-provisions on first login
│   ├── flaky-detection.ts              # Flaky test detection across last 5 runs
│   ├── failure-category.ts             # Failure categorization logic
│   ├── junit.ts                        # JUnit XML parsing
│   └── test-case-ids.ts                # TC-0001 style ID generation
├── types/                              # Shared TypeScript types
prisma/schema.prisma                    # Single source of truth for DB schema
```

## Key Patterns

### Auth & Authorization
- `await auth()` in server components to get the session
- Always verify the user is a `ProjectMember` before any project mutation
- `src/auth.ts` uses credentials (email/password + bcrypt) with JWT sessions
- Public API (`/api/v1/runs`) uses bearer API keys hashed in the `api_keys` table

### Data Model Highlights
- `Project` has `testCasePrefix` + `testCaseCounter` for sequential display IDs (e.g. `TC-0001`)
- `TestRun` has `source: MANUAL | AUTOMATED` and `status: IN_PROGRESS | COMPLETED | ABORTED`
- `TestResult` links to optional `TestCase` (manual) and has `FailureCategory` enum for automated failures
- `TestSuite` is an ordered collection of `TestCase` records (via `TestSuiteCase` junction)
- Feature flags `ENABLE_SESSION_TESTING` and `ENABLE_RELEASE_TRACKING` gate UI sections

### Styling & UI
- Tailwind CSS v4 for all styling; use `cn()` from `@/lib/utils` for conditional classes
- UI primitives from `@base-ui/react`, wrapped in `src/components/ui/`
- Forms: `react-hook-form` + `@hookform/resolvers/zod`
- Notifications: `toast()` from `sonner`
- Charts: `recharts`

### Naming Conventions
- Files/dirs: `kebab-case`
- Components: `PascalCase`
- Functions/vars: `camelCase`
- DB tables: `snake_case` via `@@map()`
- Enums: `SCREAMING_SNAKE_CASE`

### API Routes
- Internal: `src/app/api/<resource>/route.ts` — session-authenticated
- Public v1: `src/app/api/v1/<resource>/route.ts` — API key authenticated
- Zod for request validation; return `NextResponse.json({ error }, { status })` on failures

## Environment Variables

Required in `.env`:
- `DATABASE_URL` — PostgreSQL connection string
- `AUTH_SECRET` — NextAuth secret (`openssl rand -base64 32`)
- `NEXTAUTH_URL` — App URL (default: `http://localhost:3000`)
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` — used by docker-compose

Feature flags (default `false`): `ENABLE_SESSION_TESTING`, `ENABLE_RELEASE_TRACKING`

## Commit Style

Follow [gitmoji](https://gitmoji.dev/) + imperative mood. Branch naming: `feature/<description>` or `fix/<issue-number>`.
