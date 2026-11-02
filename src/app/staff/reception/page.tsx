import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { formatLagosClockTime, formatLagosDateLabel, lagosDateParts, lagosInstant } from "@/lib/lagosTime";
import { requireStaffSection } from "@/server/auth/requireStaffSection";
import { roleHomePath } from "@/server/auth/roleHome";
import { balanceDueKobo } from "@/server/money";
import { getDisplayStatus, getWaitMinutes, isActionAllowed, type DisplayStatus } from "@/server/status";
import {
  getGridHeightPx,
  getHourMarks,
  getNowLineTopPx,
  getStylistStatusLine,
  layoutStylistBookings,
  summarizeDay,
  type ScheduleBooking,
} from "@/server/schedule";
import { ReceptionScheduleView, type SelectedBooking, type StylistColumn } from "./ReceptionScheduleView";

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
    ? await buildSelectedBooking(selectedBookingRow, stylists, now)
    : null;

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
    />
  );
}

type TodaysBookingRow = NonNullable<Awaited<ReturnType<typeof fetchTodaysBookings>>>[number];

async function fetchTodaysBookings(stylistIds: string[], dayStart: Date, dayEnd: Date) {
  return db.booking.findMany({
    where: { stylistId: { in: stylistIds }, startsAt: { gte: dayStart, lt: dayEnd } },
    include: { service: true, customer: true },
    orderBy: { startsAt: "asc" },
  });
}

async function buildSelectedBooking(
  booking: TodaysBookingRow,
  stylists: { id: string; name: string }[],
  now: Date,
): Promise<SelectedBooking> {
  const stylistName = stylists.find((s) => s.id === booking.stylistId)?.name ?? "—";
  const otherBookingsCount = await db.booking.count({
    where: { customerId: booking.customerId, id: { not: booking.id } },
  });

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
  };
}

function formatBlockTimeLabel(
  booking: ScheduleBooking,
  displayStatus: DisplayStatus,
  waitMinutes: number | null,
): string {
  const range = `${formatLagosClockTime(booking.startsAt)} – ${formatLagosClockTime(booking.endsAt)}`;
  const statusLabel: Record<DisplayStatus, string> = {
    booked: "Booked",
    checkedInEarly: "Checked in",
    waiting: waitMinutes !== null ? `Waiting ${waitMinutes} min` : "Waiting",
    inService: "In service",
    done: "Done",
    noShow: "No-show",
    cancelled: "Cancelled",
  };
  return `${range} · ${statusLabel[displayStatus]}`;
}
