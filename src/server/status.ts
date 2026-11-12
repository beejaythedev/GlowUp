import type { BookingStatus } from "@/generated/prisma/enums";

export type DisplayStatus =
  | "booked"
  | "checkedInEarly"
  | "waiting"
  | "inService"
  | "done"
  | "noShow"
  | "cancelled";

/**
 * "Checked in early" and "waiting" are both derived from CHECKED_IN plus the
 * clock (docs/PRD.md, Check-in and timing, rule 4) — never stored
 * (CLAUDE.md rule 5).
 */
export function getDisplayStatus(
  booking: { status: BookingStatus; startsAt: Date; checkedInAt: Date | null },
  now: Date,
): DisplayStatus {
  switch (booking.status) {
    case "BOOKED":
      return "booked";
    case "CHECKED_IN":
      return now < booking.startsAt ? "checkedInEarly" : "waiting";
    case "IN_SERVICE":
      return "inService";
    case "DONE":
      return "done";
    case "NO_SHOW":
      return "noShow";
    case "CANCELLED":
      return "cancelled";
  }
}

export type BookingAction =
  | "CHECK_IN"
  | "START"
  | "FINISH"
  | "UNDO_CHECK_IN"
  | "NO_SHOW"
  | "CANCEL"
  | "MOVE"
  | "RESCHEDULE";

/**
 * Which stored `BookingStatus` values an action may start from. The single
 * source of truth for both the allowed-transition check below and the
 * DB-level guard in `src/server/bookings.ts` (M5-2) — a status not listed
 * here refuses the action.
 */
const ALLOWED_FROM: Record<BookingAction, BookingStatus[]> = {
  CHECK_IN: ["BOOKED"],
  START: ["CHECKED_IN"],
  FINISH: ["IN_SERVICE"],
  UNDO_CHECK_IN: ["CHECKED_IN"],
  NO_SHOW: ["BOOKED"],
  CANCEL: ["BOOKED", "CHECKED_IN"],
  MOVE: ["BOOKED", "CHECKED_IN"],
  RESCHEDULE: ["BOOKED", "CHECKED_IN"],
};

export function allowedFromStatuses(action: BookingAction): BookingStatus[] {
  return ALLOWED_FROM[action];
}

export function isActionAllowed(status: BookingStatus, action: BookingAction): boolean {
  return ALLOWED_FROM[action].includes(status);
}

/**
 * Wait time = start minus the later of check-in and appointment time
 * (docs/PRD.md, Check-in and timing, rule 3) — early arrivals don't count.
 * Pass the stylist's actual start time for a final record, or the current
 * time for a live "waiting N min" display.
 */
export function getWaitMinutes(params: {
  checkedInAt: Date;
  appointmentStart: Date;
  comparedTo: Date;
}): number {
  const waitFrom = Math.max(
    params.checkedInAt.getTime(),
    params.appointmentStart.getTime(),
  );
  const waitMinutes = (params.comparedTo.getTime() - waitFrom) / 60_000;
  return Math.max(0, Math.round(waitMinutes));
}
