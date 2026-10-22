# Architecture

How the backend is put together, where each part runs, and how a request flows
through it. Follow this structure; propose changes to the supervisor before deviating.

## Where things run (practice setup)

| Part | Runs on | Notes |
|---|---|---|
| Next.js app (pages, server actions, API routes) | Vercel Hobby (free) | Front end and back end deploy together |
| PostgreSQL database | Neon Free | Prisma connects with `DATABASE_URL` from `.env` |
| Payments | Paystack, test mode | Webhook confirms payments at `/api/paystack/webhook` |
| Scheduled work | Free external scheduler every 10 min | Calls `/api/jobs/run` with a secret header |
| Messages | Console sender | Saved in the messages table, printed to the log, listed at `/dev/messages` |

Vercel Hobby cron runs only once a day, so time-based states are calculated when data is
read, not by background jobs (see `docs/TECH_STACK.md`).

## Layers

Every request follows the same path:

**screen → server action or API route → permission check → business rule → database**

1. **Pages and server actions** (`src/app/`): what each screen shows and the functions its
   buttons call. Keep them thin: validate input with Zod, then call the business rules.
2. **Permission checks** (`src/server/permissions.ts`): who is signed in, their role and
   branch. Every server action and API route checks before doing anything.
3. **Business rules** (`src/server/`): plain TypeScript functions with no knowledge of
   screens. Most unit tests live here.
4. **Database** (`prisma/`): schema, migrations and seed data. Accessed only through Prisma.

## Folder structure

```
src/
├── app/                        Pages and server actions
│   ├── (customer)/book/...     Booking steps 1–3 and confirmation
│   ├── staff/sign-in/          Staff sign-in
│   ├── staff/reception/...     Schedule, check-in, new booking
│   ├── staff/stylist/...       Today and tomorrow
│   ├── staff/manager/...       Branch day view
│   ├── staff/owner/...         Overview, staff and access, settings
│   ├── dev/...                 Tokens, components, messages (development only)
│   └── api/
│       ├── paystack/webhook/   Paystack payment confirmations
│       └── jobs/run/           Due reminders and daily tidy-up
├── components/                 Shared UI (Button, Card, StatusBadge...)
├── server/                     Business rules
│   ├── availability.ts         Bookable times (durations, prep, holds, requested stylist)
│   ├── bookings.ts             Create, hold, check in, start, finish, move, cancel, no-show
│   ├── status.ts               Allowed status changes, display status, wait time
│   ├── money.ts                Deposit, refund, balance due (integer kobo)
│   ├── permissions.ts          Role and branch checks
│   ├── payments/               PaymentProvider interface: Paystack (test) and fake
│   └── messages/               MessageSender interface: console
├── lib/db.ts                   Shared Prisma client
prisma/
├── schema.prisma               Tables
├── migrations/                 Tracked changes, including the no-overlap constraint
└── seed.ts                     Sample data matching the designs
```

## Data model

Tables: Branch, OpeningHours, Service, BranchService, Staff, Customer, Booking, Payment,
Message, Settings. Field lists are in `docs/ROADMAP.md` (M1-1).

Key points:
- **Booking** is the centre. `starts_at`/`ends_at` are what the customer sees;
  `blocked_until` adds prep time and is what availability checks. `stylist_requested`
  drives the requested-stylist rule.
- **Status** is one of `BOOKED`, `CHECKED_IN`, `IN_SERVICE`, `DONE`, `NO_SHOW`, `CANCELLED`.
  Allowed changes live in `status.ts` only. "Checked in early" and "waiting" are derived.
- **Timestamps** `checked_in_at`, `started_at`, `finished_at` come from staff taps and give
  wait time and real service durations.
- **Payments** and **messages** are separate tables, one row per deposit, refund or message,
  so every money movement and reminder is traceable.
- **No double-booking:** a PostgreSQL exclusion constraint (added as a hand-written SQL
  migration with the `btree_gist` extension) refuses overlapping active bookings for the
  same stylist. Code also checks first, but the database is the final guard.

## Key flows

**Customer books**
1. Server re-checks availability (never trusts the screen).
2. Creates the booking with `hold_expires_at` 10 minutes ahead.
3. Asks Paystack for a payment page; customer pays by card or transfer.
4. Paystack calls the webhook; the server verifies the signature and the transaction,
   records the payment, clears the hold, and schedules confirmation and reminders.

**Receptionist checks in**
1. Server action → permission check (receptionist at this branch).
2. `status.ts` confirms `BOOKED` → `CHECKED_IN` is allowed.
3. Saves status and `checked_in_at` (adjusted if "arrived 5 or 10 minutes ago").
4. Schedule, stylist and manager screens pick it up on their next refresh.

**Jobs endpoint (every 10 minutes)**
1. Checks the secret header; rejects anything else.
2. Sends messages whose `send_at` has passed and marks them sent (retries failures).
3. Once a day: tidies expired, unpaid holds.
