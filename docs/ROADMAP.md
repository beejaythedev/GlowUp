# Roadmap: GlowUp Booking v1

Launch: **Monday 30 November 2026**. Ten milestones, each ending in something the
supervisor can run, click through and approve.

## How to use this file

- Work top to bottom. Tick a task (`- [x]`) only when its acceptance criteria pass
  and `npm run check` is green.
- Each milestone ends with a **supervisor checkpoint**. Stop there and wait for approval.
- Story numbers (S1–S23) refer to the user stories in `docs/PRD.md`.

## Timeline

| Week | Dates | Milestones |
|---|---|---|
| 1 | Fri 23 – Thu 29 Oct | M0 Foundations, M1 Data model, M2 Availability engine |
| 2 | Fri 30 Oct – Thu 5 Nov | M3 Customer booking |
| 3 | Fri 6 – Thu 12 Nov | M4 Staff sign-in and roles, M5 Reception |
| 4 | Fri 13 – Thu 19 Nov | M6 Stylist, M7 Manager and owner |
| 5 | Fri 20 – Wed 25 Nov | M8 Payments and messages |
| 6 | Thu 26 – Mon 30 Nov | M9 Testing and deployment, buffer for slips |

The schedule is tight. If a week slips, move "Later" items out, never the checks.

---

## M0 Foundations

**Goal:** an empty but well-organised app that runs, with the design system in place.

- [x] **M0-1** Create the Next.js app with TypeScript (strict), App Router, Tailwind, ESLint and Prettier.
  *Done when:* `npm run dev` shows a placeholder home page and lint passes.
- [x] **M0-2** Add the design tokens from `docs/DESIGN.md` (colours, font, radii, status colours) to Tailwind.
  *Done when:* a `/dev/tokens` page shows every token, and no component uses raw hex values.
- [x] **M0-3** Set up PostgreSQL and Prisma with `.env.example`.
  *Done when:* `npx prisma migrate dev` runs on a fresh machine following the README.
- [x] **M0-4** Set up Vitest and Playwright, and an `npm run check` script (lint + type-check + unit tests).
  *Done when:* one sample unit test and one sample e2e test pass.
- [x] **M0-5** Build the base components: Button, Card, Input with label, StatusBadge, Chip, CustomerShell (phone layout), StaffShell (top nav).
  *Done when:* a `/dev/components` page shows each one, keyboard-accessible, 44px minimum touch targets.
- [x] **M0-6** Write a README with setup steps and fill in the commands in `CLAUDE.md`.

**Supervisor checkpoint:** run the app, look at `/dev/tokens` and `/dev/components`, compare with the designs.

---

## M1 Data model and seed data

**Goal:** the database can describe everything in the PRD.

- [x] **M1-1** Prisma schema: Branch (name, address, opening hours per weekday, offers nails), Service (name, min and max duration, price in kobo, prep minutes, nails only), Staff (name, phone, role, branch, password hash, status), Customer (name, phone), Booking (branch, service, stylist, stylist requested yes/no, customer, booker phone, start, end, prep end, status, source, deposit amount and status, checkedInAt, startedAt, finishedAt, holdExpiresAt), Settings (deposit %, free-cancel hours, arrive-early minutes, prompt-after minutes).
  *Done when:* migration runs and the schema is reviewed against `docs/PRD.md`.
- [x] **M1-2** Seed data matching the designs: 4 branches, 7 services with prices and prep times, Lekki staff (Ada, Grace, Blessing, Zainab, Ronke, Ifeoma), Kelechi at Ikeja, Tolu as owner, and sample bookings for "today".
  *Done when:* `npx prisma db seed` loads it and a quick script prints the Lekki schedule.
- [x] **M1-3** Pure functions with unit tests: deposit amount (20%, rounded to whole naira), wait time, display status (booked / checked in early / waiting / in service / done / no-show), balance due.
  *Done when:* tests cover early arrival, late arrival and walk-ins.

**Supervisor checkpoint:** read the schema and the seed script; confirm names and prices match the PRD.

---

## M2 Availability engine

**Goal:** the system can answer "which times can this service be booked?" correctly. This is the heart of the product, so it gets its own milestone.

