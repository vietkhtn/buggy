# Buggy 🐞

**The self-hosted test management platform for modern QA teams.**

Stop juggling spreadsheets and disconnected tools. Buggy brings your manual test cases and automated test results into a single, unified dashboard. It’s built for teams that value privacy, speed, and visibility.

---

## Why Buggy?

- **Unified Visibility**: See manual and automated results side-by-side. No more fragmented data.
- **Flaky Test Detection**: Automatically identify unstable tests across your latest 5 runs. Stop chasing ghost failures.
- **Self-Hosted & Secure**: Your data stays on your infrastructure. No third-party lock-in or privacy concerns.
- **CI/CD Native**: Ingest results directly from your CI pipeline via REST API or JUnit XML uploads.

---

## ⚡️ Key Features

- ✅ **Manual Test Case Management**: Create, organize, and execute manual tests with ease.
- 🚀 **Automated Run Ingestion**: Use our `POST /api/v1/runs` endpoint with an API key for seamless CI integration.
- 📊 **Insightful Metrics**: Track pass rates, total results, and historical trends at a glance.
- 🛠 **Project Scoping**: Multi-tenant architecture with automatic project bootstrapping for new users.
- 🔑 **Secure API Auth**: Simple API key generation with hashed storage for programmatic access.
- 📦 **JUnit Support**: Upload standard JUnit XML files directly to populate your dashboard.

---

## 🚀 Quick Start (Recommended)

The fastest way to get Buggy up and running is via **Docker Compose**.

### 1. Clone & Configure
```bash
git clone https://github.com/itgrate/buggy.git && cd buggy
cp .env.example .env
```
*(Optional: Edit `.env` for OAuth providers or custom secrets)*

### 2. Launch the Stack
```bash
docker compose up --build -d
```
This starts:
- 🐘 **PostgreSQL** on port `5432`
- ⚡️ **Next.js App** on `http://localhost:3000`
- 🔄 **Auto-migrations** for your database schema

### 3. Log In
Open `http://localhost:3000`. Use email/password or any configured OAuth provider to get started. Your first project will be automatically created!

---

## 💻 Local Development

If you prefer to run Buggy natively:

1. **Install dependencies**: `npm install`
2. **Setup DB**: 
   - Ensure a PostgreSQL instance is running.
   - Run `npx prisma generate`
   - Run `npx prisma db push`
3. **Start Dev Server**: `npm run dev`

---

## 🔌 API Integration

Ingest automated test results from any environment:

```bash
curl -X POST http://localhost:3000/api/v1/runs \
  -H "Authorization: Bearer <your_api_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nightly Build #123",
    "project_id": "YOUR_PROJECT_ID",
    "results": [
      {
        "name": "Login flow works",
        "suite": "Authentication",
        "status": "passed",
        "duration_ms": 1234
      }
    ]
  }'
```

---

## 🏗 Tech Stack

- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **Auth**: [NextAuth.js v5](https://authjs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)

---

## 🤝 Contributing

We welcome contributions! Check our [Contributing Guide](CONTRIBUTING.md) and `AGENTS.md` for coding standards and workflows.

---

*Made with ❤️ for the QA community.*
