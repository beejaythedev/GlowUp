import type { PrismaClient } from "@/generated/prisma/client";
import { lagosDateParts, lagosInstant } from "@/lib/lagosTime";
import { computeDelayOffer, type DelayOffer } from "@/server/delayOffer";
import type { AvailabilityBooking } from "@/server/availability";

type Db = Pick<PrismaClient, "booking" | "staff">;

export interface BookingDelayContext {
  booking: NonNullable<Awaited<ReturnType<typeof fetchBooking>>>;
  offer: DelayOffer;
  otherStylistName: string | null;
}

function fetchBooking(db: Db, bookingId: string) {
  return db.booking.findUnique({
    where: { id: bookingId },
    include: { service: true, customer: true, stylist: true, branch: { include: { openingHours: true } } },
  });
}

/**
 * Everything needed to offer (or re-offer) a delay choice for one booking —
 * shared by the "send the message" action and the customer's own choice
 * page (M8-5), so the two never compute different answers for the same
 * booking.
 */
export async function getDelayContext(db: Db, bookingId: string, now: Date): Promise<BookingDelayContext | null> {
  const booking = await fetchBooking(db, bookingId);
  if (!booking || !booking.stylistRequested) return null;

  const today = lagosDateParts(booking.startsAt);
  const hours = booking.branch.openingHours.find((h) => h.weekday === today.weekday);
  const openingHours = hours
    ? {
        opensAt: lagosInstant(today.year, today.month, today.day, 0, hours.opensAtMinute),
        closesAt: lagosInstant(today.year, today.month, today.day, 0, hours.closesAtMinute),
      }
    : null;

  const dayStart = lagosInstant(today.year, today.month, today.day, 0, 0);
  const dayEnd = lagosInstant(today.year, today.month, today.day, 24, 0);

  const branchStylists = await db.staff.findMany({
    where: { branchId: booking.branchId, role: "STYLIST", status: "ACTIVE" },
  });
  const dayBookings = await db.booking.findMany({
    where: { stylistId: { in: branchStylists.map((s) => s.id) }, startsAt: { gte: dayStart, lt: dayEnd } },
    include: { service: true },
  });

  const toAvailabilityBookings = (stylistId: string): AvailabilityBooking[] =>
    dayBookings
      .filter((b) => b.stylistId === stylistId)
      .map((b) => ({
        startsAt: b.startsAt,
        blockedUntil: b.blockedUntil,
        serviceMinDurationMinutes: b.service.minDurationMinutes,
        serviceMaxDurationMinutes: b.service.maxDurationMinutes,
        servicePrepMinutes: b.service.prepMinutes,
        status: b.status,
        depositStatus: b.depositStatus,
        holdExpiresAt: b.holdExpiresAt,
      }));

  const offer = computeDelayOffer({
    service: booking.service,
    branchOffersNails: booking.branch.offersNails,
    openingHours,
    requestedStylistId: booking.stylistId,
    requestedStylistBookings: toAvailabilityBookings(booking.stylistId),
    otherStylists: branchStylists
      .filter((s) => s.id !== booking.stylistId)
      .map((s) => ({ id: s.id, bookings: toAvailabilityBookings(s.id) })),
    originalStartsAt: booking.startsAt,
    now,
  });

  const otherStylistName = offer.otherStylistAtOriginalTime
    ? branchStylists.find((s) => s.id === offer.otherStylistAtOriginalTime!.stylistId)?.name ?? null
    : null;

  return { booking, offer, otherStylistName };
}
