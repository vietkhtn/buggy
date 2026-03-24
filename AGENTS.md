# AGENTS.md - Repository Guide for AI Agents

Welcome to the **Buggy** repository. This document provides essential information on the project's structure, coding standards, and common commands to help you navigate and contribute effectively.

---

## 1. Build, Lint, and Test Commands

### Development and Build
- **Start Development Server**: `npm run dev` (Starts Next.js in development mode)
- **Build for Production**: `npm run build` (Compiles the application)
- **Start Production Server**: `npm run start` (Runs the compiled app)

### Linting and Type Checking
- **Run Linter**: `npm run lint` (Executes ESLint via `eslint-config-next`)
- **Type Check**: `npx tsc --noEmit` (Manually trigger TypeScript verification)

### Database (Prisma)
- **Generate Client**: `npx prisma generate` (Updates `@prisma/client` types)
- **Push Schema**: `npx prisma db push` (Syncs schema to database without formal migrations—preferred for rapid dev)
- **Prisma Studio**: `npx prisma studio` (GUI for browsing local data)
- **Check DB**: `node dist/check-db.js` (A utility script to check database connectivity)

### Running Tests
Tests use **Vitest**. Test files are colocated with source: `*.test.ts` or `*.spec.ts`.

- **Run All Tests**: `npx vitest run`
- **Run Tests in Watch Mode**: `npx vitest`
- **Run a Single Test File**: `npx vitest run src/lib/failure-category.test.ts`
- **Run Tests Matching a Pattern**: `npx vitest run --grep "flaky"`
- **Run Tests with Coverage**: `npx vitest run --coverage` (requires `@vitest/coverage-v8`)

---

## 2. Code Style Guidelines

### General Principles
- **Server Components First**: Prefer Next.js Server Components. Use `"use client"` only for components requiring interactivity or browser-only hooks (`useState`, `useEffect`, etc.).
- **Tailwind CSS**: Use Tailwind for all styling.
- **Base UI Components**: Use `@base-ui/react` for primitives (Button, Dialog, etc.) located in `src/components/ui/`. Custom wrapper components are built on top of Base UI primitives.
- **Consistency**: Mimic the style (indentation, naming) of surrounding code.

### Naming Conventions
| Type | Convention | Example |
|------|-----------|---------|
| Directories | `kebab-case` | `src/app/api/v1` |
| Files | `kebab-case.ts` / `.tsx` | `test-case-ids.ts`, `metrics-panel.tsx` |
| Functions/Variables | `camelCase` | `ensureProjectForUser`, `deriveTestCasePrefix` |
| Components | `PascalCase` | `TestsPanel`, `CopyProjectId` |
| Database Models | `PascalCase` in Prisma | `model TestCase` |
| Database Tables | `snake_case` via `@@map` | `@@map("test_cases")` |
| Enums | `SCREAMING_SNAKE_CASE` | `ResultStatus.PASSED` |

### Imports and Path Aliases
- Use `@/` alias for absolute imports from `src/`.
- **Import Order**:
  1. React/Next.js core (`"use client"`, `next/server`)
  2. External dependencies (`zod`, `lucide-react`, `bcryptjs`, `date-fns`)
  3. Shared UI primitives (`@/components/ui/...`)
  4. Business logic/hooks (`@/lib/...`, `@/auth`)

```typescript
// Example import order
import { useState } from "react";
import { XIcon } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
```

### Types and Interfaces
- **TypeScript**: Mandatory. Avoid `any`. Use `unknown` if truly unknown.
- **Zod**: Use for API request/response validation (import `z from "zod"`).
- **Prisma Types**: Import generated types: `import type { Project } from "@prisma/client"`.
- **Shared Types**: Place in `src/types/` (e.g., `src/types/next-auth.d.ts`).

### Error Handling
- **Async Operations**: Always wrap in `try-catch` blocks for database or network calls.
- **Logging**: Use `console.error` with context: `console.error("Error in ensureProjectForUser:", { userId, error })`.
- **API Responses**: Return structured errors from API handlers:
  ```typescript
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  ```
- **Zod Errors**: Handle validation errors specifically:
  ```typescript
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: "Invalid payload.", issues: error.issues }, { status: 400 });
  }
  ```

### Data Access (Prisma)
- **Client**: Use the singleton `db` exported from `@/lib/db`.
- **Permissions**: Always check if a user belongs to a project before mutations.
- **Database Migrations**: Prefer `npx prisma db push` for local dev; ensure `npx prisma generate` is run after schema changes.

---

## 3. Project Structure Overview

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx            # Landing/login
│   ├── layout.tsx          # Root layout
│   ├── dashboard/          # Main application routes
│   └── api/v1/             # REST API endpoints
├── components/
│   ├── ui/                 # Base UI component wrappers (Button, Dialog, etc.)
│   ├── auth/               # Login/Register components
│   ├── tests-panel.tsx     # Manual test execution UI
│   └── metrics-panel.tsx   # Dashboard visualizations
├── lib/
│   ├── db.ts               # Prisma client singleton
│   ├── auth.ts             # Auth.js (NextAuth) configuration
│   ├── projects.ts         # Project management logic
│   ├── flaky-detection.ts   # Flaky test detection
│   ├── failure-category.ts  # Failure categorization
│   ├── junit.ts            # JUnit XML parsing
│   ├── test-case-ids.ts     # ID generation strategy
│   └── utils.ts            # Shared utilities (cn helper)
└── types/                  # Shared TypeScript types
prisma/
└── schema.prisma           # Database schema (single source of truth)
dist/                        # Compiled scripts and manual tests
```

---

## 4. Key Workflows

### Authentication
- Uses `next-auth` v5 beta with Prisma adapter.
- Configured in `src/auth.ts` and `src/app/api/auth/[...nextauth]/route.ts`.
- Use `await auth()` in server components to check for active session.

### Manual Test Execution
- Managed in `src/components/tests-panel.tsx`.
- Test runs create `TestRun` and `TestResult` records.
- JUnit XML ingestion handled in `src/app/api/v1/runs/route.ts`.

### Project Provisioning
- Handled in `src/lib/projects.ts`.
- Every user gets a default project on first login via `ensureProjectForUser`.
- Test case IDs (e.g., `TC-0001`) are prefixed by project name.

---

## 5. Commit Guidelines
- Follow [gitmoji](https://gitmoji.dev/) conventions:
  - ✨ `add` — New feature
  - 🐛 `fix` — Bug fix
  - ♻️ `refactor` — Code cleanup
  - 📝 `docs` — Documentation
- Use imperative mood: "Add feature" not "Added feature"
- Reference issues when applicable: `fixes #123`

---

## 6. UI Component Patterns

### Button Component
Uses `@base-ui/react` with CVA for variants:
```typescript
import { Button } from "@/components/ui/button";
// Variants: default, outline, secondary, ghost, destructive, link
// Sizes: default, xs, sm, lg, icon, icon-xs, icon-sm, icon-lg
<Button variant="default" size="default">Save</Button>
```

### Dialog Component
Exports all sub-components for flexible composition:
```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
```

### Form Patterns
- Use `react-hook-form` with `@hookform/resolvers` and `zod`.
- Colocate form schemas with the component or in `src/lib/schemas/`.
- Use `toast` from `sonner` for notifications.

---

*This guide is for AI agents. Please update it when introducing new frameworks or changing core architectural patterns.*
