# Progress

The supervisor reads this to see what's done. The agent updates it after every task
and writes a handoff note before every session ends.

## Latest handoff note

> **Date:** 2026-10-22
> **Done this session:** M0-1, M0-2 and M0-3. M0-3: Prisma set up against PostgreSQL —
> local dev runs in a Docker container (`docker run ... postgres:17-alpine`, see
> `.env.example`); `prisma/schema.prisma` has the datasource/generator config plus a
> placeholder `SetupCheck` model (real data model is M1-1); `src/lib/db.ts` is the
> shared client, built on the `prisma-client` generator (output to `src/generated/prisma`,
> gitignored) with the `@prisma/adapter-pg` driver adapter, as Prisma 7 requires.
> Verified `npx prisma migrate dev` against a freshly created container from scratch.
> Pinned `prisma`/`@prisma/client`/`@prisma/adapter-pg` to the stable `7.10.1` — the
> npm `latest` tag currently points at an `8.0.0-rc` release candidate that pulls in a
> large, unrelated "Composer" deployment toolchain (`alchemy`, bundled AWS/GCP SDKs);
> avoided it as unstable and out of scope.
> **Half-done:** none.
> **Next task:** M0-4 — set up Vitest and Playwright, and an `npm run check` script.
> **Blockers or questions:** none.

## Milestones

| Milestone | Status | Supervisor approved |
|---|---|---|
| M0 Foundations | In progress | |
| M1 Data model and seed | Not started | |
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
| 2026-10-22 | M0-3 | Prisma + PostgreSQL (Docker for local dev), `.env.example`, `src/lib/db.ts` | `npx prisma migrate dev` against a fresh container; `npm run lint`, `npm run build` |
| 2026-10-22 | M0-2 | Tailwind design tokens (`@theme` in globals.css), Plus Jakarta Sans, `/dev/tokens` page | `npm run lint`, `npm run build`, manual check of `/dev/tokens` |
| 2026-10-22 | M0-1 | Scaffolded Next.js (TS strict, App Router, Tailwind, ESLint, Prettier) | `npm run lint`, `npm run build` pass |
