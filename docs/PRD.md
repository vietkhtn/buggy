# Buggy - Test Management for QA Teams

## Product Requirements Document

**Version**: 1.0  
**Last Updated**: March 23, 2026  
**Status**: Approved

---

## Problem Statement

QA teams working on mobile and web applications lack a unified, lightweight tool to manage both manual and automated testing. Existing solutions fall into two camps:

1. **Enterprise tools (TestRail, Zephyr, qTest)**: Expensive ($30-100/user/month), complex setup, overkill for small teams
2. **Developer-focused tools (Allure, ReportPortal)**: Strong automation reporting but poor manual test management, require significant infrastructure

**Who is affected**: Small QA teams (2-10 people) and individual QA engineers working on mobile/web projects.

**What they cannot do**: 
- Track manual and automated tests in one place
- Generate stakeholder-friendly reports without spreadsheet manipulation
- Quickly see which tests are flaky vs. genuinely failing
- Choose what metrics appear in reports for different audiences

**Cost**: 
- 2-4 hours/week spent copying results between tools and spreadsheets
- Missed flaky tests leading to false confidence or alert fatigue
- Stakeholders don't trust test reports they can't read

**Evidence**:
- TestRail pricing starts at $36/user/month (prohibitive for freelancers/startups)
- Common pattern: teams use Jira + spreadsheets + Allure separately
- "I just want to know what broke and why" - recurring QA community sentiment

---

## Goals

| Goal | Outcome |
|------|---------|
| Unified test management | Single source of truth for manual and automated test results |
| Human-readable reports | Stakeholders can understand test status without QA interpretation |
| Selective metrics | Users control which metrics appear in generated reports |
| Low setup friction | Running instance in under 15 minutes with Docker |
| Framework agnostic | Ingest results from any framework via JUnit XML or REST API |

## Non-Goals (v1.0)

- **No issue tracker integration** - Will not sync with Jira/Linear/GitHub Issues (deferred to v1.1)
- **No test authoring/IDE** - Users write tests in their preferred tools; we only track execution
- **No CI/CD pipeline management** - We receive results, not orchestrate runs
- **No mobile test recording** - We don't capture device sessions (use Appium Inspector, etc.)
- **No AI-powered test generation** - Focus on reporting, not creation
- **No multi-tenancy** - Self-hosted single-organization deployment

---

## Success Metrics

| Metric | Current (Baseline) | Target | Measurement |
|--------|-------------------|--------|-------------|
| Time to first test import | N/A (new product) | < 5 minutes | From signup to first JUnit XML uploaded |
| Report generation time | N/A | < 3 seconds | 95th percentile for 1000-test runs |
| User adoption | 0 | 50 active teams | Self-reported installs via opt-in telemetry |
| Report comprehension | N/A | 80% stakeholder satisfaction | Post-launch survey |

**Guardrail Metrics**:
- Page load time < 2 seconds (p95)
- API response time < 500ms (p95)
- Zero data loss on result ingestion

**Measurement Window**: 8 weeks post-launch, evaluated bi-weekly

---

## User Stories

### Must Have (MVP - Week 1-2)

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| M1 | As a QA engineer, I want to upload JUnit XML files so that I can track automated test results | - Drag-drop or API upload<br>- Parse pass/fail/skip/error counts<br>- Extract test names, durations, failure messages<br>- Support nested test suites |
| M2 | As a QA engineer, I want to create manual test cases so that I can document what needs testing | - Create test case with title, description, and priority<br>- Assign optional Jira reference and auto-generated Test Case ID<br>- Organize by folder/tag/module<br>- Manage suites (add/remove cases, delete suites without deleting cases)<br>- Mark as draft/active/deprecated |
| M3 | As a QA engineer, I want to execute manual tests with clear tracking so that I can record exactly what passed or failed | - Execute test run with pass/fail/blocked per case<br>- Add run-level notes/attachments<br>- Calculate overall pass rate |
| M4 | As a QA lead, I want to see a dashboard with pass/fail/skip counts so that I can quickly assess test health | - Total tests, passed, failed, skipped<br>- Pass rate percentage<br>- Filter by date range, tag, module |
| M5 | As a stakeholder, I want to view a human-readable test summary so that I can understand release quality | - Executive summary with key metrics<br>- No technical jargon<br>- Visual pass/fail indicators |
| M6 | As a user, I want to sign in with email/password so that my data is secure | - Email/password registration and login<br>- Password reset via email link<br>- Session management with configurable timeout |

