# Buggy - Test Management for QA Teams

Buggy is a self-hosted test management tool that keeps manual and automated test outcomes in one place.

## Implemented in this build

- Email/password authentication with optional Google and GitHub OAuth.
- Project bootstrap per user (first login automatically gets a project).
- Manual test case creation (title, module, tags, and initial step).
- Manual execution workflow (select test cases, start run, set pass/fail/blocked per test result).
- JUnit XML import endpoint and dashboard upload flow.
- CI ingestion endpoint: `POST /api/v1/runs` with Bearer API key auth.
- API key generation UI (key shown once, stored as bcrypt hash).
- Dashboard metrics:
  - total results
  - pass rate
  - pass/fail/skip+error counts
  - recent runs
  - flaky tests across latest 5 automated runs

## Tech stack

- Next.js App Router + TypeScript
- Prisma ORM + PostgreSQL
- NextAuth.js
- Tailwind CSS + shadcn/ui primitives

## Quick start

1. Copy env file:

```bash
cp .env.example .env
```

2. Start the full stack with Docker Compose:

```bash
docker compose up --build -d
```

This now starts:

- `db` (PostgreSQL)
- `migrate` (runs `prisma db push` once)
- `app` (Next.js on port 3000)

Open `http://localhost:3000`.

3. (Optional) Local development without app container:

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

## API examples

### Create API key (authenticated session required)

Use the dashboard UI to generate a key.

### Ingest automated run via REST API

```bash
curl -X POST http://localhost:3000/api/v1/runs \
  -H "Authorization: Bearer <your_api_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nightly Build #123",
    "project_id": "<project_id>",
    "results": [
      {
        "name": "Login flow works",
        "suite": "Authentication",
        "status": "passed",
        "duration_ms": 1234,
        "metadata": { "browser": "chrome" }
      }
    ]
  }'
```

### Upload JUnit XML

Use the Dashboard "Upload JUnit XML" card.

## Verification

```bash
npm run lint
npm run build
```
