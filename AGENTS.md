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
There is no formal test suite (like Jest/Vitest) currently configured in `package.json`. However:
- **Run Single Script/Test**: Use `ts-node` to execute any `.ts` file:
  ```bash
  npx ts-node src/lib/some-test.ts
  ```
- **Manual Verification Scripts**: Several utility and test scripts exist in `dist/` which can be run with `node`:
  - `dist/test-registration-flow.js`: Tests the user registration and project auto-provisioning.
  - `dist/test-project-creation.js`: Verifies project creation logic.
  - `dist/create-test-user.js`: Utility to seed a test user.

---

## 2. Code Style Guidelines

### General Principles
- **Server Components First**: Prefer Next.js Server Components. Use `"use client"` only for components requiring interactivity or browser-only hooks (`useState`, `useEffect`, etc.).
- **Tailwind CSS**: Use Tailwind for all styling. Rely on **shadcn/ui** primitives located in `src/components/ui`.
- **Consistency**: Mimic the style (indentation, naming) of surrounding code.

### Naming Conventions
- **Directories**: `kebab-case` (e.g., `src/app/api/v1`)
- **Files**: `kebab-case.ts` or `kebab-case.tsx` (e.g., `test-case-ids.ts`, `metrics-panel.tsx`)
- **Functions/Variables**: `camelCase` (e.g., `ensureProjectForUser`, `deriveTestCasePrefix`)
- **Components**: `PascalCase` (e.g., `TestsPanel`, `CopyProjectId`)
- **Database Models**: `PascalCase` in `schema.prisma`, with `snake_case` mapping (e.g., `model TestCase` mapped to `@@map("test_cases")`).

### Imports and Path Aliases
- Use the `@/` alias for absolute imports from the `src/` directory.
- **Import Order**:
  1. React/Next.js core modules.
  2. External dependencies (`zod`, `lucide-react`, `bcryptjs`).
  3. Shared UI primitives (`@/components/ui/...`).
  4. Business logic/hooks (`@/lib/...`, `@/auth`).

### Types and Interfaces
- **TypeScript**: Mandatory. Avoid `any`. Use `unknown` if the type is truly unknown.
- **Shared Types**: Place in `src/types/` (e.g., `src/types/next-auth.d.ts`).
- **Prisma Types**: Prefer importing generated types (e.g., `import type { Project } from "@prisma/client"`).

### Error Handling
- **Async Operations**: Wrap in `try-catch` blocks, especially for database or network calls.
- **Logging**: Use `console.error` with context (e.g., `console.error("Error in ensureProjectForUser:", { userId, error })`).
- **API Responses**: Always return structured errors from API handlers (e.g., `return Response.json({ error: "Unauthorized" }, { status: 401 })`).

### Data Access (Prisma)
- **Client**: Use the singleton `db` exported from `@/lib/db`.
- **Permissions**: Always check if a user belongs to a project before performing mutations on its data.
- **Database Migrations**: For local development, `npx prisma db push` is preferred for speed. In production-like environments, ensure `npx prisma generate` is run to keep the client in sync with the schema.

---

## 3. Project Structure Overview

- `src/app/`: Next.js App Router.
  - `page.tsx`, `layout.tsx`: Root routes.
  - `api/`: API endpoints (REST convention).
  - `dashboard/`: Main application features.
- `src/components/`:
  - `ui/`: shadcn/ui primitives.
  - `auth/`: Login/Register components.
  - `tests-panel.tsx`: Main UI for manual test execution.
  - `metrics-panel.tsx`: Dashboard visualizations.
- `src/lib/`:
  - `db.ts`: Prisma client singleton.
  - `auth.ts`: Auth.js (NextAuth) configuration.
  - `projects.ts`: Logic for project management.
  - `junit.ts`: JUnit XML parsing logic.
  - `test-case-ids.ts`: ID generation strategy.
- `prisma/`:
  - `schema.prisma`: Single source of truth for the database schema.
- `dist/`: Compiled scripts and manual tests.

---

## 4. Key Workflows

### Authentication
- Uses `next-auth` (v5 beta).
- Configured in `src/auth.ts` and `src/app/api/auth/[...nextauth]/route.ts`.
- Use `await auth()` in server components to check for an active session.

### Manual Test Execution
- Managed in `src/components/tests-panel.tsx`.
- Test runs create `TestRun` and `TestResult` records in the database.
- JUnit XML ingestion is handled in `src/app/api/v1/runs/route.ts`.

### Project Provisioning
- Handled in `src/lib/projects.ts`.
- Every user gets a default project on their first login via `ensureProjectForUser`.
- Test case IDs (e.g., `TC-0001`) are prefixed based on the project name.

---

## 5. Commit Guidelines
- Follow [gitmoji](https://gitmoji.dev/) conventions from `CONTRIBUTING.md`:
  - ✨ `add` (New feature)
  - 🐛 `fix` (Bug fix)
  - ♻️ `refactor` (Code cleanup)
  - 📝 `docs` (Documentation)
- Example: `✨ add: support for Jira key pattern validation`

---

*This guide is for AI agents. Please update it when introducing new frameworks or changing core architectural patterns.*

