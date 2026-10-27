# Decision log

Newest first. Add an entry whenever the supervisor or client decides something that
changes how the product works. Don't reverse a decision without a new entry.

| Date | Decision | Why | Decided by |
|---|---|---|---|
| 27 Oct 2026 | `tsx` added as a dev dependency to run `prisma/seed.ts` and dev scripts | Prisma's generated client uses extensionless ESM imports meant for bundler resolution; Node's native TS runner can't resolve them directly. `tsx` is Prisma's own documented fix | Supervisor |
| 22 Oct 2026 | Treat the build as a practice project: Vercel Hobby, Neon Free, Paystack test mode, console messages only | Learning project; keep it free and simple. `docs/TECH_STACK.md` keeps the real-project options for reference | Supervisor |
| 22 Oct 2026 | Better Auth for staff sign-in instead of Auth.js | Auth.js moved under the Better Auth team in 2025, which recommends Better Auth for new projects | Supervisor (proposed) |
| 22 Oct 2026 | Paystack handles deposits (card and pay-with-transfer); no manual receipts | Automatic confirmation and matching, no fake-receipt risk, refunds from the system; about ₦175 per ₦5,000 deposit | Tolu |
| 22 Oct 2026 | Bookings record whether the stylist was requested. Right after a service with a duration range, requested-stylist bookings only see times after the longest estimate plus prep; "any stylist" bookings can use times after the shortest estimate plus prep | The uncertain time still gets sold, but only to customers who can be moved to another stylist if a service runs long | Supervisor |
| 22 Oct 2026 | Services with a range (braids 4–5 hrs) block the shortest duration plus prep; the longest duration sets the last start time of the day | Matches the designs, doesn't waste time when stylists finish early, and nobody works past closing | Supervisor |
| 22 Oct 2026 | "Running over" warning if Finish isn't tapped 15 min before the booked end; the next booking is flagged | Gives reception time to reassign or warn the next customer | Supervisor |
| 22 Oct 2026 | Receptionist checks in every customer; QR self check-in moved to Later | Works for everyone (no phone, booked by someone else), less to build | Supervisor |
| 22 Oct 2026 | Stylist taps Start and Finish; receptionist can do it as backup | Accurate timestamps without adding receptionist work | Supervisor |
| 22 Oct 2026 | Wait time = start minus the later of check-in and appointment time | Early arrivals and late customers shouldn't count against the salon | Supervisor |
| 22 Oct 2026 | 15-minute "Has she arrived?" prompt | Safety net for missed check-ins and no-shows | Supervisor |
| 22 Oct 2026 | Prep time per service, owner-adjustable; customers asked to arrive 10 min early | Stylists need cleanup time; buffers absorb overruns and reduce waits | Supervisor, Tolu |
| 22 Oct 2026 | Navy and cobalt palette with coral accent | Trustworthy and calm, with warmth for a beauty brand | Supervisor |
| 22 Oct 2026 | Deposit 20%, refundable up to 24 hours before, deducted from the bill | Scales with service value; fair to customers; reduces no-shows | Tolu |
| 22 Oct 2026 | Customers book as guests (name + phone), no account | Speed; customers book monthly and won't create accounts | Supervisor |
| 22 Oct 2026 | One responsive web app, no native app | No install for customers, one codebase, no app-store delays | Supervisor, Tolu |
| 22 Oct 2026 | Booking first; loyalty in January; shop later | Six weeks to the December rush | Tolu |
| 22 Oct 2026 | Full scope at $3,500, paid in milestones | Agreed quote | Tolu |
