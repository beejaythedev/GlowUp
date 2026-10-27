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
> M3-2: `/book` (`src/app/book/page.tsx` server component fetching branches/services/
> settings, `BookingStep1Form.tsx` client component for the interactive picker), matching
> `Main.dc.html`. Branch defaults to the first branch by `createdAt` (Lekki, since seed
> order matches the PRD's branch listing order); tapping "Change" expands an inline list
> of all 4 branches rather than a separate screen (the design file doesn't show that
> step — reasonable interpretation, not literal). Picking a different branch re-filters
> services via `!service.nailsOnly || branch.offersNails` — the M1-1 nails-only
> derivation's first real exercise, confirmed working (Pedicure/Manicure show at Lekki).
> Added `formatDurationLabel` (`src/lib/duration.ts`) and `formatOpeningHoursLabel`
> (`src/lib/openingHours.ts`), both pure and unit-tested. Deposit amounts use M1-3's
> `calculateDepositKobo` with `source: "ONLINE"`.
> Hit a real Next.js 16 build issue: `/book` does a live, uncached DB read, which the
> "Cache Components" feature (enabled since M0-1's scaffold) refuses to prerender —
> fixed with `export const instant = false`, making it a per-request dynamic route
> (confirmed in the build output: `ƒ /book` vs `○` for the static pages). Worth knowing
> for any future page that reads the database directly.
> Investigated what looked like a strikethrough through every price on screen —
> confirmed via an isolated test page that it's the authentic ₦ (Naira Sign) glyph design
> (two horizontal bars through the N), reproducible even in a plain system font with no
> app styling involved. Not a bug, no change made.
> M3-3: `/book/time` (`page.tsx` server component + `BookingStep2Form.tsx` client
> component), matching `Time.dc.html` — first real caller of M2's availability engine.
> Server fetches the branch's active stylists and all their bookings across a 6-day
> window in one query, pre-splits them per day, and passes everything to the client as
> plain data; the client then calls `getAvailableSlots` (M2-1) directly in the browser —
> it's a pure function with no DB dependency, so this needed no new API route, just
> reusing what M2 already built. Stylist chips ("Any available" + each named stylist),
> a 6-day date strip, and a 10-minute time grid, all live-computed from the fetched data
> with no extra network round-trips as the customer changes stylist/date.
> For "Any available", added `resolveStylistForTime` (client-local, not exported from
> `availability.ts`): once the customer taps a specific time from the aggregated "any"
> list, it finds which stylist actually covers that exact time by calling
> `getAvailableSlots` once per stylist — simpler than reusing M2-2's soonest-free+
> fewest-bookings tie-break, which answers a different question ("what's the best slot
> to suggest") than this one ("who covers the slot the customer already picked").
> Extracted `src/lib/lagosTime.ts` (date-parts/instant/add-days/clock-time) from the
> Lagos-time pattern duplicated across `seed.ts` and the M1-2 print script — new app code
> only, didn't touch those two already-committed files.
> Verified end-to-end against seeded data: picking a 5-hour ranged service (braids) on
> today's date correctly showed "No times left" once today's real-world clock time had
> passed the computed last-start cutoff (2pm) — not a bug, confirmed by checking a future
> day instead, which showed the full 9:00am–2:00pm/10-minute grid exactly as expected.
> Confirmed the Continue link resolves correctly for both a requested stylist and "Any
> available" (resolving to a concrete stylist id with `stylistRequested=false`).
> M3-4: `/book/review` (`page.tsx` + `BookingStep3Form.tsx` + `actions.ts` Server Action
> `confirmBooking`), matching `Review.dc.html`. Name + Nigerian phone form (new
> `src/lib/phone.ts`, `normalizeNigerianPhone`/`isValidNigerianPhone`, unit-tested — 11
> digits, local `0` or `+234`/`234` country code, network prefix 7/8/9), booking summary
> card, free-cancellation deadline computed from `Settings.freeCancellationHours`.
> **Deliberate scope decision worth your sign-off:** the roadmap lists "hold countdown"
> under M3-4, but the schema requires `Booking.customerId` NOT NULL — a hold can't exist
> before we know who's booking, and name/phone are collected ON this same screen. Rather
> than fake a countdown for a hold that doesn't exist yet (misleading), or add a
> throwaway placeholder-customer pattern to work around the schema (meaningful extra
> complexity for a practice project), I read the PRD's own wording — "a slot is held for
> 10 minutes **while the customer pays**" — as support for creating the hold at
> submission, not at page-load. Tapping "Pay ₦X deposit" is a Server Action that
> validates input with Zod, re-checks the service/branch against the database (never
> trusts the screen), upserts the Customer by phone, and calls M2-3's `holdSlot` for the
> first time anywhere in the app — then redirects to `/book/pay?bookingId=...` (M3-5,
> not built yet), where a real, accurate countdown belongs since the hold genuinely
> exists by then.
> Verified end-to-end against the dev database: submitted the form, confirmed the created
> `Booking` row (correct `depositAmountKobo`, `depositStatus: PENDING`, `holdExpiresAt`
> exactly 10 minutes after `createdAt`, customer upserted with the normalized phone),
> then cleaned up the test row. Also verified the submit button stays disabled for an
> invalid phone number.
> M3-5: `src/server/payments/` — `PaymentProvider` interface (`types.ts`), `FakePaymentProvider`
> (`fake.ts`, always succeeds unless asked to fail via `forceFailure`), and the one
> `paymentProvider` instance app code imports (`index.ts`) — matches
> `docs/ARCHITECTURE.md`'s planned shape, swapping in Paystack later is changing one line.
> Added `confirmDeposit` to `src/server/bookings.ts`: marks a held booking's deposit
> `PAID`, refusing if the 10-minute hold already expired (`HOLD_EXPIRED`) so a customer
> can't pay for a slot that may have gone to someone else.
> `/book/pay` (`page.tsx` + `PayForm.tsx` + `actions.ts`): the real hold countdown promised
> in the M3-4 handoff now lives here, ticking down client-side from the booking's actual
> `holdExpiresAt`. A failed charge (including "Simulate a failed payment", a visible
> test-mode control since there's no real Paystack yet) leaves the hold untouched and shows
> an inline error so the customer can just press Pay again; an expired hold instead shows a
> "start again" message, no retry. On success, redirects to `/book/confirmed`.
> `/book/confirmed` (`page.tsx` + `ConfirmedScreen.tsx`), matching `Confirmed.dc.html`:
> bounces back to `/book/pay` if the deposit isn't actually `PAID` yet (no guessing from the
> URL alone). New `src/lib/bookingReference.ts` — `formatBookingReference` (a short
> "GU-XXXXXX" reference derived from the booking id's last 6 characters, no new column) and
> `maskPhone` ("0803 ••• 8888") for the SMS-sent confirmation line. "Directions" links to a
> Google Maps search on the branch address; "Call branch" is left as a static label since
> `Branch` has no phone number field in the schema (not required by any M3 task).
> Verified end-to-end against the dev database via a scripted Playwright run: booked braids
> at Lekki through all three steps, landed on `/book/pay`, clicked "Simulate a failed
> payment" and confirmed the hold survived with a visible error (screenshot), then paid for
> real and landed on `/book/confirmed` with the correct summary, reference and "arrive by"
> time (screenshot). Queried the DB directly to confirm `depositStatus: "PAID"`, then
> deleted the test booking/customer and the scratch script.
> M3-6: `src/server/messages/` — `MessageSender` interface (`types.ts`), `ConsoleMessageSender`
> (`console.ts`, logs `to`/`body`), and the one `messageSender` instance app code imports
> (`index.ts`) — same shape as M3-5's `payments/`. New `src/lib/confirmationMessage.ts`
> (`formatConfirmationMessage`, pure and unit-tested) builds the SMS body: service, branch,
> when, "Please arrive by…", deposit paid, booking reference. Sent from `/book/pay/actions.ts`
> right after `confirmDeposit` succeeds, before the redirect to `/book/confirmed`.
> Correction to last session's flagged note: I'd assumed a `Message` schema model was needed
> now because `docs/ARCHITECTURE.md`/`CLAUDE.md` describe messages as "stored in the messages
> table". Re-reading `docs/ROADMAP.md` before starting, the messages table, status tracking
> and `/api/jobs/run` scheduling are explicitly **M8-4** ("stored in the messages table with a
> status... processed by a `/api/jobs/run` endpoint"), not M3. M3-6 only asks for an immediate,
> unscheduled, console-logged message, so no schema change this task — M8-4 will persist
> messages (confirmation included) once the table exists.
> Verified against the dev database via a scripted Playwright run: booked braids at Lekki
> through all three steps and paid, confirmed the exact expected line appeared in the Next.js
> dev server log (`[message] to 08039992222: Hi M3-6, you're booked at GlowUp Lekki for
> Knotless braids on Sat 31 Oct, 9:00 am. Please arrive by 8:50 am...`). First run caught a
> real bug — `GlowUp ${branchName}` produced "GlowUp GlowUp Lekki" since branch names already
> start with "GlowUp" — fixed in `formatConfirmationMessage` and covered by a test asserting
> no doubled prefix, then re-verified the fix live before cleaning up the test rows.
> M3-7: `e2e/booking.spec.ts` — a guest books knotless braids at Lekki end to end (Welcome →
> step 1/2/3 → pay → confirmed), picking the first day in the 6-day window with a real
> available time slot rather than a hardcoded date, so the test keeps working as "today"
> moves. Asserts the confirmation heading, "Please arrive by…" line and `GU-XXXXXX`
> reference are visible, then checks the actual database row directly (branch, service,
> `depositStatus: PAID`, `status: BOOKED`) before deleting it.
> Also fixed `e2e/home.spec.ts`, which had gone stale since M3-1 replaced the placeholder
> home page — it still asserted a "GlowUp Salons" heading and a `/dev/tokens` link that no
> longer exist; updated it to check the real Welcome page heading and the "Book an
> appointment" link instead. `npm run e2e` hadn't been run since M0, so this was the first
> time either test was actually exercised against current code.
> One real build-vs-test-runner mismatch to flag: Playwright Test compiles spec files to
> CommonJS and can't load the Prisma generated client's `import.meta` usage directly —the
> same ESM/CJS mismatch `tsx` was added to fix for the seed/print scripts (M1-2,
> `docs/DECISIONS.md`), but Playwright doesn't go through `tsx`. Rather than changing the
> project's module system (`"type": "module"` in `package.json`) just for this, which would
> risk the Next.js build and other scripts, the e2e test's DB check/cleanup now runs through
> a small script (`scripts/e2e-booking-db.ts`) in a `tsx` child process, the same pattern
> already proven for `db:print-lekki`. No new dependency added.
> **M3 milestone is now fully done** — all of M3-1 through M3-7 complete. Ready for the
> supervisor checkpoint listed in `docs/ROADMAP.md`: book on a real phone, check it on a
> slow connection.
> **Next task:** none — waiting on the M3 checkpoint before M4 (Staff sign-in and roles)
> can start, per `CLAUDE.md` rule 6.
> **Blockers or questions:** the M3-4 hold-countdown placement needs explicit sign-off at
> this checkpoint, same treatment M1-1's BranchService simplification got at the M1
> checkpoint. The roadmap lists the countdown under M3-4, but it's actually built on
> `/book/pay` (M3-5), since no real hold exists until the customer submits their name/phone
> on the review screen. Full reasoning in the M3-4 and M3-5 entries above.
> Work is on the `m3` branch (off `m2`, approved), all seven tasks committed.

## Milestones

| Milestone | Status | Supervisor approved |
|---|---|---|
| M0 Foundations | Ready for review | |
| M1 Data model and seed | Approved | 2026-10-27 |
| M2 Availability engine | Approved | 2026-10-27 |
| M3 Customer booking | Ready for review | |
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
| 2026-10-27 | M3-7 | `e2e/booking.spec.ts` (guest books braids at Lekki, Welcome → confirmed), fixed stale `e2e/home.spec.ts`, `scripts/e2e-booking-db.ts` | `npm run e2e` (2 tests, run twice to confirm stability) |
| 2026-10-27 | M3-6 | `src/server/messages/` (`MessageSender`, `ConsoleMessageSender`), `src/lib/confirmationMessage.ts`, wired into `/book/pay/actions.ts` | `npm run check` (78 tests total), `npm run build`, scripted Playwright end-to-end check (confirmation line verified in the dev server log, caught and fixed a doubled "GlowUp" prefix) |
| 2026-10-27 | M3-5 | `/book/pay` (hold countdown, fake-provider payment), `/book/confirmed`, `src/server/payments/`, `confirmDeposit`, `src/lib/bookingReference.ts` | `npm run check` (76 tests total), `npm run build`, scripted Playwright end-to-end check (pay failure → retry → success, DB row verified, then cleaned up) |
| 2026-10-27 | M3-4 | `/book/review` step 3 (name/phone form, Server Action, first real `holdSlot` caller), `src/lib/phone.ts` | `npm run check` (69 tests total), `npm run build`, manual end-to-end check (verified the created DB row, then cleaned it up) |
| 2026-10-27 | M3-3 | `/book/time` step 2 (stylist/date/time), `src/lib/lagosTime.ts` | `npm run check` (59 tests total), `npm run build`, visual + manual end-to-end check via Playwright |
| 2026-10-27 | M3-2 | `/book` step 1 (branch + service choice), `formatDurationLabel`, `formatOpeningHoursLabel` | `npm run check` (54 tests total), `npm run build`, visual check via screenshot (3 states) |
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
