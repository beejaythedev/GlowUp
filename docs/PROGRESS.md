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
> M1 checkpoint review follow-up: supervisor approved the BranchService-vs-derived-booleans
> simplification as-is, and asked for one schema fix before moving on — added
> `Booking.cancelledAt` (nullable `DateTime`), needed to apply the 24-hour
> free-cancellation window later (M8-2). Added as its own migration
> (`20261027120710_m1_add_cancelled_at`) rather than reopening the M1-1 migration. M1 is
> now fully approved.
> M2-1: `src/server/availability.ts` — `getAvailableSlots`, a pure function (plain data
> in, no DB calls; a thin DB-fetching wrapper will be added when M3 needs a real caller).
> Core design decision worth flagging: the PRD's worked example (any-stylist 3:15,
> requested-Ronke 4:15 after an 11:00 braids booking) only works if each stylist's slot
> grid is anchored to when THEY become free, not a single clock grid anchored to branch
> opening — so "every 10 minutes" is per free-gap, not a fixed :00/:10/:20 grid across the
> whole day. Ranged-service blocking asymmetry (rule 8): an "any" search always uses a
> stylist's shortest-duration-plus-prep block; a specific requested-stylist search uses
> that SAME stylist's longest-duration-plus-prep block for their own ranged bookings.
> "Last start of day" uses only the longest duration (no prep added), matching the PRD's
> braids-2pm-on-7pm-close example exactly. Also folded in "ignore expired, unpaid holds"
> (the M2-3 behaviour) now, since M2-1's own description already asks for it. 11 unit
> tests cover all six required scenarios plus hold/cancellation edge cases.
> M2-2: `pickAnyAvailableStylist` in `src/server/availability.ts`, plus a private
> `getStylistSoonestFree` helper that reuses M2-1's per-stylist gap/candidate logic
> (short blocking, not the requested-stylist long-blocking lens, since "any" assignment
> doesn't carry that constraint). Picks whichever stylist's own earliest slot is soonest;
> ties broken by counting each tied stylist's active (non-cancelled) bookings that day,
> fewest wins. 5 new unit tests: soonest-free pick, tie-break, cancelled bookings excluded
> from the tie-break count, no stylist free that day, branch closed that day.
> M2-3: added the no-double-booking exclusion constraint deferred from M1-1/M2-1
> (`prisma/migrations/20261027123351_m2_3_no_double_booking` — `btree_gist`, exclude on
> `stylistId` + `tsrange(startsAt, blockedUntil)` for non-`CANCELLED` bookings). Added
> `holdSlot` in `src/server/bookings.ts`: inside one transaction, deletes any stale
> expired/unpaid hold for that stylist first (so a slot whose old hold expired is
> reclaimed without a background job), then inserts the new hold row; the exclusion
> constraint is what actually guarantees only one of two concurrent inserts for an
> overlapping range can win — `holdSlot` just turns that DB error into a clean
> `{ ok: false, reason: "SLOT_TAKEN" }` instead of throwing.
> One real snag: Prisma doesn't surface the underlying Postgres SQLSTATE (`23P01` for an
> exclusion violation) as `error.code` — that's always Prisma's own generic `P2039` for
> driver-level errors — so conflict detection has to pattern-match the constraint name in
> the error message instead. Confirmed by writing a throwaway debug script that dumped
> the real error shape before fixing the detection (script deleted after).
> This test genuinely needs a live database (it's proving real Postgres concurrency
> control, not something a mock can demonstrate), so `src/server/bookings.test.ts` opens
> its own `PrismaClient` against `DATABASE_URL` and creates/tears down its own fixture
> rows. Updated `vitest.config.mts` to load `.env` via Vite's `loadEnv` so `DATABASE_URL`
> reaches the test process. 5 new tests, including the required "two simultaneous holds,
> exactly one succeeds" case.
> M2-4: `getSoonestFreePerStylist` in `src/server/availability.ts` — reuses the private
> `getStylistSoonestFree` helper from M2-2 across every stylist, sorted soonest-first
> (stylists with nothing left today sort last). Matches `ReceptionNew.dc.html`'s
> "Stylist, soonest free first" picker exactly. 3 new tests, including the mockup's own
> worked example (Ifeoma 12:50, Zainab/Blessing tied at 1:30, Ronke 3:00). One test-fixture
> trap worth remembering: a stylist is only "busy" relative to a given `now` if their
> booking's `[startsAt, blockedUntil)` actually covers that `now` — a booking starting
> later than `now` leaves an earlier gap that's still offered, which doesn't match "Free
> at 1:30" unless the fixture's booking already started before `now`. M2 milestone is now
> fully done.
> M2 approved. M3-1: Welcome page (`src/app/page.tsx`, replacing the M0 placeholder),
> matching `Welcome.dc.html` — navy header with three decorative circles, feature list
> (live availability / deposit / SMS reminders) using existing tokens rather than the
> design file's exact (undocumented) icon colors, primary CTA to `/book`, "Sign in" link
> to `/staff/sign-in`. Extended `Button` to optionally render as a `next/link` Link when
> given `href`, so a navigating CTA still looks like a button — the first real consumer
> needing this; `/dev/components` still only shows the plain-button form. Visually
> checked against the design via screenshot; first pass had the accent circle overlapping
> the headline (needed more top spacing to clear both decorative circles, matching the
> original's stacked gap + padding-top) — fixed.
> **Half-done:** M3 milestone — M3-1 done; M3-2 through M3-7 not started.
> **Next task:** M3-2 — step 1, choose branch and service, matching `Main.dc.html`. Only
> services the branch offers (this is where the M1-1 nails-only derivation actually gets
> exercised by a real screen).
> **Blockers or questions:** work is on a new `m3` branch (off `m2`, approved). Not yet
> committed. `/book` (linked from the Welcome page) doesn't exist until M3-2.

## Milestones

| Milestone | Status | Supervisor approved |
|---|---|---|
| M0 Foundations | Ready for review | |
| M1 Data model and seed | Approved | 2026-10-27 |
| M2 Availability engine | Approved | 2026-10-27 |
| M3 Customer booking | In progress | |
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
| 2026-10-27 | M3-1 | Welcome page (`src/app/page.tsx`), `Button` now supports `href` | `npm run check` (48 tests total), `npm run build`, visual check via screenshot |
| 2026-10-27 | M2-4 | `getSoonestFreePerStylist` in `src/server/availability.ts` | `npm run check` (47 tests total), `npm run build` |
| 2026-10-27 | M2-3 | No-double-booking exclusion constraint (migration), `holdSlot` in `src/server/bookings.ts`, `vitest.config.mts` now loads `.env` | `npm run check` (44 tests total, including a live-DB concurrency test), `npm run build`, `npx prisma db seed` |
| 2026-10-27 | M2-2 | `pickAnyAvailableStylist` in `src/server/availability.ts` | `npm run check` (39 unit tests total), `npm run build` |
| 2026-10-27 | M2-1 | `src/server/availability.ts` — `getAvailableSlots` | `npm run check` (34 unit tests total), `npm run build` |
| 2026-10-27 | M1 checkpoint | Added `Booking.cancelledAt` (nullable), needed for the M8-2 refund window | `npm run check`, `npm run build`, re-ran `npx prisma db seed` |
| 2026-10-27 | M1-3 | `src/server/money.ts` (deposit, balance due), `src/server/status.ts` (display status, wait time) | `npm run check` (23 unit tests total), `npm run build` |
| 2026-10-27 | M1-2 | `prisma/seed.ts` (branches, services, staff, settings, 10 sample Lekki bookings), `scripts/print-lekki-schedule.ts`, added `tsx` dev dependency | `npx prisma db seed`, `npm run db:print-lekki`, `npm run check`, `npm run build` |
| 2026-10-27 | M1-1 | Full Prisma schema (Branch, OpeningHours, Service, Staff, Customer, Booking, Settings) and migration | `npx prisma migrate dev` on a fresh database, `npm run check`, `npm run build` |
| 2026-10-27 | M0-6 | `README.md` with setup steps and a commands table; verified `CLAUDE.md` commands are current | `npm run check` |
| 2026-10-27 | M0-5 | Base components (Button, Card, Input, StatusBadge, Chip, CustomerShell, StaffShell), `/dev/components` page | `npm run check` (10 unit tests), `npm run e2e`, `npm run build`, visual check via screenshot |
| 2026-10-27 | M0-4 | Vitest + Playwright, `npm run check`/`test`/`e2e`/`typecheck` scripts, bumped `@types/node` to `^24` | `npm run check` (lint, typecheck, 3 unit tests), `npm run e2e` (1 test), `npm run build` |
| 2026-10-22 | M0-3 | Prisma + PostgreSQL (Docker for local dev), `.env.example`, `src/lib/db.ts` | `npx prisma migrate dev` against a fresh container; `npm run lint`, `npm run build` |
| 2026-10-22 | M0-2 | Tailwind design tokens (`@theme` in globals.css), Plus Jakarta Sans, `/dev/tokens` page | `npm run lint`, `npm run build`, manual check of `/dev/tokens` |
| 2026-10-22 | M0-1 | Scaffolded Next.js (TS strict, App Router, Tailwind, ESLint, Prettier) | `npm run lint`, `npm run build` pass |
