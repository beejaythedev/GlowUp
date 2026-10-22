# Tech stack: choices, reasons and alternatives

Why each tool was chosen for GlowUp v1, what else was considered, and when it would be
worth switching. Written 22 October 2026. Re-check anything here before reusing it on a
future project: tools and prices change.

## What shaped the choices

1. **Six weeks to launch.** Fewer moving parts beats theoretical flexibility.
2. **A small team, supervising an AI agent.** Popular, well-documented tools get better results from agents and are easier to hire for later.
3. **The data is relational.** Bookings link branches, services, stylists, customers and payments, and the most important rule (no double-booking) is about overlapping times.
4. **Users on mid-range Android phones and patchy networks.** Pages must load fast and work without an app install.
5. **Money is involved.** Payments must be verified on the server, never trusted from the browser.

## Summary

| Layer | Choice | Main reason | Alternatives | Reconsider when |
|---|---|---|---|---|
| Framework | Next.js (App Router) with React | Pages and server code in one app; fast first load | Laravel, Django, SvelteKit, React Router, separate API + React app | You add native mobile apps or a public API |
| Language | TypeScript | Catches mistakes before they reach users; agents write better typed code | JavaScript | Never for a project this size |
| Styling | Tailwind CSS with design tokens | Fast to match designs; tokens keep colours consistent | CSS Modules, a component library | The team strongly prefers plain CSS |
| UI building blocks | Own components, optionally shadcn/ui (Radix) for dialogs, selects, menus | Accessible behaviour without fighting a library's look | MUI, Chakra, Mantine | Need many complex widgets quickly |
| Database | PostgreSQL | Relational data, transactions, and it can refuse overlapping bookings itself | MySQL, MongoDB, Firebase | Rarely; Postgres scales far beyond a salon chain |
| Database access | Prisma | Readable schema, safe migrations, typed queries | Drizzle, Kysely, raw SQL | Queries get complex or performance-critical |
| Staff sign-in | Better Auth | Open source, runs in our app, actively developed | Auth.js, Clerk, Supabase Auth | You need social login, SSO or many users fast |
| Validation | Zod | One schema checks forms and server input | Valibot, Yup | — |
| Payments | Paystack | Decided by Tolu; card and bank transfer, confirmed automatically | Flutterwave, manual transfer with receipts | Fees or reliability become an issue |
| SMS | Not decided yet (see Q4) | Must work on every phone | Termii, Africa's Talking, Twilio, WhatsApp Business | — |
| Background jobs | Scheduled job every few minutes | Simple: reminders, expired holds, late flags | Job queue (pg-boss, Inngest, Trigger.dev) | Messages grow or need precise timing |
| Testing | Vitest (unit), Playwright (end-to-end) | Fast, modern, good with TypeScript | Jest, Cypress | — |
| Hosting | Managed platform for Next.js, plus managed PostgreSQL with backups | No servers to maintain | VPS with Docker, Render, Railway, Fly.io | Costs grow or more control is needed |
| Error monitoring | Sentry (or similar) | Know about errors before customers report them | Logtail, Highlight | — |

## The decisions in more detail

### Framework: Next.js

**Why:** one codebase serves the customer site, the staff app and the server logic. Server
rendering sends ready-made pages, which load quickly on slow connections. Server actions let
a button call server code without building a separate API. It's the most widely used React
framework, so documentation, examples and AI agents all handle it well.

**Trade-offs:** Next.js changes quickly and its caching rules can surprise people. It also
ties the server to React; if GlowUp later wants native apps, those apps need an API.

**Alternatives:**
- **Laravel (PHP) or Django (Python):** "batteries included" with admin panels, auth and
  queues built in. Laravel is very popular in Nigeria and excellent for this kind of
  business app. Chosen against because you wanted React.
- **Separate API (Express or NestJS) plus a React front end:** cleaner separation and ready
  for mobile apps, but two projects to build, deploy and keep in sync. Too much for six weeks.
- **SvelteKit, React Router (formerly Remix):** good frameworks, smaller ecosystems.

### Database: PostgreSQL

**Why:** the data is a web of relationships, which relational databases handle naturally.
Transactions keep money and bookings consistent. Most importantly, PostgreSQL supports
**exclusion constraints**: the database itself refuses to save two bookings for the same
stylist whose times overlap, even if two customers pay in the same second.

**Alternatives:**
- **MySQL:** also relational and solid, but no exclusion constraints, so double-booking
  protection would rely on locking in the code.
- **MongoDB:** flexible documents, but relationships and "no overlap" guarantees are harder.
- **Firebase / Firestore:** very fast to start, real-time updates built in, but complex
  queries (reports across branches) are awkward and it ties you to one vendor.
