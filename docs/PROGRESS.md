# Progress

The supervisor reads this to see what's done. The agent updates it after every task
and writes a handoff note before every session ends.

## Latest handoff note

> **Date:** 2026-10-22
> **Done this session:** M0-1 and M0-2 — scaffolded the Next.js app (TypeScript strict,
> App Router, Tailwind, ESLint, Prettier); added every colour/font/radius token from
> `docs/DESIGN.md` to Tailwind v4 via a `@theme` block in `globals.css`, switched the
> font to Plus Jakarta Sans, and built `/dev/tokens` showing every token. Confirmed no
> raw hex values in any `src/*.ts(x)` file.
> **Half-done:** none.
> **Next task:** M0-3 — set up PostgreSQL and Prisma with `.env.example`.
> **Blockers or questions:** none.

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
| 2026-10-22 | M0-2 | Tailwind design tokens (`@theme` in globals.css), Plus Jakarta Sans, `/dev/tokens` page | `npm run lint`, `npm run build`, manual check of `/dev/tokens` |
| 2026-10-22 | M0-1 | Scaffolded Next.js (TS strict, App Router, Tailwind, ESLint, Prettier) | `npm run lint`, `npm run build` pass |