### Should Have (MVP - Week 2-3)

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| S1 | As a QA engineer, I want to see flaky test detection so that I can prioritize test fixes | - Flag tests that pass/fail inconsistently across last 5 runs<br>- Show flakiness score (fail rate over last 5 runs)<br>- Filter dashboard by flaky tests |
| S2 | As a QA engineer, I want to categorize failures (UI, API, timeout, assertion) so that I can identify patterns | - Auto-categorize from error messages where possible<br>- Manual override category<br>- Report by failure category |
| S7 | As a QA lead, I want guided metric logging so that team members know exactly what to enter | - Each metric field includes clarifying questions and inline examples<br>- Form validation ensures responses match expected formats |
| S3 | As a QA lead, I want to track test coverage by feature/module so that I can see testing gaps | - Tag tests with feature/module<br>- Coverage heatmap view<br>- Identify modules with low/no coverage |
| S4 | As a QA engineer, I want to compare test runs over time so that I can see trends | - Select 2+ runs to compare<br>- Show newly failing, newly passing, consistently failing<br>- Trend graph over time |
| S5 | As a user, I want to export reports as PDF so that I can share with stakeholders offline | - Generate PDF with selected metrics<br>- Include charts and summary<br>- Neutral default theme |
| S6 | As a QA engineer, I want to submit results via REST API so that I can integrate with CI pipelines | - POST endpoint for test results<br>- API key authentication<br>- Return run ID for reference |

### Could Have (Post-MVP - Week 3-4)

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| C1 | As a QA engineer, I want session-based exploratory testing so that I can track unscripted testing | - Start/stop session timer<br>- Add notes during session<br>- Tag with charter/focus area |
| C2 | As a user, I want to export data as CSV/Excel so that I can analyze in spreadsheets | - Export test cases, runs, results<br>- Column selection |
| C3 | As a user, I want to export data as Markdown so that I can include in documentation | - Markdown-formatted summary<br>- Copy to clipboard |
| C4 | As a QA lead, I want to track testing against sprints/releases so that I can report on milestone progress | - Create releases/sprints<br>- Associate test runs with releases<br>- Progress tracking per release |
| C5 | As an admin, I want to manage team members so that I can control access | - Invite users by email<br>- Role-based permissions (admin, member, viewer) |

### Won't Have (v1.0)

- Real-time collaboration / live cursors
- Test case version history / diffing
- Scheduled report emails
- Slack/Teams notifications
- Custom metric formulas
- Multi-organization / SaaS billing

---

## Detailed Requirements

### Test Result Ingestion

**JUnit XML Import**
- Accept standard JUnit XML format (compatible with Jest, Vitest, Playwright, Cypress, JUnit, TestNG, XCUITest, Espresso)
- Parse: test suite name, test case name, status (pass/fail/skip/error), duration, failure message, stack trace
- Handle nested `<testsuite>` elements
- Support file upload (UI) and API submission
- Maximum file size: 50MB
- Duplicate detection: warn if same run uploaded twice (based on hash)

**REST API Ingestion**
```
POST /api/v1/runs
Authorization: Bearer <api_key>
Content-Type: application/json

{
  "name": "Nightly Build #123",
  "project_id": "uuid",
  "results": [
    {
      "name": "Login flow works",
      "suite": "Authentication",
      "status": "passed",
      "duration_ms": 1234,
      "metadata": { "browser": "chrome", "os": "macos" }
    }
  ]
}
```

### Manual Test Management

**Test Case Structure**
- Title (required, 200 char max)
- Auto-generated Test Case ID (prefix configurable in Project Settings; defaults to project initials)
- Optional Jira reference field (validated for Jira key format)
- Description (optional, markdown supported)
- Preconditions (optional)
- Tags (multiple, for filtering)
- Module/Feature (single select from project taxonomy)
- Priority (Critical, High, Medium, Low)
- Status (Draft, Active, Deprecated)

**Test Suite Management**
- Create suites and add/remove test cases at any time
- Removing a test suite never deletes underlying test cases
- Bulk actions available for moving cases between suites
- Audit log records suite membership changes

**Test Execution**
- Select test cases for a run
- Record pass/fail/blocked at the case level (no per-step UI)
- Add run-level notes and attachments (max 10MB each)
- Auto-calculate run status based on aggregated case outcomes

### Reporting & Metrics