- **Supabase:** not really an alternative, it *is* PostgreSQL, hosted, with auth and storage
  added. A strong option for hosting our database.

### Database access: Prisma

**Why:** the schema file reads like documentation, migrations are tracked in git, and
queries are fully typed, so mistakes show up in the editor.

**Trade-offs:** some PostgreSQL features (like the exclusion constraint) need a small
hand-written SQL migration. Prisma adds a layer between you and SQL.

**Alternative:** **Drizzle** stays closer to SQL, is lighter, and is popular for new
projects. A fair choice; Prisma wins here on readability for a learning team.

### Staff sign-in: Better Auth

**Why:** sign-in runs inside our app and our database, with no per-user fees. In September
2025, the Auth.js (NextAuth) project moved under the Better Auth team, which now recommends
Better Auth for new projects; Auth.js gets security fixes only. Before M4, confirm how
Better Auth handles phone number plus password (via its plugins), or use the phone number
as the username.

**Alternatives:**
- **Auth.js:** still works and widely used, but no longer the recommended path for new projects.
- **Clerk:** hosted sign-in with ready-made screens, very fast to set up, but a paid
  service per user and your user data lives with them.
- **Supabase Auth:** good if the database is hosted on Supabase anyway.

### Payments: Paystack

**Why (decided by Tolu, 22 Oct 2026):** payments are confirmed automatically and matched
to the booking, so nobody checks receipts. Customers can pay by card or by bank transfer
through Paystack's "pay with transfer", which keeps a familiar habit without manual checks
or fake-receipt risk. Refunds can be triggered from our system.

**Cost (as of October 2026):** 1.5% plus ₦100 per local transaction, ₦100 waived under
₦2,500, capped at ₦2,000. About ₦175 on a ₦5,000 deposit and ₦18 on a ₦1,200 deposit.

**Rules for the build:** never mark a deposit paid because the browser says so; only after
verifying Paystack's webhook signature and the transaction with Paystack's API.

**Alternatives:** **Flutterwave** (similar features, compare fees); **manual transfer with
receipt upload** (rejected: staff checking time, fake receipts, slow confirmation, manual refunds).

### SMS: to be decided

Compare on cost per message in Nigeria, delivery reliability, sender ID registration and
whether WhatsApp messages are offered too. Candidates: Termii, Africa's Talking, Twilio.
Build behind a `MessageSender` interface so switching providers is a small change.

There is no free SMS for a live system. For development: the fake `MessageSender` (logs
to the console) and the Africa's Talking sandbox (free simulator; messages don't reach real
phones). For reference, Twilio charges $0.3868 per SMS segment to Nigeria (Oct 2026), so
three messages per booking (confirmation and two reminders) cost about $1.16. Get quotes
from local providers and register the "GlowUp" sender ID early, as approval can take time.

### Hosting

A managed platform that supports Next.js (no server maintenance), plus a managed
PostgreSQL provider with automatic daily backups. Check that the plan allows commercial
use and supports scheduled jobs. A VPS with Docker is cheaper at scale but means you
handle updates, security and backups yourself.

Front end and back end deploy together: it's one Next.js app.

**Scheduled jobs on Vercel Hobby:** cron jobs can run only once per day, at an imprecise
time within the hour (checked 22 Oct 2026). So the app avoids depending on frequent jobs:
- **Expired slot holds** are ignored when availability is calculated, so no job is needed
  to release them (a daily job just tidies them up).
- **"15 minutes late" and "running over" flags** are calculated each time the schedule
  loads or refreshes.
- **Reminders** go out through a protected `/api/jobs/run` endpoint, called every 10 minutes
  by a free external scheduler (for example a scheduled GitHub Actions workflow or
  cron-job.org). On a paid host with minute-level cron, the same endpoint is simply
  scheduled there.

| Stage | App hosting | Database | Notes (checked 22 Oct 2026) |
|---|---|---|---|
| Building and demos (free) | Vercel Hobby | Neon Free (or Supabase Free) | Vercel Hobby is for non-commercial, personal use only. Neon Free: 1 GB storage per project, compute sleeps after 5 min idle (first request is slower), 6-hour restore window. Supabase Free pauses projects after about 7 days of low activity. |
| Live for GlowUp (paid, client pays) | Vercel Pro ($20 per developer seat per month) or another commercial host | Neon Launch (pay as you go, no monthly minimum) or a paid Supabase plan | Paid plans add backups and remove sleeping/pausing. Confirm current prices before quoting. |

## Costs to budget (monthly, client pays)

Hosting, database, error monitoring, Paystack fees per deposit and SMS per message.
Get current prices before quoting Tolu; they change often.
