# GlowUp Salons Booking — agent context

Read this file at the start of every session. It is the agent's memory for this project.

> **Practice project.** GlowUp and its people are fictional. Keep everything free and
> simple: Vercel Hobby for hosting, Neon Free for the database, Paystack in **test mode
> only**, and SMS printed to the console and stored in the messages table (no real SMS
> provider). Never connect live payments or send real messages.
> Vercel Hobby cron runs only once a day, so don't rely on frequent background jobs:
> compute time-based states when data is read, and process due messages through
> `/api/jobs/run` (see `docs/TECH_STACK.md`).

## What we are building

A booking system for GlowUp Salons, a 4-branch hair and beauty business in Lagos
(Lekki, Ikeja, Yaba, Surulere). Version 1 replaces paper notebooks and WhatsApp
booking with one shared online system. **Launch deadline: 30 November 2026.**

One responsive web app, no app-store install, with role-based views:

| Who | Where | Main job |
|---|---|---|
| Customer | Public booking site (mobile-first) | Book as a guest, pay a 20% deposit |
| Receptionist | Staff app (tablet/desktop) | Run the day's schedule, check customers in, add walk-ins |
| Stylist | Staff app (phone) | See own appointments, tap Start and Finish |
| Branch manager | Staff app (desktop) | Watch their branch: bookings, waits, deposits |
| Owner (Tolu) | Staff app (desktop) | Compare all branches, manage staff, change settings |

Full requirements: `docs/PRD.md`. Visual designs: `docs/DESIGN.md` and `design/screens/`.
Code structure and request flow: `docs/ARCHITECTURE.md`.

## Where the work stands

- Plan and task list: `docs/ROADMAP.md` (milestones M0–M9, tasks with IDs like `M2-3`).
- What's done and what's next: `docs/PROGRESS.md`.
- Why things are the way they are: `docs/DECISIONS.md`.
- Things only the supervisor or client can answer: `docs/OPEN_QUESTIONS.md`.

## Tech stack

Proposed for v1. Changing any of these is a decision for the supervisor.

- Next.js (App Router) with TypeScript in strict mode
- Tailwind CSS, using the design tokens in `docs/DESIGN.md` (never raw hex in components)
- PostgreSQL with Prisma ORM
- Better Auth for staff sign-in (phone number + password, passwords hashed)
- Zod for validating every form and API input
- Vitest for unit tests; Playwright for end-to-end smoke tests
- Payments and SMS behind interfaces (`PaymentProvider`, `MessageSender`) with fake
  implementations for development. In M8, Paystack is connected in **test mode**;
  messages stay on the console sender.
- Reasons and alternatives for every choice: `docs/TECH_STACK.md`.

## Rules that must always hold

1. **Money is stored as integer kobo** (₦1 = 100 kobo). Never floats.
2. **Times are stored in UTC** and shown in Africa/Lagos time.
3. **Permissions are enforced on the server**, never only by hiding buttons.
   Stylists see only their own bookings; receptionists and managers only their branch;
   the owner sees everything.
4. **No double-booking.** Creating or holding a slot must be safe under concurrent
   requests (database transaction or constraint), with a test proving it.
5. **Booking status is one shared list**: `BOOKED`, `CHECKED_IN`, `IN_SERVICE`, `DONE`,
   `NO_SHOW`, `CANCELLED`. "Checked in early" and "waiting" are derived for display,
   not stored (see `docs/PRD.md`, Check-in and timing).
6. **Wait time** = `startedAt` minus the later of `checkedInAt` and the appointment start.
7. **Prep time** after each service blocks the stylist but is never shown to customers.
   Ranged services (braids 4–5 hrs) block the shortest duration; customers who requested a
   specific stylist are protected by the longest duration (`docs/PRD.md`, rules 7–9).
8. **Secrets never go in the code or git.** Use `.env` and keep `.env.example` updated.
9. **Payments and SMS stay in test mode** until the supervisor says otherwise in writing.
10. **A deposit is paid only when Paystack confirms it:** verify the webhook signature and
    the transaction with Paystack's API. Never trust the browser's redirect alone.

## How to work

1. At the start of a session, read `CLAUDE.md`, then `docs/PROGRESS.md`, then the current
   milestone in `docs/ROADMAP.md`.
2. Work on **one task at a time**, in order, inside the current milestone only.
3. For each task: write or update tests, implement, run `npm run check`, then commit with
   a message starting with the task ID, e.g. `M2-3: hold a slot for 10 minutes`.
4. After each task, tick it in `docs/ROADMAP.md` and add a line to `docs/PROGRESS.md`.
5. **Stop and ask the supervisor** when:
   - a requirement is unclear or two documents disagree (also add it to `docs/OPEN_QUESTIONS.md`),
   - a change would go beyond the current milestone's scope,
   - you want to add a dependency or change the stack,
   - anything involves real money, real customer data or production.
6. At the end of a milestone, stop for the supervisor's review. Do not start the next one.
7. Before a session ends, write a short handoff note at the top of `docs/PROGRESS.md`:
   what was done, what's half-done, what's next, any blockers.
8. Match the designs in `design/screens/`. They are visual references written as HTML,
   not code to copy. Build proper reusable React components.

## Commands

Fill these in during M0 and keep them current.

- `npm run dev` — start the app locally
- `npm run check` — lint, type-check and run unit tests (must pass before every commit)
- `npm test` — unit tests only
- `npm run e2e` — end-to-end smoke tests
- `npx prisma migrate dev` — apply database changes
- `npx prisma db seed` — load sample branches, staff and services
