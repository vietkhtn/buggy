# Changelog

All notable changes to Buggy are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.5.0.0] - 2026-03-26

### Added
- Admin can now reset any workspace member's password directly from the admin panel — no email flow required for self-hosted instances.
- Project member management: admins can add or remove members from any project without touching the database.
- Navigation links between the workspace view and the admin panel so admins can switch contexts without hunting for URLs.

### Fixed
- Password change now redirects to the dashboard using a hard navigation, so the session refreshes correctly after a forced reset.

---

## [0.4.1.0] - 2026-03-25

### Added
- User management API and admin users panel: list, create, and deactivate workspace members from the admin UI.

### Fixed
- Switch toggles in the admin panel were invisible due to wrong data attribute selectors — now consistently visible.
- "Create one" registration link on the login page is now hidden when self-registration is disabled.
- Change-password UX, landing page rendering, and project auto-provisioning issues (ISSUE-003 through ISSUE-006).
- `isWorkspaceAdmin` flag now correctly survives the NextAuth JWT callback so admin sessions are not lost on refresh.

---

## [0.4.0.0] - 2026-03-24

### Added
- Workspace admin RBAC: a new `isWorkspaceAdmin` role gates access to admin-only routes and UI sections.
- `/setup` wizard: first-run experience that creates the initial workspace admin account.
- `/admin` panel: central admin area for managing users and workspace-level settings.
- REST API v1 endpoints for test cases, test suites, and API key management (read/write).

### Changed
- Redesigned landing page as a multi-section marketing page (15 design improvements applied).
- Dashboard no longer auto-redirects when only one project exists — lets users navigate explicitly.

### Fixed
- `/register` page is now force-dynamic, preventing stale pre-rendered builds from blocking new signups.
- Stale JWT sessions where the user no longer exists in the DB now fail gracefully instead of throwing.
- Geist Sans font wiring — resolved CSS variable self-reference that caused Times New Roman fallback.
- Metric cards use a status dot instead of a colored left border for cleaner visual hierarchy.
- Settings button touch targets normalized; Import JUnit section layout fixed.
- Forgot-password alert replaced with an inline message.
- GitHub repo URL corrected to `pdnhan/buggy`.

---

## [0.3.0.0] - 2026-03-22

### Added
- Enhanced test case import with ID prefix mapping and name normalization.
- Expected result and actual result fields in manual test reports and imports.

### Fixed
- Dockerfile node version updated; debug logging removed.

---

## [0.2.0.0] - 2026-03-20

### Added
- Multi-project support with project-scoped routing — each user can belong to multiple projects.
- Bulk delete for test cases.
- Executive-friendly run reports (printable, clean layout).
- `expectedResult` field on test cases with full import and UI support.
- Flaky test detection across the last 5 runs, with failure categorization.
- Test case CRUD operations with CSV/spreadsheet import support.

### Fixed
- File selection state now resets correctly when the import dialog closes.
- TypeScript errors in `tests-panel.tsx` resolved.
- Docker Compose credentials moved to environment variables (no more hardcoded values).
- Project creation reliability improved.

---

## [0.1.0.0] - 2026-03-18

### Added
- Initial release: Next.js App Router with authentication (email + password via NextAuth v5).
- Prisma + PostgreSQL schema with Projects, TestRuns, TestResults, and TestSuites.
- Dashboard with metrics panel, tests panel, and settings panel.
- API key management with hashed storage.
- Manual test runs via the UI.
- JUnit XML ingestion via `POST /api/v1/runs`.
- Docker Compose stack (app + PostgreSQL + auto-migration).
- Contributing guide and MIT license.
