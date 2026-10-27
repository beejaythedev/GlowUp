# Progress

The supervisor reads this to see what's done. The agent updates it after every task
and writes a handoff note before every session ends.

## Latest handoff note

> **Date:** 2026-10-27
> **Done this session:** M0 complete (M0-4, M0-5, M0-6 — see task log) and M1-1 started.
> M1-1: full Prisma schema in `prisma/schema.prisma` — `Branch`/`OpeningHours` (weekday
> opening hours as minutes-since-midnight Africa/Lagos wall-clock, missing weekday =
> closed), `Service` (min/max duration for ranged services like braids, per Q1 in
> `docs/DECISIONS.md`), `Staff`/`Customer`, `Booking` (the central table — `startsAt`/
> `endsAt` is what the customer sees, `blockedUntil` adds prep and is what availability
> checks, `stylistRequested` flag, `holdExpiresAt` for the 10-minute hold), and a single
> global `Settings` row. Enums: `StaffRole`, `StaffStatus`, `BookingStatus` (the exact
> 6-value list from rule 5), `BookingSource`, `DepositStatus`. One deliberate simplification
> vs `docs/ARCHITECTURE.md`'s table list: no separate `BranchService` join table —
> "nails only" services are derived from `Service.nailsOnly && Branch.offersNails`, which
> reproduces the PRD's service/branch table exactly with one less table; flagging this for
> the M1 checkpoint review rather than treating it as settled. The no-double-booking
> exclusion constraint (btree_gist) is deferred to M2-3 as planned — Prisma can't express
> it, so it's a hand-written SQL migration, not part of this one.
> Verified `npx prisma migrate dev` runs clean on a brand-new database (spun up a temporary
> container on another port, ran both migrations from zero, tore it down). Local dev's
> `glowup-postgres` Docker container had to be recreated (Docker Desktop wasn't running at
> session start) — it only ever held the empty `SetupCheck` placeholder, so no data was
> lost; this matches the README's "disposable container" setup.
> **Half-done:** M1 milestone — M1-1 done, M1-2 (seed data) and M1-3 (pure functions:
> deposit/wait-time/display-status/balance) not started.
> **Next task:** M1-2 — seed data (4 branches, 7 services, Lekki staff, Kelechi at Ikeja,
> Tolu as owner, sample "today" bookings) matching the designs.
> **Blockers or questions:** work is on a new `m1-data-model` branch (branched off
> `m0-foundations`); not yet committed — the supervisor commits and pushes manually, no
> Co-Authored-By trailer (see project memory). The BranchService-vs-derived-booleans
> simplification above is worth the supervisor's explicit sign-off at the M1 schema review
> called for in `docs/ROADMAP.md`.

## Milestones

| Milestone | Status | Supervisor approved |
|---|---|---|
| M0 Foundations | Ready for review | |
| M1 Data model and seed | In progress | |
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
| 2026-10-27 | M1-1 | Full Prisma schema (Branch, OpeningHours, Service, Staff, Customer, Booking, Settings) and migration | `npx prisma migrate dev` on a fresh database, `npm run check`, `npm run build` |
| 2026-10-27 | M0-6 | `README.md` with setup steps and a commands table; verified `CLAUDE.md` commands are current | `npm run check` |
| 2026-10-27 | M0-5 | Base components (Button, Card, Input, StatusBadge, Chip, CustomerShell, StaffShell), `/dev/components` page | `npm run check` (10 unit tests), `npm run e2e`, `npm run build`, visual check via screenshot |
| 2026-10-27 | M0-4 | Vitest + Playwright, `npm run check`/`test`/`e2e`/`typecheck` scripts, bumped `@types/node` to `^24` | `npm run check` (lint, typecheck, 3 unit tests), `npm run e2e` (1 test), `npm run build` |
| 2026-10-22 | M0-3 | Prisma + PostgreSQL (Docker for local dev), `.env.example`, `src/lib/db.ts` | `npx prisma migrate dev` against a fresh container; `npm run lint`, `npm run build` |
| 2026-10-22 | M0-2 | Tailwind design tokens (`@theme` in globals.css), Plus Jakarta Sans, `/dev/tokens` page | `npm run lint`, `npm run build`, manual check of `/dev/tokens` |
| 2026-10-22 | M0-1 | Scaffolded Next.js (TS strict, App Router, Tailwind, ESLint, Prettier) | `npm run lint`, `npm run build` pass |