- [x] **M2-1** `getAvailableSlots(branch, service, stylist or "any", date)` respecting opening hours (including Sunday at Lekki), service duration, prep time, existing bookings and active holds. Start times every 10 minutes.
  Services with a range block their shortest duration; the longest sets the last start of the day. After a ranged service, requested-stylist bookings only get times after the longest duration plus prep (PRD, Check-in and timing, rules 7–8).
  *Done when:* unit tests pass for: full day, partly booked day, last start time before closing (braids: 2pm), nails only at Lekki and Ikeja, Sunday hours, and the Ronke example (any stylist 3:15, requested Ronke 4:15).
- [x] **M2-2** "Any available stylist": pick the stylist who becomes free soonest; ties go to the one with fewer bookings that day.
- [x] **M2-3** Slot hold: holding a slot reserves it for 10 minutes. Expired, unpaid holds are ignored by the availability engine, so release needs no background job.
  *Done when:* a test fires two simultaneous holds for the same slot and exactly one succeeds.
- [x] **M2-4** "Soonest free" list per stylist for the reception's new-booking screen (S8).

**Supervisor checkpoint:** review the tests; try three tricky cases by hand. Resolve open question Q1 (braids duration) before this milestone ends.

---

## M3 Customer booking

**Goal:** a customer can book an appointment on their phone (S1, S2, S4, S5 with payment faked).

- [x] **M3-1** Welcome page, matching `Welcome.dc.html`.
- [x] **M3-2** Step 1, choose branch and service, matching `Main.dc.html`. Only services the branch offers.
- [x] **M3-3** Step 2, choose stylist ("Any available" default), date and time from the availability engine, matching `Time.dc.html`.
- [x] **M3-4** Step 3, name and phone, booking summary, cancellation rule, hold countdown, matching `Review.dc.html`. Validate Nigerian phone numbers.
- [ ] **M3-5** Pay deposit through the fake `PaymentProvider` (always succeeds or fails on demand), then confirmation page with booking reference, matching `Confirmed.dc.html`. A failed payment keeps the hold and lets the customer retry.
- [ ] **M3-6** Confirmation message sent through the fake `MessageSender` (logged to console), including "please arrive by…".
- [ ] **M3-7** End-to-end test: book braids at Lekki as a guest from start to confirmation.

**Supervisor checkpoint:** book on a real phone; check it on a slow connection.

---

## M4 Staff sign-in and roles

**Goal:** staff sign in and land on the right home screen, seeing only what they're allowed to (S18).

- [ ] **M4-1** Sign-in page matching `StaffSignIn.dc.html`: phone + password, "keep me signed in", clear error on wrong details, lock after repeated failures.
- [ ] **M4-2** Role-based redirect after sign-in: receptionist → reception, stylist → stylist today, manager → manager today, owner → owner overview.
- [ ] **M4-3** Server-side permission checks on every staff page and API route.
  *Done when:* tests prove a stylist can't read another stylist's bookings and a manager can't read another branch.

**Supervisor checkpoint:** sign in as each seeded role.

---

## M5 Reception

**Goal:** Ada can run a Saturday from the schedule (S7, S8, S9, S22).

- [ ] **M5-1** Today's schedule grid: one column per stylist, bookings coloured by status, striped prep blocks, the "now" line, summary tiles. Matches `ReceptionSchedule.dc.html`. Refreshes every 30 seconds.
- [ ] **M5-2** Booking panel with timeline (appointment, checked in, started, finished) and actions: check in, start/finish as backup, move, cancel, no-show, undo check-in.
- [ ] **M5-3** Check-in: one tap, with "arrived 5 or 10 minutes ago" correction; search by name, phone or service. Matches `ReceptionCheckIn.dc.html` and `CheckedInOnTime.dc.html`.
- [ ] **M5-4** New booking for walk-ins and phone calls: returning customer found by phone, soonest-free stylist first, walk-ins served now are checked in automatically. Matches `ReceptionNew.dc.html`.
- [ ] **M5-5** 15-minute prompt for bookings not checked in or started, matching `CheckInPrompt.dc.html`.
- [ ] **M5-6** "Requested" marker on schedule blocks and in the booking panel.
- [ ] **M5-7** Running over: if Finish isn't tapped 15 minutes before the booked end, show "running over" (amber) and flag the next booking. Offer "move to a free stylist" only for "any stylist" bookings; for requested ones, offer "send delay message" (sent in M8).
- [ ] **M5-8** Speed test: a walk-in booking takes 5 taps or fewer; check-in takes 2 taps from search.

