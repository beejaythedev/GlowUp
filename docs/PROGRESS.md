# Progress

The supervisor reads this to see what's done. The agent updates it after every task
and writes a handoff note before every session ends.

## Latest handoff note

> **Date:** 2026-10-27
> **Done this session:** M0-4, M0-5 and M0-6 — M0 is now complete and ready for the
> supervisor checkpoint. M0-6: wrote `README.md` (setup steps — Docker Postgres, `.env`,
> `prisma migrate dev`, `npm run dev`, Playwright browser install — plus a commands table
> and a doc index). Confirmed `CLAUDE.md`'s Commands section (filled in back in M0-1) is
> still accurate against `package.json` and didn't need changes.
> M0-5 (previous entry in this session): base components under `src/components/`
> (`ui/Button`, `ui/Card`, `ui/Input`, `ui/StatusBadge`, `ui/Chip`, `layout/CustomerShell`,
> `layout/StaffShell`) matching `docs/DESIGN.md`, all with 44px+ touch targets and real
> interactive elements, shown on a new `/dev/components` page and covered by unit tests.
> `npm run check`, `npm run e2e` and `npm run build` all pass.
> **Half-done:** none.
> **Next task:** M0 supervisor checkpoint — run the app, look at `/dev/tokens` and
> `/dev/components`, compare with the designs. Do not start M1 until approved.
> **Blockers or questions:** this session's work (M0-4, M0-5, M0-6) is on a new
> `m0-foundations` branch (branched off `setup`, which matches `origin/setup`) per the
> branch-per-milestone preference; not yet committed — the supervisor commits and pushes
> manually, and wants no Co-Authored-By trailer on commits/PRs in this repo (see project
> memory).

## Milestones

| Milestone | Status | Supervisor approved |
|---|---|---|
| M0 Foundations | Ready for review | |
| M1 Data model and seed | Not started | |
| M2 Availability engine | Not started | |
| M3 Customer booking | Not started | |
| M4 Staff sign-in and roles | Not started | |
| M5 Reception | Not started | |
| M6 Stylist | Not started | |
| M7 Manager and owner | Not started | |
| M8 Payments and messages | Not started | |
| M9 Testing, launch and training | Not started | |

Statuses: Not started · In progress · Ready for review · Approved.

## Task log

Newest first. One line per finished task.

| Date | Task | What changed | Tests |
|---|---|---|---|
| 2026-10-27 | M0-6 | `README.md` with setup steps and a commands table; verified `CLAUDE.md` commands are current | `npm run check` |
| 2026-10-27 | M0-5 | Base components (Button, Card, Input, StatusBadge, Chip, CustomerShell, StaffShell), `/dev/components` page | `npm run check` (10 unit tests), `npm run e2e`, `npm run build`, visual check via screenshot |
| 2026-10-27 | M0-4 | Vitest + Playwright, `npm run check`/`test`/`e2e`/`typecheck` scripts, bumped `@types/node` to `^24` | `npm run check` (lint, typecheck, 3 unit tests), `npm run e2e` (1 test), `npm run build` |
| 2026-10-22 | M0-3 | Prisma + PostgreSQL (Docker for local dev), `.env.example`, `src/lib/db.ts` | `npx prisma migrate dev` against a fresh container; `npm run lint`, `npm run build` |
| 2026-10-22 | M0-2 | Tailwind design tokens (`@theme` in globals.css), Plus Jakarta Sans, `/dev/tokens` page | `npm run lint`, `npm run build`, manual check of `/dev/tokens` |
| 2026-10-22 | M0-1 | Scaffolded Next.js (TS strict, App Router, Tailwind, ESLint, Prettier) | `npm run lint`, `npm run build` pass |
