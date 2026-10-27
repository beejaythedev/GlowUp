-- No-double-booking guard (CLAUDE.md rule 4). Prisma's schema language can't
-- express an exclusion constraint, so this is hand-written (see the comment
-- on the Booking model in schema.prisma).
--
-- Refuses two active (non-cancelled) bookings for the same stylist whose
-- [startsAt, blockedUntil) ranges overlap, even under concurrent inserts —
-- Postgres enforces this at the index level, not just on read.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_no_stylist_overlap"
  EXCLUDE USING gist (
    "stylistId" WITH =,
    tsrange("startsAt", "blockedUntil", '[)') WITH &&
  )
  WHERE (status <> 'CANCELLED'::"BookingStatus");
