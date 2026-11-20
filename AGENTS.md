# Project rules

## What this is

Budiman HRMS — a Leave Request module replacing a paper process: employee
submits, supervisor signs or rejects (with reason), employee sends to HR, HR
officer approves or rejects (with reason), admin sees all read-only. The
brief is `docs/Agentic AI - HRMS Doc.pdf`; follow it, especially statuses
(§5.2), business rules (§5.3), requirements (§6), data fields (§7.2) and
security (§7.5, OWASP Top 10).

## Built with

Next.js 16 (App Router) + TypeScript, Tailwind CSS 4, SQLite via Prisma,
bcryptjs for passwords. Login is a signed session cookie; forms use server
actions. Keep versions as pinned in `package.json`.

## Running it

`npm install`, then `npm run dev` → http://localhost:3000. Needs Node 20.9+.
`npm run lint` must pass before you finish work.

## Where things live

- `src/app/` — screens and server actions
- `docs/specs/` — the approved specs (requirements, design, tasks); the single
  source of truth for behaviour
- `docs/templates/` — blank spec templates; copy, never edit
- `docs/` PDF — the brief

## How to work

- Spec-driven: build only from the approved specs in `docs/specs/`, one task
  at a time, in order, High first. If behaviour changes, fix the spec first.
- The AI drafts specs and code; a human reviews and approves before building.
- Commit messages use conventional commits: `feat: add login page`,
  `fix: reject dates in the past`, `docs: update design spec`.
- Never store plain-text passwords; hash with bcryptjs. Every page checks the
  user is logged in and holds the right role.
- Demo logins and the password for all are in the PDF §7.2 — demo data only.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
