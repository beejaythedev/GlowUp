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
