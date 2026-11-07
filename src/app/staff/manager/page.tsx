import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { formatLagosClockTime, formatLagosDateLabel, lagosDateParts, lagosInstant } from "@/lib/lagosTime";
import { requireStaffSection } from "@/server/auth/requireStaffSection";
import { roleHomePath } from "@/server/auth/roleHome";
import { summarizeDay, type ScheduleBooking } from "@/server/schedule";
import { splitBySource, summarizeManagerMoney } from "@/server/managerToday";
import { fetchBranchDayBookings, toManagerBookings } from "./managerData";
import { ManagerTodayView } from "./ManagerTodayView";

export const metadata: Metadata = {
  title: "Today — GlowUp Salons",
};

// Reads live bookings/check-in state on every request (matches reception, M5-1).
export const instant = false;

export default async function ManagerTodayPage() {
  const staff = await requireStaffSection("manager");
  // The owner can open every section (M4-3), but has no branch of their own —
  // send them to their own overview instead of a dead page (same guard as reception, M5-1).
  if (!staff.branchId) redirect(roleHomePath(staff.role));

  const branch = await db.branch.findUnique({ where: { id: staff.branchId } });
  if (!branch) notFound();

  const now = new Date();
  const today = lagosDateParts(now);
  const dayStart = lagosInstant(today.year, today.month, today.day, 0, 0);
  const dayEnd = lagosInstant(today.year, today.month, today.day, 24, 0);

  const stylists = await db.staff.findMany({
    where: { branchId: branch.id, role: "STYLIST", status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });

  const rows = await fetchBranchDayBookings(stylists.map((s) => s.id), dayStart, dayEnd);
  const bookings = toManagerBookings(rows, stylists);

  const scheduleBookings: ScheduleBooking[] = rows.map((b) => ({
    id: b.id,
    stylistId: b.stylistId,
    startsAt: b.startsAt,
    endsAt: b.endsAt,
    blockedUntil: b.blockedUntil,
    status: b.status,
    checkedInAt: b.checkedInAt,
    source: b.source,
    customerName: b.customer.name,
    serviceName: b.service.name,
    stylistRequested: b.stylistRequested,
  }));

  const daySummary = summarizeDay(scheduleBookings, now);
  const { advanceCount, walkInCount } = splitBySource(bookings);
  const money = summarizeManagerMoney(bookings);

  return (
    <ManagerTodayView
      staffName={staff.name}
      branchName={branch.name}
      dateLabel={formatLagosDateLabel(now)}
      nowLabel={formatLagosClockTime(now)}
      now={now}
      bookings={bookings}
      daySummary={daySummary}
      advanceCount={advanceCount}
      walkInCount={walkInCount}
      money={money}
    />
  );
}
