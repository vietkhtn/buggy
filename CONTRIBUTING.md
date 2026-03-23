# Contributing to Buggy

Thanks for helping make Buggy a better home for QA teams. This guide explains how to set up your environment, propose changes, and submit high-quality pull requests that stay easy to review.

## Ways to Contribute

- **Report bugs**: Use GitHub Issues and include repro steps, expected vs. actual results, screenshots, and affected browser/version information.
- **Request features**: Describe the testing workflow problem you want to solve and outline a minimal UX proposal.
- **Improve docs**: Clarify setup steps, API examples, or screenshots to help new QA teams adopt the tool.
- **Submit code**: Tackle an open issue or pitch a proposal before implementing larger architectural changes.

## Development Setup

1. Copy environment variables: `cp .env.example .env`.
2. Start the stack with Docker (`docker compose up --build -d`) or run the local app: `npm install`, `npx prisma generate`, `npx prisma db push`, `npm run dev`.
3. Seed your account by signing up; the first login automatically provisions a project.

### Tooling Expectations

- Node.js 20+ and npm 10+.
- PostgreSQL (provided via Docker compose) for local data.
- Prisma CLI for schema changes and migrations.

## Workflow

1. **Discuss first**: Comment on an open issue or create a new one to describe the problem and proposed solution.
2. **Branch naming**: Use `feature/<short-description>` or `fix/<issue-number>`.
3. **Keep changes scoped**: One logical improvement per pull request, including schema updates and docs.
4. **Write tests where possible**: Cover new logic or regressions with unit/integration tests.
5. **Document behavior**: Update `README.md` or `/docs` when APIs, env vars, or workflows change.

## Coding Standards

- Follow the existing TypeScript, Prisma, and Tailwind patterns in the repo.
- Keep components accessible (proper labels, keyboard navigation, semantic HTML).
- Prefer server actions and API handlers already used in the App Router structure.
- Run `npm run lint` and `npm run build` locally before opening a pull request.

## Commit Messages

- Prefix commits with an appropriate [gitmoji](https://gitmoji.dev/) to signal intent (e.g., `✨ add`, `🐛 fix`, `📝 docs`).
- Use the imperative mood ("Add API key docs").
- Reference GitHub issues when applicable (e.g., `fixes #123`).

## Pull Request Checklist

- [ ] The branch is rebased on `master`.
- [ ] Lint (`npm run lint`) and build (`npm run build`) pass locally.
- [ ] API contracts, Prisma schema, and UI flows are documented.
- [ ] Screenshots or Looms attached for UI changes.
- [ ] Migrations include both schema and generated artifacts.
- [ ] Reviewers are tagged with context on testing steps and edge cases.

## Code Review Expectations

- Be responsive to feedback and keep discussions respectful.
- Squash or rebase as requested, but avoid force-pushing work reviewed by others unless necessary.
- Aim for fast follow-ups when a reviewer blocks the PR; if you need more time, communicate in the thread.

## Security & Privacy

- Never commit secrets. Keep credentials in `.env` (listed in `.gitignore`).
- Report vulnerabilities privately via the security policy (or email the maintainers) before disclosing publicly.

## Need Help?

Open a GitHub Discussion or issue with the `question` label, or reach out to the maintainers through the contact info in `README.md`. We're excited to collaborate with you!