**Available Metrics** (user selects which to include):
| Metric | Description |
|--------|-------------|
| Total tests | Count of all tests in run |
| Pass rate | Passed / Total × 100 |
| Fail count | Tests with status=failed |
| Skip count | Tests with status=skipped |
| Error count | Tests with status=error (distinct from assertion failures) |
| Duration | Total and average execution time |
| Flaky tests | Tests with inconsistent results across last 5 runs |
| Failure categories | Breakdown by error type (UI, API, timeout, assertion, unknown) |
| Coverage by module | Tests per feature/module with pass rates |
| Trend comparison | Delta vs. previous run |
| Historical chart | Pass rate over last N runs |

**Guided Metric Logging**
- When adding metrics to a report template, each field surfaces clarifying prompts (e.g., "What timeframe does this pass rate cover?")
- Inline examples show acceptable formats (percentages, counts, durations) to reduce guesswork
- Contextual tooltips link to documentation for less common KPIs
- Validation enforces units and highlights missing rationale before submission

**Report Builder**
- Select metrics to include via checkboxes
- Preview before export
- Export formats: PDF, CSV, Markdown, JSON (API)

### Dashboard

**Pre-built Dashboard Sections**
1. **Summary Card**: Total tests, pass rate, trend arrow
2. **Status Distribution**: Pie/donut chart of pass/fail/skip
3. **Recent Runs**: Table with run name, date, pass rate, link to details
4. **Flaky Tests**: List of top flaky tests with scores
5. **Coverage Heatmap**: Module grid with color-coded pass rates
6. **Failure Categories**: Bar chart of failure types

---

## Technical Specifications

### Stack
- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes, Prisma ORM
- **Database**: PostgreSQL 15+
- **Authentication**: First-party email/password service with session tokens
- **PDF Generation**: jspdf + jspdf-autotable
- **Deployment**: Docker + Docker Compose (self-hosted)

### Database Schema (Core Entities)
```
Project (id, name, slug, created_at)
TestCase (id, project_id, display_id, jira_key?, title, description, tags[], module, priority, status)
TestSuite (id, project_id, name, archived, created_at)
TestSuiteMembership (suite_id, test_case_id, added_by, added_at)
TestRun (id, project_id, name, source[manual|automated], created_at, metadata{})
TestResult (id, run_id, test_case_id?, name, status, duration_ms, failure_message, category)
User (id, email, name, password_hash, last_login_at)
ApiKey (id, user_id, project_id, key_hash, last_used_at)
```

### Scale Target
- Maximum 10,000 tests per project
- Simple indexes, fast queries
- Support 20 simultaneous users per instance

### Performance Requirements
- Dashboard load: < 2s for projects with 10,000 test results
- JUnit XML parsing: < 5s for 50MB file
- Report generation: < 3s for 1000 tests

### Security Considerations
- API keys hashed with bcrypt, shown once on creation
- Password hashes stored with bcrypt, session tokens rotated on login
- Rate limiting: 100 requests/minute per API key
- Input sanitization for all user-provided content
- No sensitive data in URL parameters

---

## Rollout Plan

### Week 1: Core Foundation
- Project setup (Next.js, Prisma, PostgreSQL, Docker)
- Authentication (email/password only)
- Project CRUD
- Test case management (create, edit, organize) with suite editing and ID prefix settings

### Week 2: Test Execution & Ingestion
- Manual test execution flow
- JUnit XML upload and parsing
- REST API for result submission
- Basic dashboard with pass/fail counts

### Week 3: Reporting & Metrics
- Metric selection UI
- Report builder with preview
- PDF export
- Flaky test detection algorithm (last 5 runs)
- Failure categorization
- Guided metric logging prompts and validations

### Week 4: Polish & Documentation
- Coverage heatmap view
- Historical comparison
- CSV/Markdown export
- Docker Compose for easy deployment
- README and setup documentation

### Feature Flags
- `ENABLE_SESSION_TESTING`: Exploratory testing (off by default)
- `ENABLE_RELEASE_TRACKING`: Sprint/release features (off by default)

### Rollback Procedure
- Docker images tagged by version
- Database migrations reversible
- Documented rollback steps in README

---

## Acceptance Criteria Checklist

- [x] Problem statement includes evidence
- [x] Goals are outcomes, not features
- [x] Non-goals explicitly stated
- [x] Success metrics are measurable and have baselines
- [x] Each user story has acceptance criteria
- [x] Edge cases documented (in detailed requirements)
- [x] Dependencies identified (self-contained, no external integrations for v1)
- [x] Rollback plan exists
- [x] Open questions resolved
- [x] Stakeholders have explicitly approved

---

## Sign-offs

- [x] Product: Approved - March 23, 2026
- [ ] Engineering: _____________ - Date: _______
- [ ] Design: __________________ - Date: _______
