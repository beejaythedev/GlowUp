import { db } from "@/lib/db";
import type { OwnerBooking } from "@/server/ownerOverview";

/** Every booking across all branches that starts within [weekStart, weekEnd). */
export async function fetchCompanyWeekBookings(weekStart: Date, weekEnd: Date): Promise<OwnerBooking[]> {
  const rows = await db.booking.findMany({
    where: { startsAt: { gte: weekStart, lt: weekEnd } },
    select: {
      id: true,
      branchId: true,
      startsAt: true,
      endsAt: true,
      status: true,
      source: true,
      depositAmountKobo: true,
      depositStatus: true,
      checkedInAt: true,
    },
  });
  return rows;
}

/**
 * Phone bookings still unpaid ahead of their appointment (M8-3 sends the
 * deposit link later; this isn't limited to "this week" — any upcoming one
 * counts).
 */
export async function fetchUnpaidPhoneDepositBookings(now: Date): Promise<OwnerBooking[]> {
  const rows = await db.booking.findMany({
    where: {
      source: "PHONE",
      depositStatus: { in: ["NONE", "PENDING"] },
      startsAt: { gt: now },
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
    },
    select: {
      id: true,
      branchId: true,
      startsAt: true,
      endsAt: true,
      status: true,
      source: true,
      depositAmountKobo: true,
      depositStatus: true,
      checkedInAt: true,
    },
  });
  return rows;
}
