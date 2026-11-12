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
> **M3 milestone is now fully done** — all of M3-1 through M3-7 complete.
> M3 checkpoint review: supervisor approved M3 as-is, including the M3-4/M3-5
> hold-countdown placement (the roadmap lists it under M3-4, but it's actually built on
> `/book/pay` since no real hold exists until the customer submits name/phone on the review
> screen — see the M3-4 and M3-5 entries above for the full reasoning). M3 is now fully
> approved and pushed to the remote `m3` branch.
> M4 started on a new `m4` branch (off `m3`). Before M4-1, checked `docs/TECH_STACK.md`'s
> own flag — "before M4, confirm how Better Auth handles phone number plus password" —
> and found Better Auth's `phoneNumber` plugin does support it, but its core `user` model
> always requires an `email` column we don't use, plus its own `user`/`session`/`account`/
> `verification` tables alongside `Staff`. Supervisor approved hand-rolling sign-in instead:
> passwords hashed into the existing `Staff.passwordHash`, our own session cookie. Logged in
> `docs/DECISIONS.md` (27 Oct 2026), and `docs/TECH_STACK.md`/`CLAUDE.md` updated to match —
> this is a real stack change, not just an implementation detail, so it's written down the
> same way the original Better Auth choice was.
> M4-1: `src/server/auth/` — `password.ts` (scrypt `hashPassword`/`verifyPassword`, extracted
> from `prisma/seed.ts` which now imports it instead of hashing inline — same hashing, no
> longer a stand-in), `lockout.ts` (pure `evaluateSignInAttempt`: wrong password increments
> a counter, the 5th consecutive failure locks the account for 15 minutes and resets the
> counter, an active lock refuses even the correct password), `session.ts` (HMAC-signed,
> timing-safe session token; "keep me signed in" controls a 30-day vs 24-hour expiry).
> New migration `20261027210000_m4_1_staff_lockout` adds `Staff.failedSignInAttempts` and
> `Staff.lockedUntil`. New `AUTH_SECRET` env var (`.env.example` updated) signs the cookie.
> `/staff/sign-in` (`page.tsx` + `SignInForm.tsx` + `actions.ts`) matches `StaffSignIn.dc.html`
> — phone + password, show/hide toggle, "keep me signed in" (defaulted checked, via a hidden
> `false` input before the checkbox so an unchecked box still submits a value), a single
> generic error for both "no such phone" and "wrong password" so neither is distinguishable
> to an attacker, and the lockout message once 5 attempts are reached.
> Also added a minimal `/staff` placeholder landing page (shows who's signed in, a sign-out
> button) — not a roadmap task, but sign-in needs *somewhere* to redirect to prove the
> session cookie actually works; M4-2 replaces it with the real per-role destinations.
> Verified live end to end against a throwaway test stylist account: correct password → signed
> in → sign out → back at sign-in; 5 wrong passwords → lockout message on the 5th, not just a
> generic error (an earlier pass got this wrong — fixed so the attempt that triggers the lock
> says so); correct password still refused while locked; show/hide toggle works. Deleted the
> test account afterward.
> M4-2: `src/server/auth/roleHome.ts` — pure `roleHomePath(role)`, mapping each `StaffRole`
> to its planned route from `docs/ARCHITECTURE.md`'s file tree (`RECEPTIONIST` →
> `/staff/reception`, `STYLIST` → `/staff/stylist`, `BRANCH_MANAGER` → `/staff/manager`,
> `OWNER` → `/staff/owner`). `src/server/auth/currentStaff.ts` — `getCurrentStaff()`, a
> shared "read the session cookie, verify it, fetch the row, treat REMOVED as signed-out"
> helper, pulled out so every staff page doesn't repeat that same seven lines.
> `/staff/sign-in/actions.ts`'s sign-in action now redirects to `roleHomePath(staff.role)`
> instead of the fixed `/staff` from M4-1. Since the real reception/stylist/manager/owner
> screens don't exist until M5–M7, each destination is a small shared placeholder
> (`src/components/staff/StaffSectionPlaceholder.tsx`) behind its real route — so M5-M7 just
> replace the placeholder's content at the same path, no route or redirect-logic churn later.
> `/staff` itself (M4-1's placeholder landing page) is now a plain dispatcher: signed in →
> `roleHomePath`, signed out → `/staff/sign-in`. `/staff/sign-in` redirects away the same way
> if a session cookie is already valid.
> Scope note: these placeholder pages only check "is someone signed in", not "is this
> *their* section" — a stylist can currently open `/staff/owner` and see the owner
> placeholder. That's deliberately left for M4-3 ("server-side permission checks on every
> staff page"), which is explicitly where that kind of role/branch authorization belongs
> per the roadmap, not a gap introduced by this task.
> One unrelated thing fixed in passing: `npm run check` failed on stale leftover rows in
> the dev database from an earlier crashed test worker in this session (a `PrismaClientKnownRequestError`
> unique-constraint chain in `src/server/bookings.test.ts`'s `beforeAll`/`afterAll` — each
> crashed run left one more row behind, compounding). Deleted the stray branch/customer/
> service rows by hand; not a code change, no regression in `bookings.test.ts` itself.
> M4-3: `src/server/permissions.ts` (the file `docs/ARCHITECTURE.md` already names for this)
> — `canViewBooking(staff, booking)` (a stylist only their own; a receptionist or branch
> manager only their branch; the owner, anything — the exact wording of `CLAUDE.md` rule 3),
> `canViewBranch(staff, branchId)`, and `canAccessStaffSection(staff, section)` (which
> `/staff/<section>` pages a role may open; the owner, all of them). All pure and unit
> tested directly against the roadmap's own done-when wording — a stylist can't view
> another stylist's booking, a branch manager can't view another branch's.
> No real booking-list page exists yet to call `canViewBooking`/`canViewBranch` against —
> those come with M5 (reception schedule) and M6 (stylist today) — so today they're tested
> at the pure-function level, ready to wire into those queries when built. There are also no
> `/api/*` routes yet (M8 adds the first ones); "every API route" has nothing to check yet.
> What *is* real now: `src/server/auth/requireStaffSection.ts` wraps
> `getCurrentStaff`/`canAccessStaffSection`/`roleHomePath` into one guard, now used by all
> four `/staff/<section>` placeholder pages — closing the gap flagged in M4-2 (a stylist
> could open `/staff/owner`). A signed-in staff member visiting a section that isn't theirs
> is redirected to their own, not shown someone else's screen, not just hidden navigation
> (`CLAUDE.md` rule 3 — "never only by hiding buttons").
> Verified live: Blessing (stylist) lands on `/staff/stylist` and is bounced back there from
> `/staff/reception`, `/staff/manager` and `/staff/owner`; Tolu (owner) can open all four;
> signed out, every section redirects to sign-in. (First pass of the check script had a bug,
> not the app — `waitForURL(/\/staff\//)` also matches `/staff/sign-in` itself, so it looked
> like sign-in was failing when it wasn't; fixed the script, not the code, and re-verified.)
> **M4 milestone is now fully done** — all of M4-1 through M4-3 complete. Ready for the
> supervisor checkpoint in `docs/ROADMAP.md`: sign in as each seeded role. Demo password for
> every seeded staff account is `password1` (phones listed in `prisma/seed.ts`, e.g. Ada the
> Lekki receptionist is `0802 000 0002`).
> M4 checkpoint: supervisor approved M4 and moved straight to starting M5, pushed to the
> remote `m4` branch. M5 started on a new `m5` branch (off `m4`).
> M5-1: `src/server/schedule.ts` — pure layout/display logic for the schedule grid, kept
> separate from the page so the pixel math and status-line wording are unit tested without
> a browser: `layoutStylistBookings` (positions each booking's block by minutes-since-open,
> plus a separate prep block when the service has prep time; a minimum block height so very
> short services stay readable; cancelled bookings are left out entirely — the slot is just
> free again), `getStylistStatusLine` ("Busy until…", "Customer waiting", "Free at…" during
> a mid-prep gap, "Next: Name at…", or "Free for the rest of today" — in that priority
> order), `getNowLineTopPx`/`getHourMarks`/`getGridHeightPx` (time-axis math), and
> `summarizeDay` (the four summary tiles, including the longest current wait among waiting
> customers).
> `/staff/reception` (`page.tsx` + `ReceptionScheduleView.tsx`) replaces the M4-1/M4-2
> placeholder with the real thing, matching `ReceptionSchedule.dc.html`: nav bar, summary
> tiles, one column per stylist with colour-coded blocks and striped prep blocks (new
> `.schedule-prep` CSS pattern in `globals.css`, token-driven, not raw hex), the "now" line
> and dot, and a status/colour legend. New `src/components/staff/AutoRefresh.tsx` calls
> `router.refresh()` every 30 seconds so the grid stays live without a manual reload —
> App Router's own re-fetch, not a custom polling endpoint.
> Deliberately left out of this task, staying inside M5-1's actual scope: the search box and
> "New booking" button from the design (M5-3 and M5-4 build those — a dead search field or a
> button linking to a page that doesn't exist yet would be a half-finished feature, not a
> faithful placeholder), and the right-hand booking detail panel with its timeline and
> Start/Move/Undo actions (M5-2's job entirely) — booking blocks are plain, non-interactive
> display for now rather than buttons that do nothing when clicked.
> Verified live against the seeded Lekki data as Ada (receptionist): all 10 bookings render
> in the right columns with correct colours, prep stripes show after services that have
> them, the now-line/dot sit at the right time, and the summary tiles match. Had to re-run
> `npx prisma db seed` first since the seed's "today" bookings were dated 27 Oct and the
> system date has since moved to 2 Nov — not a bug, just stale sample data; re-seeding is
> the documented way to refresh it (`README`/`CLAUDE.md` commands).
> One Windows-only flake noted, not fixed (same class seen earlier this session with a
> vitest worker): `npx prisma db seed` crashed once with exit code 3221226505 (a Windows
> access violation) then succeeded immediately on retry. Not reproducible on demand, not
> something `npm run check` or the app code can detect or correct — just worth remembering
> if a command fails with that exact exit code: retry before assuming a real bug.
> M5-2: `src/server/status.ts` gained the other half of what `docs/ARCHITECTURE.md` always
> said belonged there — `isActionAllowed`/`allowedFromStatuses`, one `ALLOWED_FROM` map that
> is the single source of truth for which stored `BookingStatus` each of the seven actions
> may start from (check in only from `BOOKED`; start only from `CHECKED_IN`; finish only
> from `IN_SERVICE`; undo-check-in only from `CHECKED_IN`; no-show only from `BOOKED`
> — a checked-in customer showed up, so they can't retroactively be a no-show; cancel and
> move both only before service starts). `src/server/bookings.ts` gained the seven DB
> functions (`checkIn`, `startService`, `finishService`, `undoCheckIn`, `markNoShow`,
> `cancelBooking`, `moveBooking`), each a single `updateMany` guarded by that same allowed-
> status list, so the status check and the write happen atomically — two staff members
> tapping the same button at once can't both succeed, the same safety property `holdSlot`
> already had for double-booking. `moveBooking` reuses `holdSlot`'s `isSlotConflict` pattern:
> reassigning to a stylist who's already booked then fails the DB's own exclusion constraint
> and reports `SLOT_TAKEN` instead of throwing.
> `/staff/reception` now has a real booking panel: clicking a schedule block (a `Link` to
> `?bookingId=...`, so selection is server-rendered and shareable, not client state) opens
> `BookingPanel.tsx` — customer, service, stylist, deposit, a timeline (appointment/checked-
> in/started/finished, pending rows shown as "–"), a late-arrival note when relevant, and
> only the action buttons that `isActionAllowed` says are valid for the booking's current
> status. One server action (`performBookingAction` in `actions.ts`) handles all seven
> actions — `action` is a hidden form field each button sets, matching the pattern from
> M3-5's pay/simulate-failure buttons — and re-checks `canViewBooking` (M4-3) before doing
> anything, so this is also where that permission check gets its first real caller.
> Two scoping decisions, deliberately kept narrow: "Move booking" reassigns to a different
> stylist at the *same* time only (a dropdown of the branch's other active stylists, no new
> time-and-stylist picker UI) — covers the common case ("that stylist's out today, move to
> someone else") without building a second availability widget; and plain check-in has no
> "arrived 5/10 min ago" correction — that's M5-3's dedicated check-in flow with search, a
> different entry point from this panel's one-tap check-in.
> Also fixed in passing: `/staff/reception` 404'd for the owner, even though `canAccess-
> StaffSection` (M4-3) explicitly lets the owner into every section — there's no branch-
> switcher, so an owner has no branch to show a schedule for. Now redirects to `/staff/owner`
> instead of a dead end.
> Verified live against seeded Lekki data as Ada: selected a `BOOKED` slot and walked it
> through check in → start (backup) → finish (backup), watching the schedule block's colour,
> the panel's badge/timeline, and the summary tiles update correctly at each step (including
> the late-arrival note, since the seeded appointment time had long passed); moved a
> different booking to another stylist and confirmed it reappeared in the right column; and
> confirmed a `DONE` booking's panel shows the timeline with no action buttons. Re-seeded
> afterward (`npx prisma db seed`) to restore the dev database's clean baseline, since this
> task's actions genuinely mutate the seeded bookings rather than just creating throwaway
> test rows.
> M5-3: new `src/server/checkInSearch.ts` — pure `matchesQuery`/`searchBookings` (name, phone
> ignoring spaces/dashes, or service name, case-insensitive), `highlightMatch` (splits text
> around the first hit for `<mark>` rendering) and `formatTimeUntil` ("in 10 min", "in 4
> hrs", "15 min ago", "now").
> Refactored `buildSelectedBooking`/`fetchTodaysBookings` out of `/staff/reception/page.tsx`
> into `receptionData.ts` so both the schedule page and the new check-in page share the same
> booking-detail logic — no behaviour change, just avoiding duplicating it.
> New `/staff/reception/check-in` (`page.tsx` + `CheckInSearchView.tsx` + `SearchBox.tsx`)
> matches `ReceptionCheckIn.dc.html`: a debounced live search (`SearchBox` updates the `q`
> URL param as the receptionist types, so results and the selected panel are still server-
> rendered and shareable, not client state) over today's not-yet-checked-in bookings,
> showing time/relative-time, the matched name highlighted, service/stylist/masked phone,
> and a deposit badge. Selecting a result (or the soonest one, selected by default) reuses
> M5-2's `BookingPanel` for the detail side — including the lateness correction added to it
> this task — rather than a second, parallel detail component.
> The "arrived 5/10 min ago" correction (`CheckedInOnTime.dc.html`'s "Did they arrive
> earlier?") lives directly in `BookingPanel`, shown next to the Check In button whenever
> `canCheckIn` is true — so it's available both from this search page and from clicking a
> `BOOKED` block on the main schedule, one implementation instead of two. The schedule page
> also gained a "Check in a customer" header button linking here, closing the gap M5-1
> deliberately left open.
> Deliberate simplification: unlike the design's inline per-row "Check in" button, a result
> row here only selects — actually checking in happens through the (now lateness-aware)
> panel. One check-in code path, not two, at the cost of one extra click for the common
> case. Also skipped the toast-banner confirmation `CheckedInOnTime.dc.html` shows after
> checking in — once checked in, `BookingPanel` itself already shows the updated badge,
> timeline and Start button, which reads as confirmation enough without a second component.
> Verified live against seeded Lekki data as Ada: searching "Ngozi" correctly narrowed the
> list to her booking with the match highlighted; picked "5 min ago" and checked her in,
> then confirmed directly in the database that `checkedInAt` landed ~5 minutes before the
> actual click time and `status` was `CHECKED_IN`.
> One real bug caught and fixed during this: the dev server had a second, stale
> `next dev` process still listening on port 3000 since M5-2's checks (`pkill -f "next dev"`
> doesn't match Next 16's persistent Turbopack dev daemon on Windows) — it kept serving
> pre-refactor compiled code, which is why an early check showed unfiltered search results
> and a dev-overlay "1 Issue" badge. Found via `netstat -ano | find ":3000"` plus the PID in
> the "Another next dev server is already running" message, killed by PID
> (`taskkill /PID <id> /F`), confirmed fixed on a truly fresh server. Not a code bug — a
> repeat-visit trap in this Windows dev environment worth remembering for future sessions.
> M5-4: `src/server/bookings.ts` gained `shouldAutoCheckIn` (pure — true only for a `WALK_IN`
> whose chosen time starts within one availability slot step of now, i.e. "right away"; a
> walk-in booked for later today, or any phone booking, still needs a real check-in) and
> `createReceptionBooking`, reception's own booking-creation path — deliberately not
> `holdSlot`: that function's 10-minute hold exists for a customer actively paying online
> right now, which doesn't apply here (a phone booking's deposit link, sent by SMS once
> M8-3 exists, has no such rush). Reception always picks one specific stylist on this
> screen, so `stylistRequested` is always true. Still protected by the same no-double-
> booking exclusion constraint `holdSlot` relies on, reusing its `isSlotConflict` pattern.
> `/staff/reception/new` (`page.tsx` + `NewBookingForm.tsx` + `actions.ts`) matches
> `ReceptionNew.dc.html`: Walk-in/Phone call toggle, a phone field that looks up a returning
> customer as reception types (`lookupCustomer` Server Action, debounced, pre-fills the name
> field only if the receptionist hasn't already typed one), service chips, "Stylist, soonest
> free first" (reusing M2-4's `getSoonestFreePerStylist`, built for exactly this screen and
> not called from anywhere until now), and up to 3 concrete times from `getAvailableSlots`
> for the chosen stylist, computed client-side with no round trip — the same
> fetch-once-compute-in-the-browser architecture as the customer booking flow's step 2.
> The schedule page gained the "New booking" header button to match, alongside M5-3's
> "Check in a customer" — the header is now what `ReceptionSchedule.dc.html` always showed.
> Deliberate scoping: "Another day" links to the customer-facing `/book` flow instead of
> building a second multi-day picker inside the reception tool — this screen is for
> same-day walk-ins and phone calls, matching the design's own same-day focus.
> One real bug caught before it shipped: the submit button lives in the summary sidebar,
> outside the `<form>` element (matching the design's layout) — the first attempt used
> `document.querySelector("form")`, which actually grabbed the nav's sign-out form instead
> (it comes first in the DOM). Fixed with the standard HTML `form="id"` attribute, which
> associates a button with a form anywhere in the document regardless of DOM position.
> Verified live against seeded Lekki data as Ada: a new walk-in customer, submitted with
> the default "first free" slot selected, landed on the schedule already `CHECKED_IN`
> (green block, Start-service button ready) exactly as the copy promises; a phone booking
> for a different new customer landed as a plain `BOOKED` row with `depositStatus: PENDING`
> and a visible balance-due figure, not checked in. Checked the dev server wasn't a stale
> leftover first (`netstat`), per the M5-3 lesson. Deleted the two test customer rows
> afterward (the reseed already clears Lekki's bookings, but not arbitrary customers).
> M5-5: `src/server/schedule.ts` gained `isOverdueForCheckIn` (pure — true only for a
> `BOOKED` booking 15+ minutes past its appointment time; already checked in, started, or
> otherwise resolved stops counting) and `findOverdueBookings` (sorts the overdue ones
> soonest-due first, matching `docs/PRD.md`'s safety-net rule 5).
> New `CheckInPromptModal.tsx` on `/staff/reception` shows one at a time, matching
> `CheckInPrompt.dc.html`: "Has [name] arrived?", due time/stylist/how-overdue, four arrival
> options (Just now/5/10 min ago/**On time** — a fourth option beyond M5-3's three, computed
> as exactly the booking's own minutes-late so "on time" means "arrived when she was due",
> not "just now"), Check in / No-show, and "Not yet, ask again in 5 min". It reuses M5-2's
> `performBookingAction` directly — no new server action needed, since check-in and no-show
> were already generic.
> Snoozing is deliberately client-state-only, not persisted: a `setTimeout` clears it after
> 5 minutes, matching "ask again in 5 min" as a request to be left alone briefly, not a
> stored preference that should survive a reload. The next overdue booking (if several are
> waiting) shows as soon as the current one is dismissed, checked in, marked no-show, or its
> snooze expires.
> One React purity rule caught at lint time, not by hand: the first version read
> `Date.now()` directly during render to compare against snooze expiry timestamps, which
> React's new purity lint flags (render must be deterministic). Fixed by snoozing with a
> boolean flag cleared by a scheduled timeout instead of a stored expiry time compared
> against the clock on every render — simpler, and avoids the impurity entirely.
> Verified live against seeded Lekki data as Ada: no bookings were actually overdue at the
> real "now" this session (seed times are fixed clock times, not relative to when seed
> runs), so created one throwaway booking 20 minutes in the past to exercise the path —
> confirmed the prompt appeared with the right "20 min ago" text, that snoozing made it
> disappear, and that picking "On time" and checking in landed `checkedInAt` within seconds
> of the booking's actual `startsAt` in the database. Deleted the test booking and customer
> afterward.
> M5-6: turned out to be mostly already done — M5-2's `BookingPanel` already showed
> "Blessing · Requested" next to the stylist name, since `stylistRequested` was already
> part of `SelectedBooking`. The only real gap was the schedule grid itself: added
> `stylistRequested` to `ScheduleBooking`/`ScheduleBlock` in `schedule.ts` (plain
> passthrough, carried onto the block by `layoutStylistBookings`) and a small round "R"
> badge next to the customer name on the block, plus a matching legend entry — compact by
> design, since blocks can be as short as 24px tall and a full `StatusBadge` pill wouldn't
> fit.
> Verified live against seeded Lekki data: Amaka Chukwu's booking (seeded with
> `stylistRequested: true`, requesting Zainab) shows the "R" badge on her schedule block and
> "Zainab · Requested" in the panel once selected. Had to dismiss M5-5's overdue prompts
> first to reach the schedule underneath — expected, not a bug.
> M5-7: `src/server/schedule.ts` gained `isRunningOver` (true once an `IN_SERVICE` booking
> is within 15 minutes of — or past — its booked end, Finish not yet tapped;
> `docs/PRD.md` rule 9) and `getFlaggedBookingId` (the same stylist's next `BOOKED`/
> `CHECKED_IN` booking after a running-over one, soonest first). Both take just the handful
> of fields they need (`Pick<ScheduleBooking, "id" | "startsAt" | "endsAt" | "status">`)
> rather than the full type, so `receptionData.ts` can reuse them against raw Prisma rows
> without an unsafe cast. `layoutStylistBookings` now carries `runningOver`/
> `flaggedForDelay` onto every `ScheduleBlock`, computed per stylist from that stylist's own
> bookings — no cross-stylist lookup needed, since rule 9 is explicitly about one stylist
> running over on their own schedule.
> On the schedule grid: a running-over block switches from solid blue to the same amber
> used for "checked in, waiting" (same underlying meaning — the customer, or in this case
> the next customer, is left waiting), with its time label changed to "Running over"; the
> flagged next booking gets a small ⚠ marker next to the customer name, plus a matching
> legend row. `BookingPanel` shows the same "Running over" badge when a selected booking
> hits that state, and a new amber note on a flagged booking: for an "any stylist" booking,
> points at the existing Move control already built in M5-2 rather than adding a second way
> to do the same thing; for a requested one, a disabled "Send delay message" button with a
> tooltip explaining the actual SMS send arrives in M8 — matching the scoping precedent set
> in M5-4 for the phone-deposit-link placeholder.
> `buildSelectedBooking`'s signature grew an `allTodaysBookings` parameter (both
> `/staff/reception` and `/staff/reception/check-in` already had this data fetched; just
> needed to pass it through) so it can filter to the selected booking's own stylist and
> reuse the same two schedule.ts functions, rather than duplicating the running-over logic
> for the panel.
> Verified live against a deliberately constructed scenario (a stylist mid-service, 50
> minutes in on a 1-hour booking, plus a next booking 20 minutes after it ends) — and, as a
> bonus, against the seed data itself: by 5pm several seeded in-service bookings had
> genuinely run past their booked end, so the amber styling, "Running over" label, and ⚠
> markers all appeared correctly without needing the constructed scenario at all. Checked
> both panels: the running-over booking's own panel shows the amber badge and Finish
> button; the flagged next booking's panel shows the delay note and, since it was an
> any-stylist booking, the "move to a free stylist" guidance pointing at the Move control.
> Deleted the two constructed test customers afterward; the reseed already cleared the
> bookings.
> M5-8: no code change — this is a verification task against screens M5-3 and M5-4 already
> built, so I ran it for real rather than reasoning about it. Scripted a Playwright pass
> counting only genuine UI interactions (typing a phone number or name doesn't count as a
> "tap"; navigating to the screen and the final submit do):
> - **Walk-in booking, from the schedule:** tap "New booking", type phone + name, tap "Add
>   to schedule" — **2 taps**, against a target of 5 or fewer. The defaults do the work:
>   Walk-in is already selected, the first service is pre-selected, `getSoonestFreePerStylist`
>   (M5-4) auto-picks the soonest-free stylist, and the first available time is
>   auto-selected.
> - **Check-in from search:** type a name, tap "Check in" — **1 tap**, against a target of 2
>   or fewer. The matching result is already the default-selected one (soonest match), and
>   "Just now" is the default arrival option, so no selection tap is needed before Check in.
> Verified both actually completed, not just navigated: queried the database directly
> afterward and confirmed the walk-in landed `CHECKED_IN` and Ngozi's booking did too.
> Deleted the test booking/customer and re-seeded.
> **M5 milestone is now fully done** — all of M5-1 through M5-8 complete. Ready for the
> supervisor checkpoint in `docs/ROADMAP.md`: run a pretend busy morning with 10 bookings —
> this is the screen Ada will test first.
> **Next task:** none — waiting on the M5 checkpoint before M6 (Stylist) starts, per
> `CLAUDE.md` rule 6.
> **Blockers or questions:** none open.
>
> **Out-of-roadmap fixes, requested directly during M5 checkpoint review (new `m3-fixes`
> branch off `m5`, since these are customer-booking (M3) issues, not reception ones):**
> 1. **"No time to pick" dead end, root-caused:** Ikeja, Yaba and Surulere have zero
>    `STYLIST`-role staff seeded (only Lekki has stylists; `docs/OPEN_QUESTIONS.md` Q5 —
>    real staff lists for those three branches — is still open, Tolu hasn't sent them). A
>    branch with no stylists always showed "No times left" on every single date, for every
>    service, with no indication of why — not a bug in the availability engine itself
>    (verified: `getAvailableSlots` is correctly returning empty when there's nothing to
>    iterate over), but a real dead end for a customer who picked one of those branches.
>    Fixed in `src/app/book/page.tsx`: branches with no active stylists are no longer
>    offered in step 1 at all (only `GlowUp Lekki` shows today), with a plain "no branches
>    are taking online bookings yet" fallback if that ever became zero. Deliberately did
>    **not** fabricate stylist names for the other three branches — that data belongs to
>    Q5, not to me.
> 2. **No way back to the customer home page during booking:** every step's "GlowUp"
>    wordmark (step 1, pay, confirmed) is now a `Link` to `/`; steps 2 and 3, which only had
>    a back-to-previous-step chevron and no room for the wordmark, gained a small home-icon
>    link next to it. Same pattern repeated in three files rather than a shared component,
>    since each header's layout is already slightly different.
> 3. **Responsive design — the whole customer flow (and staff sign-in, which shares
>    `CustomerShell`) was a fixed `max-w-md` mobile frame even on desktop.** `CustomerShell`
>    now stays exactly as before on phones, but from the `sm` breakpoint up it stops growing
>    past a comfortable `max-w-xl` and sits as a centred card (shadow, rounded corners,
>    subtle background) instead of a narrow mobile strip floating in empty space. No
>    per-page grid rework needed — widening the shared shell was enough, since the existing
>    `flex-wrap` chip/grid layouts already breathe better with more room. Welcome's
>    navy-header decorative circles (anchored to corners, not fixed centre positions)
>    held up fine at the wider width too.
> Verified live at 390px (phone), 820px (tablet) and 1440px (desktop) across the whole
> booking funnel (home → step 1 → step 2 → step 3 → pay → confirmed), screenshotting each;
> confirmed the branch picker now shows only Lekki; completed a real booking end to end at
> desktop width and checked it landed correctly in the database before cleaning it up.
>
> **Follow-up same session (still `m3-fixes`):** supervisor asked why Ikeja/Yaba/Surulere
> and their services weren't showing — that was fix 1 above working as designed (hiding
> unstaffed branches), but the supervisor preferred all 4 branches to be bookable now
> rather than wait on Q5. Added placeholder `STYLIST` staff for Ikeja (Chioma, Tunde), Yaba
> (Amara, Seun) and Surulere (Ebele, Dapo) in `prisma/seed.ts`, clearly commented as
> placeholders to replace once Tolu's real staff list lands (Q5 is still open — only the
> "hide the branch" workaround from fix 1 is no longer needed in practice, not removed from
> the code). Re-seeded and verified live with Playwright: Ikeja now shows "Any available"
> plus the two named stylists, and a full grid of real time slots for Knotless braids with
> no "No times left" anywhere.
> **Next task:** none further requested; still waiting on the M5 checkpoint (and now also
> this fix branch) before M6 starts.
> **Blockers or questions:** whether Q5's real Ikeja/Yaba/Surulere staff lists are likely
> soon — until they land, those three branches stay invisible to customers rather than
> showing a dead end, which seems like the right trade-off but is worth confirming.
>
> **M6 Stylist started (new `m6` branch off `m3-fixes`)** — supervisor confirmed M5 and the
> `m3-fixes` fixes were pushed and asked to carry on, which stood in for the M5 checkpoint
> review (CLAUDE.md rule 6).
> **M6-1 done:** stylist "Today" view at `/staff/stylist`, matching `StylistToday.dc.html`.
> Pure logic in `src/server/stylistToday.ts` (23 new unit tests): `selectCurrentCard` picks
> the one booking to show — in-service beats checked-in-and-waiting beats the soonest still-
> booked appointment beats none, cancelled bookings ignored; `getEarlierBookings` (done/
> no-show, oldest first); `getPrepWindow` (the prep time still blocking the stylist after an
> in-service booking ends — never shown to customers per rule 7, but useful on the stylist's
> own screen); `getHeadline`/`getNowChipLabel`/`getFooterNote` for the copy. Data layer
> `src/app/staff/stylist/stylistData.ts` fetches one stylist's bookings for the day (reusing
> the `isFirstVisit` lookup pattern from `receptionData.ts`). `actions.ts` adds a stylist-
> scoped `performStylistAction` (START/FINISH only) on top of the existing `startService`/
> `finishService`/`canViewBooking` from M5-2/M4-3 — a stylist can only act on their own
> booking, enforced server-side, not just by hiding the button. View auto-refreshes every
> 30 seconds like reception's schedule (M5-1). No new design tokens added — the mockup's
> lighter-navy tab-switcher background is approximated with `bg-white/10` over
> `bg-brand-navy` rather than introducing a new hex value.
> Verified live with Playwright, twice: once against stale seeded bookings (correctly showed
> the "Nothing booked for you today" empty state, since the seed's "today" had drifted to a
> past date), then again after re-seeding — signed in as Blessing, confirmed the NOW card
> (in service, Funke Lawal, tags, prep-time row, "Finish service" button), tapped Finish, and
> confirmed the page correctly moved to "Next up: Ngozi" (her booking is BOOKED but not yet
> checked in, so no action button — just a "waiting for reception to check in" note) with
> Funke's booking now under "Earlier today" as Done.
> **M6-2 done:** stylist "Tomorrow" view at `/staff/stylist/tomorrow`, matching
> `StylistDay.dc.html`. Pure logic in `src/server/stylistTomorrow.ts` (10 new unit tests):
> `summarizeTomorrow` (client count, earliest start, latest finish — cancelled bookings
> excluded), `getTomorrowHeadline` (client-count based rather than the mockup's literal
> "fully booked" wording, since knowing a branch is "full" would need capacity data this
> milestone doesn't have), `formatDurationLabel` ("2 hrs" / "1 hr" / "1.5 hrs" / "45 min").
> Reused `stylistData.ts`'s `fetchStylistDayBookings`/`toStylistBookings` from M6-1 as-is —
> only the day-range passed in differs (`addLagosDays(today, 1)`). No action buttons on this
> view, by design: tomorrow's bookings aren't checked in yet, so there's nothing for the
> stylist to tap.
> Verified live with Playwright: signed in as Blessing, navigated Today → Tomorrow and back,
> confirmed the empty state ("Nothing booked for you tomorrow", no summary tiles, the
> "check back closer to tomorrow" message, the overnight-changes footer note) since the seed
> only creates bookings for today. The populated-row rendering (summary tiles, per-row
> duration/tags) is covered by the same components and tags already verified live in M6-1
> plus the 10 new unit tests, rather than re-seeding fake tomorrow data to screenshot it too.
> **M6-3 done — verification only, no new code.** `performStylistAction` (M6-1) calls the
> exact same `startService`/`finishService` from `src/server/bookings.ts` that reception's
> `BookingPanel` already uses (M5-2), and both `/staff/reception` and `/staff/stylist` read
> the DB live on every request (`export const instant = false`), so there's no second code
> path or cache that could drift. Proved this with a real cross-view trace instead of just
> asserting it: signed in as Ada (reception) and Zainab (stylist) in parallel, had Zainab tap
> Start then Finish on Amaka Chukwu's booking from her own stylist screen, and reloaded
> Ada's reception schedule after each tap with no action on Ada's side — the schedule block,
> booking panel timeline and status all updated correctly every time (checked-in → in
> service → done), with matching timestamps and wait time in both views.
> Flagged, not fixed (pre-existing, predates M6, not something this milestone introduced):
> a Next.js 16 dev-console warning that `getCurrentStaff`/`verifySessionToken` (M4 auth)
> calls `new Date()` during prerendering without a dynamic-data wrapper. Appears on both
> `/staff/reception` and `/staff/stylist`; doesn't affect either page's behaviour. Worth a
> look if it starts failing a build rather than just warning.
> **M6 milestone is now fully done** — M6-1 through M6-3 complete. Ready for the
> supervisor checkpoint in `docs/ROADMAP.md`: use it on a phone with one hand.
> **Next task:** none — waiting on the M6 checkpoint before M7 (Manager and owner) starts,
> per `CLAUDE.md` rule 6.
> **Blockers or questions:** the Next.js prerendering warning above, and whether it's worth
> a quick fix now or can wait until it's actually load-bearing.
>
> **M7 Manager and owner started (new `m7` branch off `m6`)** — supervisor said carry on,
> standing in for the M6 checkpoint review per the pattern established at M4→M5 and M5→M6.
> **M7-1 done:** branch manager "Today" view at `/staff/manager`, matching
> `ManagerToday.dc.html`. Four summary tiles (bookings today with a booked-ahead/walk-in
> split, waiting now with longest wait, no-shows, deposits received), a bookings table
> (time/customer/service/stylist/status/deposit, reusing the same status-badge styling as
> reception), a money card (deposits paid, kept from no-shows, refunded, expected at the
> till), and a CSV day-report download at `/staff/manager/day-report`.
> Pure logic in `src/server/managerToday.ts` (9 new unit tests): `splitBySource` (booked-
> ahead vs walk-in — deliberately merges ONLINE and PHONE into one "booked ahead" bucket
> rather than literally matching the mockup's "online" label, since phone bookings are
> booked ahead of time just like online ones, and the mockup's sample data simply happens to
> have none to show the difference); `summarizeManagerMoney` (deposits received counts
> KEPT and REFUNDED alongside PAID, since the money was still collected either way; expected
> at the till excludes no-shows and cancellations); `buildDayReportCsv`. Reused M5-1's
> `summarizeDay` from `schedule.ts` as-is for the bookings-today/waiting/no-show tiles,
> rather than re-deriving the same thing. Refunded is always ₦0 for now — `cancelBooking`
> doesn't touch `depositStatus` yet, that's M8-2's refund rule.
> Verified live (signed in as Grace, branch manager at Lekki): all four tiles showed
> plausible numbers against the real seeded data, the bookings table's 10 rows matched the
> schedule exactly with correct status-badge colours, the money card's math checked out
> (expected-at-till = sum of balances for everything except the no-show), and the CSV
> download returned the right `Content-Disposition`/`Content-Type` with rows matching the
> on-screen table exactly, including correct quoting of a deposit value containing a comma.
> **M7-2 done:** owner "Overview" at `/staff/owner`, matching `OwnerOverview.dc.html`. Four
> company-wide tiles (bookings this week, booked-online share, no-show rate, deposits
> received), a four-branch comparison table, a bookings-by-branch bar chart, and a "needs
> your attention" list. Skipped the mockup's "All branches / Lekki / Ikeja / Yaba / Surulere"
> filter buttons — not called for by this task's roadmap bullet, and the tiles are already
> company-wide, so a per-branch filter would mostly just highlight a row already visible in
> the table.
> New `lagosWeekRange` in `src/lib/lagosTime.ts` (3 new unit tests) — the Monday-Saturday
> business week used for "this week" figures; a Sunday stays attached to the week that just
> finished rather than rolling into the next one, since Sunday isn't a business day for 3 of
> 4 branches. Pure logic in `src/server/ownerOverview.ts` (13 new unit tests):
> `summarizeBranchWeek`/`getBranchStatus` (amber "Wait over 15 min" once a branch's longest
> live wait passes the same 15-minute goal as reception's check-in prompt, M5-5),
> `summarizeCompanyWeek` (rolls up the branch rows), `buildWaitingAttentionItems`,
> `buildUnpaidPhoneDepositAttentionItem` (phone bookings don't collect a deposit at booking
> time — M8-3 sends that link later — so any still unpaid ahead of their appointment get
> flagged here). Refunded/no-show-rate etc. all read correctly as zero where there's
> genuinely nothing to show, rather than erroring.
> Verified live (signed in as Tolu): all four tiles and the branch table rendered correctly
> against real data across all 4 branches (Lekki with real bookings, Ikeja/Yaba/Surulere each
> near-zero), the bar chart's widths were proportionally correct, and "Needs your attention"
> correctly showed its empty state. Separately noticed two real, non-seed bookings under the
> supervisor's own name at Yaba and Surulere (`BOOKED`, Knotless braids and Wig installation)
> — flagged to the supervisor rather than deleted, since they look like manual testing of the
> live customer flow, not leftover scratch data from a verification pass.
> **M7-3 done:** "Staff and access" at `/staff/owner/staff`, matching `OwnerStaff.dc.html`.
> Branch filter chips, an "Add staff member" form, a staff table with role/status badges and
> masked phones, inline per-row editing of role/branch, reset password / resend invite, and
> remove / restore access.
> New `src/server/auth/tempPassword.ts` (`generateTempPassword`, 3 new tests) — an 8-char
> one-time password excluding visually ambiguous characters, sent through the existing
> console `messageSender` (M1) on both a new invite and a reset, since there's no real SMS
> provider yet. New `src/server/staffAccess.ts` (`formatRoleLabel`, `formatStaffStatusLabel`,
> `roleRequiresBranch`, `canManageStaffMember`, 7 new tests) — the last one blocks an owner
> from editing, removing or restoring their *own* row from this screen, since doing so could
> lock the business out of owner access with nobody left to undo it (the UI already hides
> those actions for the owner's own row; the server action checks it again, CLAUDE.md rule 3).
> Small addition to M4's sign-in action: a status of `INVITED` flips to `ACTIVE` on that
> staff member's first successful sign-in — otherwise "Invite sent" would never change once
> someone actually starts using the account.
> One real lint fix along the way: React's `react-hooks/set-state-in-effect` rule correctly
> flagged auto-closing the inline edit row from inside a `useEffect` keyed on the action's
> result. Fixed the idiomatic way — close it optimistically in the form's `onSubmit` handler
> instead (an event, not an effect), with the save error (if any) still shown below the
> collapsed row rather than lost.
> Verified live end-to-end as Tolu: added a test stylist (showed "Invite sent"), filtered the
> table to one branch and back, edited their branch, resent their invite, removed their
> access ("Access removed", only Restore offered), and restored it ("Active" again, full
> actions back) — every transition confirmed correct, including a direct DB check after the
> edit step. One early verification pass hit confusing, inconsistent-looking results from
> checking the UI immediately after each action without enough settle time in a
> memory-constrained dev session; a clean, isolated re-check of the one genuinely suspicious
> result (the branch filter) showed it working correctly, so that was test flakiness, not a
> product bug. Noticed the chip order isn't guaranteed to match the seed's Lekki/Ikeja/Yaba/
> Surulere order, since `Promise.all`-based branch creation in `prisma/seed.ts` doesn't
> guarantee `createdAt` ordering — harmless here (every branch still appears, just not
> necessarily in that exact order), not worth fixing for a filter row.
> **M7-4 done:** "Services and booking rules" at `/staff/owner/settings`, matching
> `OwnerSettings.dc.html` — the last M7 task. One page, one "Save changes" button: a
> services table (duration, price, live-computed deposit, a prep-time select per service,
> and how many branches actually offer it) plus a "Booking rules" sidebar (deposit %,
> free-cancellation hours, arrive-early minutes, check-in prompt timing) backed by the
> single global `Settings` row from M1-1.
> Pure logic in `src/server/ownerSettings.ts` (9 new unit tests): `countOfferedBranches`/
> `formatOfferedAtLabel` (reuses the same `nailsOnly && !offersNails` rule the customer
> booking flow and reception's new-booking form already enforce, so Pedicure/Manicure
> correctly show "2 branches" against the other services' "All branches"), plus the label
> helpers for the prep-time and arrive-early selects. Reused `formatDurationLabel` from
> `src/lib/duration.ts` (M1) for the ranged-duration column ("4–5 hrs") and
> `calculateDepositKobo` from `src/server/money.ts` (M1-3) for the live deposit column, which
> recalculates immediately in the browser as the Deposit % select changes, before saving.
> `saveOwnerSettings` validates every value against the same fixed option lists the `<select>`
> elements offer (no arbitrary numbers), then updates the `Settings` row and every service's
> `prepMinutes` in one transaction. "Changes apply to new bookings only" needs no extra code:
> `Booking.blockedUntil` is already a stored snapshot computed once at creation (M1-1), never
> recalculated from the service's current `prepMinutes`, so existing bookings are naturally
> unaffected — confirmed live.
> Verified the actual supervisor checkpoint live and deterministically: inserted a controlled
> "Wash and set" booking for Zainab at 2–3pm on a day with no other bookings, confirmed the
> 12:50pm slot was available with the seeded 10-minute prep (12:50 + 60 + 10 = exactly 2:00,
> no overlap), changed the prep time to 20 minutes via Settings, confirmed 12:50pm correctly
> disappeared (12:50 + 60 + 20 = 2:10, now overlapping), reverted to 10 minutes, confirmed it
> reappeared, and cleaned up the test booking. Two earlier live-check attempts against
> wide-open stylist afternoons found no visible difference — not a bug, just the wrong test
> scenario: prep time only ever excludes a slot when a new booking's prep window would
> overlap an *upcoming* booking, which an open afternoon doesn't have.
> **M7 milestone is now fully done** — M7-1 through M7-4 complete. Ready for the supervisor
> checkpoint in `docs/ROADMAP.md`: change a prep time and confirm the customer site's
> available times change (already verified above).
> **Next task:** none — waiting on the M7 checkpoint before M8 (Payments and messages)
> starts, per `CLAUDE.md` rule 6.
> **Blockers or questions:** none open.
>
> **M8 Payments and messages started (new `m8` branch off `m7`)** — supervisor said carry
> on, standing in for the M7 checkpoint. Supervisor also provided real Paystack test-mode
> API keys (`sk_test_…`/`pk_test_…`, added to `.env`; `.env.example` updated with
> placeholders and where to get them — CLAUDE.md rule 8).
> **M8-1 done:** real Paystack test-mode payments. `PaymentProvider` (M3/M8) is now a
> three-method redirect-based interface matching `docs/ARCHITECTURE.md`'s already-documented
> flow — `initializeTransaction`, `verifyWebhookSignature`, `verifyTransaction` — replacing
> the old synchronous `charge()` shape, since Paystack's real flow is "ask for a payment
> page, customer pays there, webhook confirms," not an instant in-page result.
> `src/server/payments/paystack.ts`: real HTTP calls to `/transaction/initialize` and
> `/transaction/verify/:reference`, and HMAC-SHA512 webhook signature verification
> (`node:crypto`, timing-safe compare), 5 new unit tests. `paymentProvider` (index.ts) now
> picks Paystack automatically when `PAYSTACK_SECRET_KEY` is set, falling back to
> `FakePaymentProvider` otherwise (local dev/CI without secrets) — `FakePaymentProvider`
> rewritten to match the new interface, backed by a new `/dev/fake-pay` page that stands in
> for Paystack's hosted checkout and posts a correctly fake-signed webhook, exercising the
> exact same webhook→confirm pipeline a real payment would.
> New `/api/paystack/webhook` (`src/server/paystackWebhook.ts`'s `decideWebhookAction` is the
> pure, tested routing logic — 4 tests): rejects a bad signature outright (401), otherwise
> only acts on `charge.success`, then independently calls Paystack's own verify API and
> checks the paid amount against the booking's `depositAmountKobo` before trusting it —
> CLAUDE.md rule 10's "verify the signature AND the transaction" as two real, separate
> checks, not one. `src/server/depositConfirmation.ts`'s `confirmDepositAndNotify` wraps the
> existing `confirmDeposit` (M2-3) with the confirmation-message send, moved here from
> `pay/actions.ts` since the webhook — not the browser — is what actually confirms a payment
> now; reuses `confirmDeposit`'s existing idempotency (a second confirmation call is a safe
> no-op) to protect against a duplicate webhook delivery.
> `pay/actions.ts` now just validates the hold, calls `initializeTransaction`, and redirects
> to Paystack's real hosted page. New `/book/pay/confirming` page is where Paystack's
> callback sends the customer back — it never marks anything paid itself (rule 10); it only
> polls a small read-only `/api/bookings/[bookingId]/status` route reflecting what the
> webhook has already confirmed, redirecting to `/book/confirmed` once it has, with a
> 20-second timeout and a manual-refresh fallback for a slow webhook. Removed `PayForm`'s
> old "simulate a failed payment" link — Paystack's own test cards cover that now.
> One real decision flagged in `docs/DECISIONS.md`: Paystack requires an email for its
> receipt, but the booking flow only ever collects a phone number, so a placeholder
> (`{phone}@customer.glowupsalons.ng`) is synthesized — not verified or emailed to, just used
> for Paystack's own receipt.
> Verified against the real Paystack test API directly (not just the fake provider):
> `initializeTransaction` returned a genuine `https://checkout.paystack.com/…` URL;
> `verifyTransaction` on an unpaid reference correctly reported `abandoned`; most
> importantly, a `charge.success` webhook forged with a *valid* signature (signed with the
> real secret key) was still correctly rejected, because the webhook's own call to
> Paystack's verify API reported the transaction as unpaid — proving the "verify the
> transaction, not just the signature" rule actually holds, not just the easier
> signature-only check. A bad signature was rejected with 401. Separately verified the full
> success path by calling `confirmDepositAndNotify` directly against a real test booking:
> correctly marked `PAID`, logged the confirmation message, and a repeated call safely
> no-opped (`NOT_FOUND`) rather than double-confirming.
> Could not complete one specific check live: clicking the real "Pay deposit" button in an
> actual browser and watching it land on Paystack's hosted page. This dev session's
> Turbopack/HMR connection was independently unstable — reproduced the same reload/reconnect
> churn on a completely unrelated, idle page with no interaction at all — so it's an
> environment issue, not evidence of a bug in this code. Confirmed instead via the rendered
> HTML that the form is wired correctly (one button, correct label, old simulate-failure UI
> gone) and via the direct-call tests above that every piece the button would trigger
> already works. Worth a quick manual click-through once this dev session is less flaky.
> **M8-2 done:** the 24-hour free-cancellation refund rule. `src/server/cancellation.ts`'s
> `decideCancellationOutcome` (5 new unit tests) is the pure REFUND-vs-KEEP decision, using
> the owner-adjustable `freeCancellationHours` from Settings (M7-4) rather than a hardcoded
> 24 — a no-show never reaches this at all, since it's never cancelled, so it always keeps
> the deposit by simply never being refunded.
> Added `refund` to the `PaymentProvider` interface (M8-1) — a real `POST /refund` call in
> `paystack.ts`, and an always-succeeds version in the fake provider that logs to the
> console like the other fake providers. New `src/server/bookingCancellation.ts`'s
> `cancelBookingAndSettleDeposit` wraps the existing `cancelBooking` (M5-2): only touches
> `depositStatus` if it was actually `PAID` (a booking cancelled before ever finishing
> payment has nothing to refund or keep, so it's left as `PENDING`); on `REFUND`, calls
> Paystack and only marks `REFUNDED` if that call actually succeeds — a failed refund call
> leaves the deposit `PAID` on a cancelled booking rather than lying about a refund that
> didn't happen; there's no retry queue for that failure case in this practice project, so
> it would need a human to notice. Reception's existing Cancel action (`BookingPanel`, M5-2)
> now calls this instead of the bare `cancelBooking` — same button, same permission checks,
> now with the real consequence attached.
> Verified live: four scenarios run against real test bookings (far-ahead PAID cancellation
> → `REFUNDED`; near-term PAID cancellation → `KEPT`; cancelling a never-paid `PENDING`
> booking → left alone; cancelling an already-cancelled booking → correctly rejected) using
> the fake provider for the orchestration/decision logic (these were synthetic bookings,
> never real Paystack transactions, so a real refund call against them would correctly fail
> with "transaction not found" — tested that exact response separately against the real
> Paystack API to confirm the refund call itself genuinely reaches and parses their API).
> `managerToday.ts`'s money-card comment updated — refunds are no longer always ₦0.
> **M8-3 done:** phone bookings now get a deposit-link message. New `src/lib/
> phoneDepositMessage.ts`'s `formatPhoneDepositMessage` (1 new unit test) — no "arrive by"
> or rush wording like the online confirmation message, since a phone booking has no
> 10-minute hold to race against (already true since M5-4/the `createReceptionBooking`
> doc comment). Reception's `createBookingAction` (M5-4) now sends it via the existing
> console `messageSender` right after a successful `PHONE`-source booking with a non-zero
> deposit (a walk-in's deposit is always zero, so there's nothing to ask for) — same
> `/book/pay?bookingId=…` page online customers use, no new page needed.
> Verified live against the real dev server (lighter-weight than a full browser pass, since
> this session's system was flagged low on memory right after M8-2): created a real phone
> booking through the actual `createReceptionBooking` function, confirmed it starts
> `BOOKED`/`PENDING`/no hold timer, built and sent the exact message `actions.ts` now sends,
> and confirmed the real `/book/pay` page (hit over HTTP against the running dev server)
> loads correctly for that booking with the right deposit amount and a working Pay button.
> **M8-4 done:** scheduled messages. New `Message` model/migration (`type`:
> CONFIRMATION/REMINDER_24H/REMINDER_3H, `status`: PENDING/SENT/CANCELLED, `scheduledFor`,
> `sentAt`) — each message's full body is composed once, at scheduling time, so
> `/dev/messages` shows exactly what will be sent before it is, and the job never needs to
> re-derive anything from the booking.
> `src/server/bookingMessages.ts`'s `planBookingMessages` (4 new unit tests) is the pure
> scheduling decision: confirmation always goes out (scheduled for "now," picked up by the
> next job run); a reminder is skipped entirely — not scheduled for a moment in the past —
> if its 24-or-3-hour mark has already passed by confirmation time. New `src/lib/
> reminderMessage.ts` (2 new tests): the 24-hour reminder is the only one that mentions the
> free-cancellation refund, matching `docs/PRD.md`'s "(last free-cancellation chance)" note;
> the 3-hour one doesn't, since that window's already closed.
> `depositConfirmation.ts` (M8-1) now schedules these 2-3 `Message` rows instead of sending
> one message immediately — the actual send is `src/server/messageJob.ts`'s
> `processDueMessages`, called by the new `/api/jobs/run` (GET/POST, protected by a
> `x-jobs-secret` header checked against a new `JOBS_SECRET` env var — generated and added
> to `.env`/`.env.example` the same way `AUTH_SECRET` was). Each due message is claimed
> atomically (`updateMany` only succeeds while still `PENDING`) before sending, so two
> overlapping scheduler calls can't double-send.
> `bookingCancellation.ts` (M8-2) now also cancels (not deletes) any still-`PENDING` message
> for a booking that gets cancelled — no reminder goes out for an appointment that's no
> longer happening; an already-`SENT` one is untouched. Skipped the architecture doc's
> mention of a "daily tidy-up" job for expired holds — those are already handled at
> read-time (ignored by the availability engine, M2-3) and at write-time (`holdSlot` deletes
> stale ones on insert), so there's nothing left to tidy.
> Verified live end to end: confirming a deposit 10 days out scheduled all 3 messages
> PENDING; calling `/api/jobs/run` sent only the due confirmation and left both future
> reminders PENDING; a wrong secret was rejected (401); cancelling that booking correctly
> flipped both still-pending reminders to CANCELLED while leaving the already-sent
> confirmation as SENT; a booking confirmed only 1 hour before its appointment correctly
> got no reminders at all, only the confirmation. `/dev/messages` confirmed showing real
> rows (customer, type, status, scheduled/sent time, full body) against live data.
> **M8-5 done:** the delay message, wiring up M5-7's disabled placeholder button. New
> `src/server/delayOffer.ts`'s `computeDelayOffer` (5 new unit tests) is the pure decision —
> reuses the same availability engine (M2-1/M2-2) customers see when booking, rather than a
> separate check, so an offer that wouldn't actually be bookable is never sent: the
> requested stylist's soonest slot after the original time, and whichever other active
> stylist (if any) is genuinely free at the exact original time. New `src/lib/
> delayMessage.ts` (4 new tests) only mentions the options that are actually available —
> both, one, or (rare) neither, in which case it just asks the customer to call.
> `src/server/delayOfferForBooking.ts`'s `getDelayContext` gathers the DB data once and is
> shared by both the "send" path and the customer's own choice page, so they can never
> compute different answers for the same booking. New `rescheduleBooking` in `bookings.ts`
> (a `RESCHEDULE` action added to `status.ts`'s allowed-transitions table, same guard as
> `MOVE`) moves a booking to a new time with the same stylist, protected by the same
> no-double-booking exclusion constraint.
> Reception's "Send delay message" button (`BookingPanel.tsx`, disabled since M5-7) now
> really sends it through the existing console `messageSender`, linking to a new public
> `/book/delay?bookingId=…` page — no sign-in needed, same as the rest of the customer
> booking flow. That page re-checks the offer live rather than trusting the link's embedded
> times (things may have changed since it was sent), shows whichever choices are still
> valid, and calls either `rescheduleBooking` or the existing `moveBooking` (M5-2) depending
> on which the customer picks, landing on a plain "you're all set" confirmation.
> Verified live end to end: the offer correctly proposed both a later same-stylist time and
> a genuinely-free other stylist at the original time; the message included both, with a
> working link; the live choice page showed both buttons; choosing "later, same stylist"
> moved the time and kept the stylist; a second booking confirmed choosing "same time,
> other stylist" kept the time and swapped the stylist to the one actually offered; the
> done page correctly reflected whichever choice was made.
> **M8-6 done** — review of the payment flow and money card against `docs/PRD.md`'s
> Business rules, the last M8 task. Found and fixed two real gaps:
> 1. **`markNoShow` never actually kept the deposit.** It only changed `status` to
> `NO_SHOW`, leaving `depositStatus` as `PAID` forever — the PRD rule ("kept for...
> no-shows") was only ever true in `prisma/seed.ts`'s sample data, which sets `KEPT`
> directly, not in the real action reception taps live. Fixed: `markNoShow` now also
> flips a `PAID` deposit to `KEPT` (leaving `PENDING`/`NONE` alone — nothing to keep from a
> deposit that was never actually paid). 2 new unit tests. This also means the manager
> money card's "kept from no-shows" line and the owner overview's no-show figures were
> silently always right only because of seed data, not live behaviour — now genuinely
> correct either way.
> 2. **Paystack's `/transaction/initialize` call didn't pass `channels`,** relying on
> whatever's enabled on the dashboard by default. `docs/PRD.md`/`docs/TECH_STACK.md` are
> explicit that deposits are "card or bank transfer" — now passes `channels: ["card",
> "bank_transfer"]` explicitly so both are always offered regardless of dashboard
> configuration. Confirmed live against the real Paystack test API that it accepts this.
> Everything else checked out already correct: deposit = 20%, walk-ins pay none, phone
> bookings get the SMS link (M8-3), the 10-minute hold, the 24-hour refund rule (M8-2),
> reminders at 24h/3h with the free-cancellation note only on the 24h one, 10-minute
> arrive-early wording sourced from the adjustable Settings row rather than hardcoded, and
> "expected at the till" correctly excluding no-shows and cancellations while including
> walk-ins at full price.
> Verified both fixes live: a real call to Paystack's test API confirmed it accepts the
> explicit channels list; a real no-show on a paid booking now correctly lands on `KEPT`,
> while a walk-in's never-charged `NONE` deposit is correctly left untouched.
> **M8 milestone is now fully done** — M8-1 through M8-6 complete. Ready for the supervisor
> checkpoint in `docs/ROADMAP.md`: a full test-mode booking with deposit, a logged reminder
> and a cancellation refund (all individually verified live above across M8-1/M8-2/M8-4;
> happy to run through the single combined walkthrough on request).
> **Next task:** none — waiting on the M8 checkpoint before M9 (Testing and deployment)
> starts, per `CLAUDE.md` rule 6.
> **Blockers or questions:** none open.

## Milestones

| Milestone | Status | Supervisor approved |
|---|---|---|
| M0 Foundations | Ready for review | |
| M1 Data model and seed | Approved | 2026-10-27 |
| M2 Availability engine | Approved | 2026-10-27 |
| M3 Customer booking | Approved | 2026-10-27 |
| M4 Staff sign-in and roles | Approved | 2026-11-02 |
| M5 Reception | Ready for review | |
| M6 Stylist | Ready for review | |
| M7 Manager and owner | Ready for review | |
| M8 Payments and messages | Ready for review | |
| M9 Testing, launch and training | Not started | |

Statuses: Not started · In progress · Ready for review · Approved.

## Task log

Newest first. One line per finished task.

| Date | Task | What changed | Tests |
|---|---|---|---|
| 2026-11-12 | M8-6 | `markNoShow` (bookings.ts) now keeps a paid deposit, `paystack.ts`'s initialize now passes explicit channels | `npm run check` (294 tests total), live-verified both fixes against real test bookings and the real Paystack API |
| 2026-11-12 | M8-5 | `src/server/delayOffer.ts`, `src/lib/delayMessage.ts`, `src/server/delayOfferForBooking.ts`, `src/server/delayMessageSender.ts`, `/book/delay`, `rescheduleBooking`/`RESCHEDULE` action, reception's Send delay message button wired up | `npm run check` (293 tests total), live-verified offer computation, message content, the live choice page, and both choice outcomes against real test bookings |
| 2026-11-12 | M8-4 | New `Message` model/migration, `src/server/bookingMessages.ts`, `src/lib/reminderMessage.ts`, `/api/jobs/run`, `src/server/messageJob.ts`, `/dev/messages`, `depositConfirmation.ts` and `bookingCancellation.ts` updated | `npm run check` (283 tests total), live-verified scheduling/sending/cancelling/skipping-reminders against the real job endpoint and dev DB |
| 2026-11-12 | M8-3 | `src/lib/phoneDepositMessage.ts`, reception's `createBookingAction` now sends it for PHONE bookings with a deposit due | `npm run check` (277 tests total), live-verified: real phone booking created, correct message built and sent, real `/book/pay` page confirmed working for it |
| 2026-11-11 | M8-2 | `src/server/cancellation.ts` (`decideCancellationOutcome`), `refund` added to `PaymentProvider`, `src/server/bookingCancellation.ts` (`cancelBookingAndSettleDeposit`), reception's Cancel action now uses it | `npm run check` (276 tests total), live-verified 4 scenarios (refund/keep/unpaid/double-cancel) plus a real Paystack refund API call |
| 2026-11-11 | M8-1 | `PaymentProvider` redesigned to a redirect-based interface, `src/server/payments/paystack.ts`, `/api/paystack/webhook`, `src/server/paystackWebhook.ts`, `src/server/depositConfirmation.ts`, `/book/pay/confirming`, `/api/bookings/[bookingId]/status`, `/dev/fake-pay` | `npm run check` (270 tests total), verified against the real Paystack test API: genuine checkout URL, a forged-but-validly-signed webhook correctly rejected via Paystack's own verify, bad signature rejected (401), success path (`confirmDepositAndNotify`) correct and idempotent |
| 2026-11-07 | M7-4 | `/staff/owner/settings` (`OwnerSettingsView.tsx`, `settingsActions.ts`), `src/server/ownerSettings.ts` (`countOfferedBranches`, `formatOfferedAtLabel`, `formatPrepTimeLabel`, `formatArriveEarlyLabel`) | `npm run check` (259 tests total), deterministic live check: a controlled booking's blocking slot appeared/disappeared/reappeared exactly as the prep-time setting changed |
| 2026-11-07 | M7-3 | `/staff/owner/staff` (`StaffAccessView.tsx`, `staffActions.ts`), `src/server/staffAccess.ts`, `src/server/auth/tempPassword.ts`, M4 sign-in action now flips `INVITED`→`ACTIVE` | `npm run check` (250 tests total), live end-to-end add/filter/edit/resend-invite/remove/restore, including a direct DB check |
| 2026-11-07 | M7-2 | `/staff/owner` (`OwnerOverviewView.tsx`, `ownerData.ts`), `src/server/ownerOverview.ts`, `lagosWeekRange` in `src/lib/lagosTime.ts` | `npm run check` (242 tests total), live-verified against real data across all 4 branches as Tolu |
| 2026-11-07 | M7-1 | `/staff/manager` (`ManagerTodayView.tsx`, `managerData.ts`), `/staff/manager/day-report` CSV route, `src/server/managerToday.ts` | `npm run check` (226 tests total), live-verified tiles/table/money math/CSV export against seeded Lekki data as Grace |
| 2026-11-06 | M6-3 | No code change — verification that Start/Finish already update everywhere, by reuse of M5-2's `startService`/`finishService` | Cross-view Playwright trace: Zainab (stylist) tapped Start then Finish, Ada (reception) reloaded and saw the schedule/panel update each time with no action on her side |
| 2026-11-06 | M6-2 | `/staff/stylist/tomorrow` (`StylistTomorrowView.tsx`), `src/server/stylistTomorrow.ts` (`summarizeTomorrow`, `getTomorrowHeadline`, `formatDurationLabel`) | `npm run check` (217 tests total), screenshot-verified Today↔Tomorrow navigation and the empty-day state |
| 2026-11-06 | M6-1 | `/staff/stylist` real Today view (`StylistTodayView.tsx`, `actions.ts`, `stylistData.ts`), `src/server/stylistToday.ts` (`selectCurrentCard`, `getEarlierBookings`, `getPrepWindow`, `getHeadline`, `getNowChipLabel`, `getFooterNote`) | `npm run check` (207 tests total), screenshot-verified the empty-day fallback and a full Start→Finish flow against seeded Lekki data |
| 2026-11-03 | M5-8 | No code change — speed test against M5-3/M5-4's screens | Scripted Playwright tap-count: walk-in booking 2 taps (target 5), check-in from search 1 tap (target 2); confirmed both actions genuinely completed in the database |
| 2026-11-03 | M5-7 | "Running over"/flagged-next-booking (`isRunningOver`, `getFlaggedBookingId` in `schedule.ts`), amber block styling + ⚠ marker, `BookingPanel` move/delay-message guidance | `npm run check` (184 tests total), `npm run build`, screenshot-verified a constructed scenario and the seed data's own genuinely-overdue bookings |
| 2026-11-03 | M5-6 | "Requested" (R) marker on schedule blocks + legend, `stylistRequested` added to `schedule.ts` | `npm run check` (174 tests total), `npm run build`, screenshot-verified against a seeded requested-stylist booking |
| 2026-11-03 | M5-5 | `CheckInPromptModal.tsx`, `isOverdueForCheckIn`/`findOverdueBookings` in `schedule.ts` | `npm run check` (173 tests total), `npm run build`, screenshot-verified the prompt, snooze and "On time" check-in against a throwaway overdue booking |
| 2026-11-02 | M5-4 | `/staff/reception/new` (walk-in/phone form, soonest-free stylist, client-side slot picker), `createReceptionBooking`/`shouldAutoCheckIn` in `bookings.ts` | `npm run check` (167 tests total), `npm run build`, screenshot-verified a walk-in auto-checked-in and a phone booking left pending against seeded Lekki data |
| 2026-11-02 | M5-3 | `/staff/reception/check-in` (search + panel reuse), `src/server/checkInSearch.ts`, "arrived X min ago" correction added to `BookingPanel`, extracted `receptionData.ts` | `npm run check` (159 tests total), `npm run build`, screenshot-verified search/highlight/check-in against seeded Lekki data, confirmed backdated `checkedInAt` in the database |
| 2026-11-02 | M5-2 | Booking panel (`BookingPanel.tsx`, `actions.ts`), `isActionAllowed`/`allowedFromStatuses` in `status.ts`, 7 action functions in `bookings.ts` (check in, start, finish, undo, no-show, cancel, move) | `npm run check` (145 tests total), `npm run build`, screenshot-verified full check-in→start→finish flow and a stylist move against seeded Lekki data |
| 2026-11-02 | M5-1 | `/staff/reception` real schedule grid, `src/server/schedule.ts`, `src/components/staff/AutoRefresh.tsx`, `.schedule-prep` CSS pattern | `npm run check` (124 tests total), `npm run build`, screenshot-verified against seeded Lekki data |
| 2026-10-27 | M4-3 | `src/server/permissions.ts` (`canViewBooking`, `canViewBranch`, `canAccessStaffSection`), `requireStaffSection` guard wired into all 4 staff section placeholder pages | `npm run check` (108 tests total), `npm run build`, scripted Playwright check (stylist bounced from every other section, owner can open all 4, signed-out redirects) |
| 2026-10-27 | M4-2 | `roleHomePath`, `getCurrentStaff`, role-based sign-in redirect, placeholder `/staff/{reception,stylist,manager,owner}`, `/staff` now a dispatcher | `npm run check` (96 tests total), `npm run build`, scripted Playwright check (all 4 seeded roles land on their own section, already-signed-in redirects) |
| 2026-10-27 | M4-1 | `/staff/sign-in` (phone + password, lockout), `src/server/auth/` (`password`, `lockout`, `session`), placeholder `/staff`, migration for `Staff` lockout fields | `npm run check` (92 tests total), `npm run build`, scripted Playwright end-to-end check (sign in, sign out, 5-attempt lockout, show/hide toggle) against a throwaway staff account |
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
