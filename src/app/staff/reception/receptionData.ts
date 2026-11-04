import { db } from "@/lib/db";
import { formatLagosClockTime } from "@/lib/lagosTime";
import { balanceDueKobo } from "@/server/money";
import { getFlaggedBookingId, isRunningOver } from "@/server/schedule";
import { getDisplayStatus, getWaitMinutes, isActionAllowed } from "@/server/status";
import type { SelectedBooking } from "./BookingPanel";

export type TodaysBookingRow = NonNullable<Awaited<ReturnType<typeof fetchTodaysBookings>>>[number];

/** Every booking at the given branch's stylists that starts within [dayStart, dayEnd). */
export async function fetchTodaysBookings(stylistIds: string[], dayStart: Date, dayEnd: Date) {
  return db.booking.findMany({
    where: { stylistId: { in: stylistIds }, startsAt: { gte: dayStart, lt: dayEnd } },
    include: { service: true, customer: true },
    orderBy: { startsAt: "asc" },
  });
}

/** Everything the booking panel needs to display and act on one booking. */
export async function buildSelectedBooking(
  booking: TodaysBookingRow,
  allTodaysBookings: TodaysBookingRow[],
  stylists: { id: string; name: string }[],
  now: Date,
): Promise<SelectedBooking> {
  const stylistName = stylists.find((s) => s.id === booking.stylistId)?.name ?? "—";
  const otherBookingsCount = await db.booking.count({
    where: { customerId: booking.customerId, id: { not: booking.id } },
  });

  // Same-stylist bookings only — rule 9's running-over/flagging logic
  // (docs/PRD.md, Check-in and timing) only needs id/startsAt/endsAt/status.
  const stylistBookings = allTodaysBookings.filter(
    (b) => b.stylistId === booking.stylistId && b.status !== "CANCELLED",
  );
  const flaggedForDelay = getFlaggedBookingId(stylistBookings, now) === booking.id;

  const sourceLabel: Record<typeof booking.source, string> = {
    ONLINE: "Booked online",
    PHONE: "Booked by phone",
    WALK_IN: "Walk-in",
  };

  const lateMinutes =
    booking.checkedInAt && booking.checkedInAt > booking.startsAt
      ? Math.round((booking.checkedInAt.getTime() - booking.startsAt.getTime()) / 60_000)
      : null;

  return {
    bookingId: booking.id,
    customerName: booking.customer.name,
    sourceLabel: sourceLabel[booking.source],
    isFirstVisit: otherBookingsCount === 0,
    displayStatus: getDisplayStatus(booking, now),
    waitMinutes: booking.checkedInAt
      ? getWaitMinutes({ checkedInAt: booking.checkedInAt, appointmentStart: booking.startsAt, comparedTo: now })
      : null,
    serviceName: booking.service.name,
    stylistName,
    stylistRequested: booking.stylistRequested,
    isWalkIn: booking.source === "WALK_IN",
    depositAmountKobo: booking.depositAmountKobo,
    depositStatus: booking.depositStatus,
    balanceDueKobo: balanceDueKobo(booking.service.priceKobo, booking.depositAmountKobo),
    appointmentLabel: formatLagosClockTime(booking.startsAt),
    checkedInLabel: booking.checkedInAt ? formatLagosClockTime(booking.checkedInAt) : null,
    startedLabel: booking.startedAt ? formatLagosClockTime(booking.startedAt) : null,
    finishedLabel: booking.finishedAt ? formatLagosClockTime(booking.finishedAt) : null,
    lateNote:
      lateMinutes !== null
        ? `${booking.customer.name.split(" ")[0]} arrived ${lateMinutes} min late, so the wait counts from ${formatLagosClockTime(booking.checkedInAt!)}.`
        : null,
    canCheckIn: isActionAllowed(booking.status, "CHECK_IN"),
    canStart: isActionAllowed(booking.status, "START"),
    canFinish: isActionAllowed(booking.status, "FINISH"),
    canUndoCheckIn: isActionAllowed(booking.status, "UNDO_CHECK_IN"),
    canMarkNoShow: isActionAllowed(booking.status, "NO_SHOW"),
    canCancel: isActionAllowed(booking.status, "CANCEL"),
    canMove: isActionAllowed(booking.status, "MOVE"),
    otherStylists: stylists.filter((s) => s.id !== booking.stylistId).map((s) => ({ id: s.id, name: s.name })),
    runningOver: isRunningOver(booking, now),
    flaggedForDelay,
  };
}
