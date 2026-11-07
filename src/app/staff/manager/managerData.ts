import { db } from "@/lib/db";
import type { ManagerBooking } from "@/server/managerToday";

/** Every booking at the branch's stylists that starts within [dayStart, dayEnd). */
export async function fetchBranchDayBookings(stylistIds: string[], dayStart: Date, dayEnd: Date) {
  if (stylistIds.length === 0) return [];
  return db.booking.findMany({
    where: { stylistId: { in: stylistIds }, startsAt: { gte: dayStart, lt: dayEnd } },
    include: { service: true, customer: true },
    orderBy: { startsAt: "asc" },
  });
}

export type BranchDayBookingRow = Awaited<ReturnType<typeof fetchBranchDayBookings>>[number];

export function toManagerBookings(rows: BranchDayBookingRow[], stylists: { id: string; name: string }[]): ManagerBooking[] {
  const stylistName = (id: string) => stylists.find((s) => s.id === id)?.name ?? "—";
  return rows.map((row) => ({
    id: row.id,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    customerName: row.customer.name,
    serviceName: row.service.name,
    stylistName: stylistName(row.stylistId),
    status: row.status,
    source: row.source,
    priceKobo: row.service.priceKobo,
    depositAmountKobo: row.depositAmountKobo,
    depositStatus: row.depositStatus,
    checkedInAt: row.checkedInAt,
  }));
}
