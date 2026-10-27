# GlowUp Salons Booking

A booking system for GlowUp Salons, a 4-branch hair and beauty business in Lagos.
This is a practice project — see `CLAUDE.md` for the full brief, rules and current
progress (`docs/PROGRESS.md`, `docs/ROADMAP.md`).

## Stack

Next.js (App Router) + TypeScript (strict) + Tailwind CSS + PostgreSQL/Prisma.
Vitest for unit tests, Playwright for end-to-end tests. Full reasoning in
`docs/TECH_STACK.md`.

## Setup

1. **Install dependencies**

   ```sh
   npm install
   ```

2. **Start a local Postgres database** (disposable, via Docker)

   ```sh
   docker run -d --name glowup-postgres \
     -e POSTGRES_USER=glowup -e POSTGRES_PASSWORD=glowup -e POSTGRES_DB=glowup \
     -p 5432:5432 postgres:17-alpine
   ```

3. **Copy the environment file** and adjust if your database differs from the
   defaults above

   ```sh
   cp .env.example .env
   ```

4. **Apply the database schema**

   ```sh
   npx prisma migrate dev
   ```

5. **Run the app**

   ```sh
   npm run dev
   ```

   Visit `http://localhost:3000`. `/dev/tokens` shows the design tokens and
   `/dev/components` shows the shared UI components.

6. **Install Playwright's browser** (first time only, needed for `npm run e2e`)

   ```sh
   npx playwright install chromium
   ```

## Commands

See `CLAUDE.md` for the authoritative, kept-current list. In short:

| Command | What it does |
|---|---|
| `npm run dev` | Start the app locally |
| `npm run check` | Lint, type-check and run unit tests — must pass before every commit |
| `npm test` | Unit tests only |
| `npm run e2e` | End-to-end smoke tests (starts the dev server automatically) |
| `npm run build` | Production build |
| `npx prisma migrate dev` | Apply database changes |
| `npx prisma db seed` | Load sample branches, staff and services (from M1-2) |

## Project docs

| File | What it's for |
|---|---|
| `CLAUDE.md` | Agent rules and current status pointers |
| `docs/PRD.md` | Requirements, business rules, user stories |
| `docs/DESIGN.md` | Design tokens and the booking-status style table |
| `docs/ARCHITECTURE.md` | Code structure and request flow |
| `docs/ROADMAP.md` | Milestones M0–M9 and their tasks |
| `docs/PROGRESS.md` | What's done, what's next, handoff notes |
| `docs/DECISIONS.md` | Why things are the way they are |
| `docs/OPEN_QUESTIONS.md` | Questions only the supervisor or client can answer |
| `design/screens/` | Every approved screen as an HTML reference |

## Secrets

Never commit `.env`. Keep `.env.example` updated whenever a new environment
variable is introduced. Payments and SMS run in test/fake mode only — see
`CLAUDE.md`, rule 9.
