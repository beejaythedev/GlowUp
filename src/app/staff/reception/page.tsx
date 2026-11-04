import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { formatLagosClockTime, formatLagosDateLabel, lagosDateParts, lagosInstant } from "@/lib/lagosTime";
import { requireStaffSection } from "@/server/auth/requireStaffSection";
import { roleHomePath } from "@/server/auth/roleHome";
import type { DisplayStatus } from "@/server/status";
import { formatTimeUntil } from "@/server/checkInSearch";
import {
  findOverdueBookings,
  getGridHeightPx,
  getHourMarks,
  getNowLineTopPx,
  getStylistStatusLine,
  layoutStylistBookings,
  summarizeDay,
  type ScheduleBooking,
} from "@/server/schedule";
import type { OverduePrompt } from "./CheckInPromptModal";
import { ReceptionScheduleView, type StylistColumn } from "./ReceptionScheduleView";
import { buildSelectedBooking, fetchTodaysBookings } from "./receptionData";

export const metadata: Metadata = {
  title: "Today's schedule — GlowUp Salons",
};

// Reads live bookings/check-in state on every request; the client view also
// polls every 30 seconds (docs/ROADMAP.md, M5-1).
export const instant = false;

const PX_PER_HOUR = 100;

interface PageProps {
  searchParams: Promise<{ bookingId?: string }>;
}

export default async function ReceptionPage({ searchParams }: PageProps) {
  const { bookingId } = await searchParams;
  const staff = await requireStaffSection("reception");
  // The owner can open every section (M4-3), but has no branch of their own
  // to show a schedule for — there's no branch-switcher here, so send them
  // to their own overview instead of a dead page.
  if (!staff.branchId) redirect(roleHomePath(staff.role));

  const branch = await db.branch.findUnique({
    where: { id: staff.branchId },
    include: { openingHours: true },
  });
  if (!branch) notFound();

  const now = new Date();
  const today = lagosDateParts(now);
  const hours = branch.openingHours.find((h) => h.weekday === today.weekday);
  const opensAt = hours ? lagosInstant(today.year, today.month, today.day, 0, hours.opensAtMinute) : null;
  const closesAt = hours ? lagosInstant(today.year, today.month, today.day, 0, hours.closesAtMinute) : null;

  const stylists = await db.staff.findMany({
    where: { branchId: branch.id, role: "STYLIST", status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });

  const dayStart = lagosInstant(today.year, today.month, today.day, 0, 0);
  const dayEnd = lagosInstant(today.year, today.month, today.day, 24, 0);

  const todaysBookings = stylists.length
    ? await fetchTodaysBookings(stylists.map((s) => s.id), dayStart, dayEnd)
    : [];

  const scheduleBookings: ScheduleBooking[] = todaysBookings.map((b) => ({
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

  const summary = summarizeDay(scheduleBookings, now);

  const columns: StylistColumn[] = stylists.map((stylist) => {
    const stylistBookings = scheduleBookings.filter((b) => b.stylistId === stylist.id);
    const { blocks, prepBlocks } = opensAt
      ? layoutStylistBookings(stylistBookings, opensAt, PX_PER_HOUR, now)
      : { blocks: [], prepBlocks: [] };
    return {
      stylistId: stylist.id,
      stylistName: stylist.name,
      statusLine: getStylistStatusLine(stylistBookings, now, formatLagosClockTime),
      blocks: blocks.map((block) => ({
        ...block,
        timeLabel: formatBlockTimeLabel(
          scheduleBookings.find((b) => b.id === block.bookingId)!,
          block.displayStatus,
          block.waitMinutes,
          block.runningOver,
        ),
      })),
      prepBlocks,
    };
  });

  const gridHeightPx = opensAt && closesAt ? getGridHeightPx(opensAt, closesAt, PX_PER_HOUR) : 0;
  const hourMarks = opensAt && closesAt ? getHourMarks(opensAt, closesAt, PX_PER_HOUR, formatLagosClockTime) : [];
  const nowLineTopPx = opensAt && closesAt ? getNowLineTopPx(opensAt, closesAt, now, PX_PER_HOUR) : null;

  const selectedBookingRow = bookingId ? todaysBookings.find((b) => b.id === bookingId) : undefined;
  const selectedBooking = selectedBookingRow
    ? await buildSelectedBooking(selectedBookingRow, todaysBookings, stylists, now)
    : null;

  const overduePrompts: OverduePrompt[] = findOverdueBookings(scheduleBookings, now).map((b) => ({
    bookingId: b.id,
    customerName: b.customerName,
    stylistName: stylists.find((s) => s.id === b.stylistId)?.name ?? "—",
    appointmentLabel: formatLagosClockTime(b.startsAt),
    overdueLabel: formatTimeUntil(b.startsAt, now),
    minutesLate: Math.round((now.getTime() - b.startsAt.getTime()) / 60_000),
  }));

  return (
    <ReceptionScheduleView
      staffName={staff.name}
      branchName={branch.name}
      dateLabel={formatLagosDateLabel(now)}
      nowLabel={formatLagosClockTime(now)}
      summary={summary}
      columns={columns}
      gridHeightPx={gridHeightPx}
      hourMarks={hourMarks}
      nowLineTopPx={nowLineTopPx}
      isOpenToday={opensAt !== null && closesAt !== null}
      selectedBookingId={bookingId ?? null}
      selectedBooking={selectedBooking}
      overduePrompts={overduePrompts}
    />
  );
}

function formatBlockTimeLabel(
  booking: ScheduleBooking,
  displayStatus: DisplayStatus,
  waitMinutes: number | null,
  runningOver: boolean,
): string {
  const range = `${formatLagosClockTime(booking.startsAt)} – ${formatLagosClockTime(booking.endsAt)}`;
  const statusLabel: Record<DisplayStatus, string> = {
    booked: "Booked",
    checkedInEarly: "Checked in",
    waiting: waitMinutes !== null ? `Waiting ${waitMinutes} min` : "Waiting",
    inService: runningOver ? "Running over" : "In service",
    done: "Done",
    noShow: "No-show",
    cancelled: "Cancelled",
  };
  return `${range} · ${statusLabel[displayStatus]}`;
}