**Supervisor checkpoint:** run a pretend busy morning with 10 bookings. This is the screen Ada will test first.

---

## M6 Stylist

**Goal:** stylists know their day and record start and finish (S10, S20).

- [ ] **M6-1** Today view with the current or next client and a large Start / Finish button, matching `StylistToday.dc.html`.
- [ ] **M6-2** Tomorrow view, matching `StylistDay.dc.html`.
- [ ] **M6-3** Start and Finish update the schedule, timestamps and wait time everywhere.

**Supervisor checkpoint:** use it on a phone with one hand.

---

## M7 Manager and owner

**Goal:** managers and Tolu can see what's happening and change settings (S12, S15, S17, S18, S19, S21). S19 was "Later" in the PRD but the settings screen covers it at little extra cost.

- [ ] **M7-1** Manager today: summary tiles, bookings table, money card (deposits, kept, refunded, expected at till), CSV day report. Matches `ManagerToday.dc.html`.
- [ ] **M7-2** Owner overview: four-branch comparison, bookings-by-branch bars, "needs your attention" list. Matches `OwnerOverview.dc.html`.
- [ ] **M7-3** Staff and access: add staff, change role or branch, reset password, remove and restore access, invite status. Matches `OwnerStaff.dc.html`.
- [ ] **M7-4** Settings: prep time per service, deposit %, free-cancellation hours, arrive-early minutes, prompt timing. Changes apply to new bookings only. Matches `OwnerSettings.dc.html`.

**Supervisor checkpoint:** change a prep time and confirm the customer site's available times change.

---

## M8 Payments and messages

**Goal:** working deposits with Paystack in test mode, and messages scheduled and logged (no real SMS in this practice project).

- [ ] **M8-1** Connect Paystack in test mode (card and pay with transfer): create payment, verify webhook signature, confirm the transaction with Paystack's API, mark deposit paid. Never trust the browser's word that payment succeeded.
- [ ] **M8-2** Refund rule: cancelling 24+ hours before refunds the deposit; later cancellations and no-shows keep it. Deposit deducted from the bill.
- [ ] **M8-3** Deposit link for phone bookings, "sent" through the console message sender.
- [ ] **M8-4** Scheduled messages through the console sender: confirmation, reminder 24 hours before (with the free-cancellation note) and 3 hours before, stored in the messages table with a status. Due messages are processed by a `/api/jobs/run` endpoint protected by a secret, called every 10 minutes by a free external scheduler (Vercel Hobby cron only runs daily; see `docs/TECH_STACK.md`). A `/dev/messages` page lists what would have been sent.
- [ ] **M8-5** Delay message for requested-stylist bookings: offers a later time with the same stylist or the original time with another stylist; the customer's reply or link choice updates the booking.
- [ ] **M8-6** Review the payment flow and money card against the business rules in `docs/PRD.md`.

**Supervisor checkpoint:** a full test-mode booking with deposit, a logged reminder and a cancellation refund.

---

## M9 Testing and deployment

**Goal:** a polished, deployed practice app you can show in a portfolio.

- [ ] **M9-1** Walk through each role's main tasks yourself (or with a friend playing Ada): check in, walk-in, no-show, start and finish. Fix anything awkward.
- [ ] **M9-2** QA pass: a phone, a slow network (browser throttling), keyboard and screen-reader basics, all roles.
- [ ] **M9-3** Deploy to Vercel Hobby with a Neon Free database. Secrets in Vercel's environment settings, Paystack still in test mode.
- [ ] **M9-4** Seed the deployed database with the sample data, and add a short "demo accounts" note to the README (one sign-in per role).
- [ ] **M9-5** Write a project summary for your portfolio: the problem, key decisions, screenshots and what you learned.

**Supervisor checkpoint:** the deployed app works end to end for every role.

*In a real project, this milestone would also cover usability testing with the actual receptionist, production hosting with backups, live payments and SMS after written approval, real staff data, branch training and a launch-day rollback plan.*

---

## Later (v1.1 and beyond)

Not part of the November launch. Do not build these unless the supervisor moves them up.

- S3 Book for someone else
- S6 Reschedule or cancel from the confirmation link
- S11 Stylists set their own hours
- S13, S14, S16 Delay, customer-number and no-show trend charts
- S23 QR self check-in at the desk
- Stylist photos and portfolios
- Loyalty rewards (January) and product shop
