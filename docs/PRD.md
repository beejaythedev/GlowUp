# PRD: GlowUp Salons Booking v1

Source of truth for requirements. The living version is the client-facing PRD document;
this copy is for the build. If they disagree, ask the supervisor.

## Problem

Customers, receptionists and stylists at GlowUp's four branches struggle with booking
because appointments are managed through separate paper notebooks, phone calls and
WhatsApp, with no shared system. This causes missed calls, double-bookings, long waits
and frequent no-shows. (Some customer loss is also due to two stylists leaving in July;
this product doesn't address that.)

## Success metrics (measured 60 days after launch)

| Metric | Today | Target |
|---|---|---|
| Wait past appointment time | Unknown, measure before launch | No customer waits more than 15 minutes |
| Missed calls, Lekki, Saturdays | 20–30 per Saturday | Under 5 |
| Double-bookings | Frequent | Zero |
| No-show rate, Saturdays | About 1 in 5 | Under 1 in 10 |
| Bookings made online | 0% | At least 40% |

## Scope

- **v1, 30 Nov 2026:** online booking, deposits, reminders, staff schedules, check-in and
  start/finish, branch and owner dashboards, settings, staff access.
- **v1.1, December:** stories marked Later.
- **January 2027:** loyalty rewards. **Later:** product shop.
- **Out of scope for v1:** native mobile app, AI features, payroll, stock, accounting.

## Platform

One responsive web app. Customers book on a mobile-friendly site reached by link from
WhatsApp, Instagram and Google, with no account and no install. Staff sign in to the same
app. Reminders go by SMS (or WhatsApp, to be decided) rather than push notifications.

## Branches, services and staff

**Branches:** Lekki (14 Admiralty Way, Lekki Phase 1; busiest), Ikeja, Yaba, Surulere.
All open Monday–Saturday 9am–7pm. Lekki also opens Sunday 12pm–6pm.
Nails only at Lekki and Ikeja.

| Service | Price (₦) | Duration | Deposit 20% (₦) | Prep after | Branches |
|---|---|---|---|---|---|
| Knotless braids | 25,000 | 4–5 hrs | 5,000 | 15 min | All |
| Makeup | 20,000 | 1.5 hrs | 4,000 | 10 min | All |
| Wig installation | 15,000 | 2 hrs | 3,000 | 15 min | All |
| Relaxer and styling | 12,000 | 1.5 hrs | 2,400 | 10 min | All |
| Wash and set | 8,000 | 1 hr | 1,600 | 10 min | All |
| Pedicure | 8,000 | 1 hr | 1,600 | 5 min | Lekki, Ikeja |
| Manicure | 6,000 | 45 min | 1,200 | 5 min | Lekki, Ikeja |

**Staff (sample, used in designs and seed data):** Tolu (owner). Lekki: Ada (receptionist),
Grace (branch manager), stylists Blessing, Zainab, Ronke, Ifeoma. Ikeja: Kelechi (receptionist).

## Business rules

- **Deposit:** 20% of the service price, paid online through Paystack (card or bank transfer) when booking. Walk-ins pay no deposit.
  Phone bookings get a deposit link by SMS.
- **Cancellation:** full refund if cancelled at least 24 hours before; kept for later
  cancellations and no-shows.
- **Final bill:** deposit deducted from the total.
- **Reminders:** free to customers; 24 hours before (last free-cancellation chance) and 3 hours before.
- **Arrive early:** confirmation and reminders ask customers to arrive 10 minutes early.
- **Slot hold:** a slot is held for 10 minutes while the customer pays.
- **Approvals:** Tolu approves designs; Femi (accountant) reviews payments; Ada tests reception screens.

## Check-in, timing and buffers

1. **Check-in:** the receptionist checks each customer in with one tap. If tapped late, she
   can pick "arrived 5 or 10 minutes ago". Walk-ins served straight away are checked in
   automatically.
2. **Start and Finish:** the stylist taps Start and Finish on their phone; the receptionist
   can do it as a backup.
3. **Wait time:** start time minus the later of check-in time and appointment time. Early
   arrivals don't count as waiting.
4. **Display status** (derived): checked in before appointment time and not started =
   "checked in, early" (green); past appointment time and not started = "waiting" (amber).
5. **Safety net:** 15 minutes after the appointment time, if not checked in or started, the
   reception schedule asks "Has [name] arrived?" (check in, not yet, or no-show).
6. **Prep buffer** per service (table above), adjustable by Tolu. Customers never see it.
   Trade-off accepted: a 9am–7pm stylist fits ten 1-hour services back to back, or eight
   with 10-minute prep.
7. **Services with a duration range** (braids, 4–5 hrs): the schedule blocks the shortest
   duration plus prep. The longest duration decides the last start of the day (braids: 2pm
   on a 7pm close).
8. **Requested stylist:** each booking records whether the customer chose a specific stylist
   or "Any available". Right after a service with a range, a customer who requested that
   stylist only sees times after the longest duration plus prep (example: after 11:00 braids
   with Ronke, an "any" customer can book 3:15, a customer asking for Ronke sees 4:15 at the
   earliest). Requested bookings show a "Requested" marker on the schedule.
9. **Running over:** if the stylist hasn't tapped Finish 15 minutes before the booked end,
   the booking shows "running over" and the next booking is flagged. "Any" bookings can be
   moved to a free stylist. Requested bookings are never moved without asking: the customer
   gets an SMS offering a later time with the same stylist or the original time with another
   stylist. The wait still counts in the metrics.
10. **Learning real durations:** Start and Finish times are kept so typical durations can be
   adjusted later from real data.

## Users and needs

| User | Needs |
|---|---|
| Customer | Book in under 2 minutes without calling or installing anything; reminders |
| Receptionist | Faster than the notebook on busy days; every stylist on one screen |
| Stylist | Tomorrow's appointments the evening before; easy Start and Finish |
| Branch manager | Live view of their branch: delays, bookings, deposits |
| Owner | All branches at a glance; staff access; settings |

## User stories

| # | User | Story | Priority |
|---|---|---|---|
| S1 | Customer | See available time slots for a service and stylist so I can book without calling. | Must |
| S2 | Customer | Book with just my name and phone, no account, in under 2 minutes. | Must |
| S3 | Customer | Book for someone else. | Later |
| S4 | Customer | Pay a deposit when I book so my slot is guaranteed. | Must |
| S5 | Customer | Get an SMS reminder before my appointment. | Must |
| S6 | Customer | Reschedule or cancel from my confirmation link. | Later |
| S7 | Receptionist | See every stylist's schedule for the day on one screen. | Must |
| S8 | Receptionist | Add a phone or walk-in booking in a few taps, faster than the notebook. | Must |
| S9 | Receptionist | Check customers in with one tap and mark no-shows, so wait times are accurate. | Must |
| S10 | Stylist | See tomorrow's appointments by the evening before. | Must |
| S11 | Stylist | Set my working hours and days off. | Later |
| S12 | Manager | See today's bookings and their status to spot delays. | Must |
| S13 | Manager | See average delay against the 15-minute goal. | Later |
| S14 | Manager | See daily and weekly customer numbers. | Later |
| S15 | Manager | See deposits received to reconcile daily takings. | Must |
| S16 | Manager | See the no-show rate. | Later |
| S17 | Owner | Compare key numbers across all four branches. | Must |
| S18 | Owner | Control what each staff member can see. | Must |
| S19 | Owner | Set the deposit amount and cancellation rules. | Later (covered in M7-4) |
| S20 | Stylist | Tap Start and Finish so the schedule and wait times stay accurate. | Must |
| S21 | Owner | Set prep time per service. | Must |
| S22 | Receptionist | Be prompted when a customer is 15 minutes past their time and not checked in. | Must |
| S23 | Customer | Check myself in with a QR code at the desk. | Later |

## Risks

| Risk | Mitigation |
|---|---|
| Receptionists abandon the tool on busy days (as with Google Calendar) | Test with Ada early; check-in and walk-ins must beat the notebook on speed |
| Customers resist deposits | Small deposit, explained clearly at booking |
| 6-week deadline slips | Must-haves only; anything else moves to v1.1 |
| Staff need training | Short session per branch in the last week of November |
