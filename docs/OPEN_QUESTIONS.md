# Open questions

Questions the agent can't answer alone. The agent adds them; the supervisor answers
and moves the answer into `docs/DECISIONS.md`.

| # | Question | Needed by | Recommendation | Status |
|---|---|---|---|---|
| Q1 | Braids take 4–5 hours. Should the schedule block 4 or 5 hours? | M2 | Answered 22 Oct: block 4 hours plus prep; 5 hours sets the last start of the day; requested-stylist bookings start after 5 hours plus prep. See `docs/DECISIONS.md`. | Answered |
| Q2 | Current average wait time (baseline) | M9 | Receptionists log arrival and start times for a week before launch | Open |
| Q3 | Which payment provider? | M8 | Answered 22 Oct: Paystack, chosen by Tolu. See `docs/TECH_STACK.md`. | Answered |
| Q4 | SMS or WhatsApp for reminders, and which provider? | M8 | Answered 22 Oct: practice project, so messages go to the console sender only | Answered |
| Q5 | Staff lists and addresses for Ikeja, Yaba and Surulere | M9 | Tolu to send | Open |
| Q6 | Hosting and database provider, and who pays for them | M9 | Answered 22 Oct: Vercel Hobby and Neon Free (practice project, no cost) | Answered |
| Q7 | Grace period before a no-show can be marked | M5 | Same as the prompt: 15 minutes | Open |
