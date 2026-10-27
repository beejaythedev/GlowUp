# Progress

The supervisor reads this to see what's done. The agent updates it after every task
and writes a handoff note before every session ends.

## Latest handoff note

> **Date:** 2026-10-27
> **Done this session:** M0-5. Added base components under `src/components/`: `ui/Button`,
> `ui/Card`, `ui/Input` (label + hint/error, associated via `useId`), `ui/StatusBadge`
> (styles for booked/checked-in-early/waiting/in-service/done/no-show/requested per
> `docs/DESIGN.md`), `ui/Chip` (selectable pill, `aria-pressed`), `layout/CustomerShell`
> (phone-width column, `max-w-md`) and `layout/StaffShell` (navy top nav with role badge,
> branch, avatar, sign-out — matches `ReceptionSchedule.dc.html`). All interactive
> controls are real `<button>`/`<label>`/`<input>` elements with visible focus rings and
> 44px+ touch targets (buttons `min-h-11`/`min-h-14`, chips `min-h-11`, inputs 52px).
> Added a `/dev/components` page showing every component and variant, screenshotted and
> checked against the tokens. Added unit tests for Button (click/disabled), Input (label
> association, invalid+error), Chip (`aria-pressed`) and StatusBadge — `npm run test`
> needed `globals: true` in `vitest.config.mts` so `@testing-library/react`'s auto
> `afterEach` cleanup registers (without it, tests that render more than once leaked
> DOM nodes between tests). Added `@testing-library/user-event`. `npm run check`,
> `npm run e2e` and `npm run build` all pass.
> **Half-done:** none.
> **Next task:** M0-6 — write the README with setup steps and fill in the `CLAUDE.md`
> commands, then the M0 supervisor checkpoint.
> **Blockers or questions:** this session's work is on a new `m0-foundations` branch
> (branched off `setup`, which now matches `origin/setup`) per the branch-per-milestone
> preference; not yet committed — the supervisor is committing and pushing manually, and
> wants no Co-Authored-By trailer on commits/PRs in this repo (see project memory).

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
| 2026-10-27 | M0-5 | Base components (Button, Card, Input, StatusBadge, Chip, CustomerShell, StaffShell), `/dev/components` page | `npm run check` (10 unit tests), `npm run e2e`, `npm run build`, visual check via screenshot |
| 2026-10-27 | M0-4 | Vitest + Playwright, `npm run check`/`test`/`e2e`/`typecheck` scripts, bumped `@types/node` to `^24` | `npm run check` (lint, typecheck, 3 unit tests), `npm run e2e` (1 test), `npm run build` |
| 2026-10-22 | M0-3 | Prisma + PostgreSQL (Docker for local dev), `.env.example`, `src/lib/db.ts` | `npx prisma migrate dev` against a fresh container; `npm run lint`, `npm run build` |
| 2026-10-22 | M0-2 | Tailwind design tokens (`@theme` in globals.css), Plus Jakarta Sans, `/dev/tokens` page | `npm run lint`, `npm run build`, manual check of `/dev/tokens` |
| 2026-10-22 | M0-1 | Scaffolded Next.js (TS strict, App Router, Tailwind, ESLint, Prettier) | `npm run lint`, `npm run build` pass |
