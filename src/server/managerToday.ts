import type { BookingSource, BookingStatus, DepositStatus } from "@/generated/prisma/enums";
import { formatNaira } from "@/lib/money";
import { balanceDueKobo } from "@/server/money";

export interface ManagerBooking {
  id: string;
  startsAt: Date;
  endsAt: Date;
  customerName: string;
  serviceName: string;
  stylistName: string;
  status: BookingStatus;
  source: BookingSource;
  priceKobo: number;
  depositAmountKobo: number;
  depositStatus: DepositStatus;
  checkedInAt: Date | null;
}

/**
 * How today's bookings split for the "Bookings today" tile. Phone and online
 * bookings are both booked ahead of time, as opposed to a walk-in — the
 * `ManagerToday.dc.html` mockup's sample data happens to have no phone
 * bookings, which is why it only labels the two groups "online"/"walk-in".
 */
export function splitBySource(bookings: ManagerBooking[]): { advanceCount: number; walkInCount: number } {
  const active = bookings.filter((b) => b.status !== "CANCELLED");
  const walkInCount = active.filter((b) => b.source === "WALK_IN").length;
  return { advanceCount: active.length - walkInCount, walkInCount };
}

export interface ManagerMoneySummary {
  depositsReceivedKobo: number;
  depositsReceivedCount: number;
  keptFromNoShowsKobo: number;
  refundedKobo: number;
  expectedAtTillKobo: number;
}

/**
 * The money card: what's actually been collected today, and what's still
 * expected at the till. Refunds come from the 24-hour free-cancellation rule
 * (M8-2, `src/server/bookingCancellation.ts`).
 */
export function summarizeManagerMoney(bookings: ManagerBooking[]): ManagerMoneySummary {
  const collected = bookings.filter(
    (b) => b.depositStatus === "PAID" || b.depositStatus === "KEPT" || b.depositStatus === "REFUNDED",
  );
  const depositsReceivedKobo = collected.reduce((sum, b) => sum + b.depositAmountKobo, 0);
  const keptFromNoShowsKobo = bookings
    .filter((b) => b.depositStatus === "KEPT")
    .reduce((sum, b) => sum + b.depositAmountKobo, 0);
  const refundedKobo = bookings
    .filter((b) => b.depositStatus === "REFUNDED")
    .reduce((sum, b) => sum + b.depositAmountKobo, 0);
  const expectedAtTillKobo = bookings
    .filter((b) => b.status !== "NO_SHOW" && b.status !== "CANCELLED")
    .reduce((sum, b) => sum + balanceDueKobo(b.priceKobo, b.depositAmountKobo), 0);

  return {
    depositsReceivedKobo,
    depositsReceivedCount: collected.length,
    keptFromNoShowsKobo,
    refundedKobo,
    expectedAtTillKobo,
  };
}

const CSV_STATUS_LABEL: Record<BookingStatus, string> = {
  BOOKED: "Booked",
  CHECKED_IN: "Checked in",
  IN_SERVICE: "In service",
  DONE: "Done",
  NO_SHOW: "No-show",
  CANCELLED: "Cancelled",
};

/** One row's status label for the CSV — plain text, not the live "waiting N min" used on screen (a downloaded file is a snapshot, not a ticking clock). */
export function csvStatusLabel(status: BookingStatus): string {
  return CSV_STATUS_LABEL[status];
}

function csvDepositLabel(booking: ManagerBooking): string {
  if (booking.source === "WALK_IN" && booking.depositAmountKobo === 0) return "Walk-in";
  const amount = formatNaira(booking.depositAmountKobo);
  return booking.depositStatus === "KEPT" ? `${amount} kept` : amount;
}

function csvEscape(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** The downloadable day report: one row per booking, oldest first. */
export function buildDayReportCsv(bookings: ManagerBooking[], formatClockTime: (instant: Date) => string): string {
  const header = ["Time", "Customer", "Service", "Stylist", "Status", "Deposit"];
  const rows = bookings.map((b) => [
    formatClockTime(b.startsAt),
    b.customerName,
    b.serviceName,
    b.stylistName,
    csvStatusLabel(b.status),
    csvDepositLabel(b),
  ]);
  return [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");
}
