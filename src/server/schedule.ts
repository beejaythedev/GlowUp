import type { BookingSource, BookingStatus } from "@/generated/prisma/enums";
import { getDisplayStatus, getWaitMinutes, type DisplayStatus } from "./status";

export interface ScheduleBooking {
  id: string;
  stylistId: string;
  startsAt: Date;
  endsAt: Date;
  blockedUntil: Date;
  status: BookingStatus;
  checkedInAt: Date | null;
  source: BookingSource;
  customerName: string;
  serviceName: string;
}

export interface ScheduleBlock {
  bookingId: string;
  topPx: number;
  heightPx: number;
  displayStatus: DisplayStatus;
  customerName: string;
  serviceName: string;
  isWalkIn: boolean;
  waitMinutes: number | null;
}

export interface SchedulePrepBlock {
  topPx: number;
  heightPx: number;
}

/** One hour-mark label (e.g. "9:00") and its pixel position down the grid. */
export interface ScheduleHourMark {
  label: string;
  topPx: number;
}

const MIN_BLOCK_HEIGHT_PX = 24;

function minutesFrom(windowStart: Date, instant: Date): number {
  return (instant.getTime() - windowStart.getTime()) / 60_000;
}

function toPx(minutes: number, pxPerHour: number): number {
  return (minutes / 60) * pxPerHour;
}

/** Total grid height for a branch's opening window, at `pxPerHour` pixels per hour. */
export function getGridHeightPx(opensAt: Date, closesAt: Date, pxPerHour: number): number {
  return toPx(minutesFrom(opensAt, closesAt), pxPerHour);
}

/** Hour-mark labels (e.g. "9:00", "10:00", ...) down the time axis, for display. */
export function getHourMarks(
  opensAt: Date,
  closesAt: Date,
  pxPerHour: number,
  formatHour: (instant: Date) => string,
): ScheduleHourMark[] {
  const marks: ScheduleHourMark[] = [];
  const cursor = new Date(opensAt);
  while (cursor.getTime() <= closesAt.getTime()) {
    marks.push({ label: formatHour(cursor), topPx: toPx(minutesFrom(opensAt, cursor), pxPerHour) });
    cursor.setUTCMinutes(cursor.getUTCMinutes() + 60);
  }
  return marks;
}

/** The "now" line's pixel offset, or null if the current time is outside the grid window. */
export function getNowLineTopPx(
  opensAt: Date,
  closesAt: Date,
  now: Date,
  pxPerHour: number,
): number | null {
  if (now < opensAt || now > closesAt) return null;
  return toPx(minutesFrom(opensAt, now), pxPerHour);
}

/**
 * Lays out one stylist's bookings for the day: the appointment block
 * (startsAt–endsAt) plus a separate prep block (endsAt–blockedUntil) where
 * the service has prep time. Cancelled bookings are left out entirely —
 * once cancelled, the slot is just free again.
 */
export function layoutStylistBookings(
  bookings: ScheduleBooking[],
  opensAt: Date,
  pxPerHour: number,
  now: Date,
): { blocks: ScheduleBlock[]; prepBlocks: SchedulePrepBlock[] } {
  const blocks: ScheduleBlock[] = [];
  const prepBlocks: SchedulePrepBlock[] = [];

  for (const booking of bookings) {
    if (booking.status === "CANCELLED") continue;

    const displayStatus = getDisplayStatus(booking, now);
    const topPx = toPx(minutesFrom(opensAt, booking.startsAt), pxPerHour);
    const heightPx = Math.max(
      MIN_BLOCK_HEIGHT_PX,
      toPx(minutesFrom(booking.startsAt, booking.endsAt), pxPerHour),
    );
    const waitMinutes =
      displayStatus === "waiting" && booking.checkedInAt
        ? getWaitMinutes({
            checkedInAt: booking.checkedInAt,
            appointmentStart: booking.startsAt,
            comparedTo: now,
          })
        : null;

    blocks.push({
      bookingId: booking.id,
      topPx,
      heightPx,
      displayStatus,
      customerName: booking.customerName,
      serviceName: booking.serviceName,
      isWalkIn: booking.source === "WALK_IN",
      waitMinutes,
    });

    if (booking.blockedUntil > booking.endsAt) {
      prepBlocks.push({
        topPx: toPx(minutesFrom(opensAt, booking.endsAt), pxPerHour),
        heightPx: toPx(minutesFrom(booking.endsAt, booking.blockedUntil), pxPerHour),
      });
    }
  }

  return { blocks, prepBlocks };
}

/**
 * The short status line under a stylist's name at the top of their column
 * (docs/DESIGN.md's `ReceptionSchedule.dc.html`): busy, waiting, mid-prep,
 * their next booking, or free for the day.
 */
export function getStylistStatusLine(
  bookings: ScheduleBooking[],
  now: Date,
  formatTime: (instant: Date) => string,
): string {
  const active = bookings.filter((b) => b.status !== "CANCELLED");

  const inService = active.find((b) => b.status === "IN_SERVICE");
  if (inService) return `Busy until ${formatTime(inService.endsAt)}`;

  const waiting = active.find((b) => getDisplayStatus(b, now) === "waiting");
  if (waiting) return "Customer waiting";

  const inPrep = active.find((b) => b.endsAt <= now && b.blockedUntil > now);
  if (inPrep) return `Free at ${formatTime(inPrep.blockedUntil)}`;

  const next = active
    .filter((b) => b.startsAt > now)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0];
  if (next) return `Next: ${next.customerName} at ${formatTime(next.startsAt)}`;

  return "Free for the rest of today";
}

export interface DaySummary {
  bookingsToday: number;
  checkedInWaitingCount: number;
  /** The longest current wait among checked-in, waiting customers, or null if none. */
  longestWaitMinutes: number | null;
  inServiceCount: number;
  noShowCount: number;
}

/** The four summary tiles at the top of the schedule. */
export function summarizeDay(bookings: ScheduleBooking[], now: Date): DaySummary {
  const active = bookings.filter((b) => b.status !== "CANCELLED");

  const waitingMinutes = active
    .filter((b) => getDisplayStatus(b, now) === "waiting" && b.checkedInAt)
    .map((b) =>
      getWaitMinutes({ checkedInAt: b.checkedInAt!, appointmentStart: b.startsAt, comparedTo: now }),
    );

  return {
    bookingsToday: active.length,
    checkedInWaitingCount: waitingMinutes.length,
    longestWaitMinutes: waitingMinutes.length ? Math.max(...waitingMinutes) : null,
    inServiceCount: active.filter((b) => b.status === "IN_SERVICE").length,
    noShowCount: active.filter((b) => b.status === "NO_SHOW").length,
  };
}
