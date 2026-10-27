# Progress

The supervisor reads this to see what's done. The agent updates it after every task
and writes a handoff note before every session ends.

## Latest handoff note

> **Date:** 2026-10-27
> **Done this session:** M0-4. Added Vitest (`vitest.config.mts`, jsdom environment,
> `@testing-library/jest-dom` setup) with a sample unit test (`src/lib/money.ts` /
> `money.test.ts`, a `formatNaira` helper over integer kobo per Rule 1). Added Playwright
> (`playwright.config.ts`, Chromium only, auto-starts `npm run dev`) with a sample e2e
> test (`e2e/home.spec.ts`) against the placeholder home page. Added `npm run typecheck`,
> `npm run test`, `npm run e2e` and `npm run check` (lint && typecheck && test) scripts.
> Bumped `@types/node` from `^20` to `^24` to match the installed Node (v24) and satisfy
> `vitest@5`'s peer dependency. Used Vite's native `resolve.tsconfigPaths` instead of the
> `vite-tsconfig-paths` plugin (newer, one less dependency). `npm run check`, `npm run e2e`
> and `npm run build` all pass.
> **Half-done:** none.
> **Next task:** M0-5 — base components (Button, Card, Input, StatusBadge, Chip,
> CustomerShell, StaffShell) on a `/dev/components` page.
> **Blockers or questions:** this session worked on branch `setup`, continuing the
> existing M0-1..M0-3 history there, rather than a milestone-named branch — flagged to
> the supervisor per the branch-per-milestone preference; no action taken without
> confirmation.

## Milestones

| Milestone | Status | Supervisor approved |
|---|---|---|
| M0 Foundations | In progress | |
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
| 2026-10-27 | M0-4 | Vitest + Playwright, `npm run check`/`test`/`e2e`/`typecheck` scripts, bumped `@types/node` to `^24` | `npm run check` (lint, typecheck, 3 unit tests), `npm run e2e` (1 test), `npm run build` |
| 2026-10-22 | M0-3 | Prisma + PostgreSQL (Docker for local dev), `.env.example`, `src/lib/db.ts` | `npx prisma migrate dev` against a fresh container; `npm run lint`, `npm run build` |
| 2026-10-22 | M0-2 | Tailwind design tokens (`@theme` in globals.css), Plus Jakarta Sans, `/dev/tokens` page | `npm run lint`, `npm run build`, manual check of `/dev/tokens` |
| 2026-10-22 | M0-1 | Scaffolded Next.js (TS strict, App Router, Tailwind, ESLint, Prettier) | `npm run lint`, `npm run build` pass |
