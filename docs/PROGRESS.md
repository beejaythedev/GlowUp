# Progress

The supervisor reads this to see what's done. The agent updates it after every task
and writes a handoff note before every session ends.

## Latest handoff note

> **Date:** 2026-10-27
> **Done this session:** M0 complete (M0-4, M0-5, M0-6) and M1-1, M1-2 done — see task
> log. M1-2: `prisma/seed.ts` loads the 4 branches (addresses for Ikeja/Yaba/Surulere are
> placeholders pending Open Question Q5), 7 services, Lekki staff (Ada, Grace, Blessing,
> Zainab, Ronke, Ifeoma) + Kelechi at Ikeja + Tolu as owner (demo password `password1`,
> hashed with Node's built-in `scrypt` as a stand-in — M4 will re-seed with real Better
> Auth hashing), the global Settings row, and 10 sample bookings for "today" at Lekki
> spread across the 4 stylists with varied statuses (DONE/IN_SERVICE/CHECKED_IN/BOOKED/
> NO_SHOW) and one requested-stylist booking. Added `scripts/print-lekki-schedule.ts`
> (`npm run db:print-lekki`) to check the seed by eye — output matches the
> `ReceptionSchedule.dc.html` pattern.
> Added `tsx` as a dev dependency (logged in `docs/DECISIONS.md`) — Prisma's generated
> client uses extensionless ESM imports meant for bundler resolution, which Node's native
> TS runner can't resolve directly; `tsx` is Prisma's own documented fix. Added `@unique`
> to `Branch.name` and `Service.name` (needed for idempotent upserts in the seed script)
> as a follow-up migration.
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
> M1-3: `src/server/money.ts` (`calculateDepositKobo` — 20% rounded to the nearest whole
> naira, zero for walk-ins; `balanceDueKobo`) and `src/server/status.ts`
> (`getDisplayStatus` — booked/checkedInEarly/waiting/inService/done/noShow/cancelled,
> derived from stored status + the clock, never stored; `getWaitMinutes` — start minus the
> later of check-in and appointment time). 13 new unit tests covering early arrival, late
> arrival and walk-ins, as required. M1 milestone is now fully done.
> **Half-done:** none.
> **Next task:** M1 supervisor checkpoint — review the schema (including the
> BranchService-vs-derived-booleans simplification from M1-1, still pending explicit
> sign-off) and the seed data against `docs/PRD.md`. Do not start M2 until approved.
> **Blockers or questions:** all of M1 (M1-1, M1-2, M1-3) is on the `m1` branch as three
> separate commits (branch was renamed from `m1-data-model` partway through, per the
> supervisor's branch-per-milestone preference — see project memory); not yet pushed under
> the new name. Supervisor will push `m1` as a new `origin/m1` remote branch and can
> delete the stale `origin/m1-data-model` whenever convenient. Supervisor commits and
> pushes manually, no Co-Authored-By trailer, and wants one combined PR summary once the
> whole milestone is done rather than one per task (see project memory).

## Milestones

| Milestone | Status | Supervisor approved |
|---|---|---|
| M0 Foundations | Ready for review | |
| M1 Data model and seed | Ready for review | |
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
| 2026-10-27 | M1-3 | `src/server/money.ts` (deposit, balance due), `src/server/status.ts` (display status, wait time) | `npm run check` (23 unit tests total), `npm run build` |
| 2026-10-27 | M1-2 | `prisma/seed.ts` (branches, services, staff, settings, 10 sample Lekki bookings), `scripts/print-lekki-schedule.ts`, added `tsx` dev dependency | `npx prisma db seed`, `npm run db:print-lekki`, `npm run check`, `npm run build` |
| 2026-10-27 | M1-1 | Full Prisma schema (Branch, OpeningHours, Service, Staff, Customer, Booking, Settings) and migration | `npx prisma migrate dev` on a fresh database, `npm run check`, `npm run build` |
| 2026-10-27 | M0-6 | `README.md` with setup steps and a commands table; verified `CLAUDE.md` commands are current | `npm run check` |
| 2026-10-27 | M0-5 | Base components (Button, Card, Input, StatusBadge, Chip, CustomerShell, StaffShell), `/dev/components` page | `npm run check` (10 unit tests), `npm run e2e`, `npm run build`, visual check via screenshot |
| 2026-10-27 | M0-4 | Vitest + Playwright, `npm run check`/`test`/`e2e`/`typecheck` scripts, bumped `@types/node` to `^24` | `npm run check` (lint, typecheck, 3 unit tests), `npm run e2e` (1 test), `npm run build` |
| 2026-10-22 | M0-3 | Prisma + PostgreSQL (Docker for local dev), `.env.example`, `src/lib/db.ts` | `npx prisma migrate dev` against a fresh container; `npm run lint`, `npm run build` |
| 2026-10-22 | M0-2 | Tailwind design tokens (`@theme` in globals.css), Plus Jakarta Sans, `/dev/tokens` page | `npm run lint`, `npm run build`, manual check of `/dev/tokens` |
| 2026-10-22 | M0-1 | Scaffolded Next.js (TS strict, App Router, Tailwind, ESLint, Prettier) | `npm run lint`, `npm run build` pass |
