import { db } from "@/lib/db";
import type { StylistBooking } from "@/server/stylistToday";

export type TodaysStylistBookingRow = NonNullable<Awaited<ReturnType<typeof fetchStylistDayBookings>>>[number];

/** Every booking for one stylist that starts within [dayStart, dayEnd). */
export async function fetchStylistDayBookings(stylistId: string, dayStart: Date, dayEnd: Date) {
  return db.booking.findMany({
    where: { stylistId, startsAt: { gte: dayStart, lt: dayEnd } },
    include: { service: true, customer: true },
    orderBy: { startsAt: "asc" },
  });
}

/** `isFirstVisit` needs one extra query per customer, same rule reception uses (M5-2). */
export async function toStylistBookings(rows: TodaysStylistBookingRow[]): Promise<StylistBooking[]> {
  return Promise.all(
    rows.map(async (row) => {
      const otherBookingsCount = await db.booking.count({
        where: { customerId: row.customerId, id: { not: row.id } },
      });
      return {
        id: row.id,
        customerName: row.customer.name,
        serviceName: row.service.name,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        blockedUntil: row.blockedUntil,
        status: row.status,
        checkedInAt: row.checkedInAt,
        depositStatus: row.depositStatus,
        isFirstVisit: otherBookingsCount === 0,
      };
    }),
  );
}
