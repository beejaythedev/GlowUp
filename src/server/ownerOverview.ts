import type { BookingSource, BookingStatus, DepositStatus } from "@/generated/prisma/enums";
import { getDisplayStatus, getWaitMinutes } from "@/server/status";

/** Only the 15-minute goal used for the reception check-in prompt (M5-5) and here. */
const WAIT_GOAL_MINUTES = 15;

export interface OwnerBooking {
  id: string;
  branchId: string;
  startsAt: Date;
  endsAt: Date;
  status: BookingStatus;
  source: BookingSource;
  depositAmountKobo: number;
  depositStatus: DepositStatus;
  checkedInAt: Date | null;
}

export interface BranchWeekStats {
  branchId: string;
  branchName: string;
  bookingsThisWeek: number;
  waitingNowCount: number;
  longestWaitMinutes: number | null;
  noShowCount: number;
  depositsReceivedKobo: number;
}

/** One branch's row in the "Branches compared" table, from its bookings this week. */
export function summarizeBranchWeek(
  branchId: string,
  branchName: string,
  bookings: OwnerBooking[],
  now: Date,
): BranchWeekStats {
  const active = bookings.filter((b) => b.status !== "CANCELLED");

  const waitingMinutes = active
    .filter((b) => getDisplayStatus(b, now) === "waiting" && b.checkedInAt)
    .map((b) => getWaitMinutes({ checkedInAt: b.checkedInAt!, appointmentStart: b.startsAt, comparedTo: now }));

  const depositsReceivedKobo = active
    .filter((b) => b.depositStatus === "PAID" || b.depositStatus === "KEPT" || b.depositStatus === "REFUNDED")
    .reduce((sum, b) => sum + b.depositAmountKobo, 0);

  return {
    branchId,
    branchName,
    bookingsThisWeek: active.length,
    waitingNowCount: waitingMinutes.length,
    longestWaitMinutes: waitingMinutes.length ? Math.max(...waitingMinutes) : null,
    noShowCount: active.filter((b) => b.status === "NO_SHOW").length,
    depositsReceivedKobo,
  };
}

export type BranchStatus = "onTrack" | "waitOver15";

/** The status chip in the comparison table — amber once the longest live wait passes the 15-minute goal. */
export function getBranchStatus(stats: BranchWeekStats): BranchStatus {
  return stats.longestWaitMinutes !== null && stats.longestWaitMinutes > WAIT_GOAL_MINUTES ? "waitOver15" : "onTrack";
}

export interface CompanySummary {
  bookingsThisWeek: number;
  onlineSharePercent: number;
  noShowRatePercent: number;
  depositsReceivedKobo: number;
}

/** The four company-wide tiles at the top of the overview. */
export function summarizeCompanyWeek(branches: BranchWeekStats[], bookings: OwnerBooking[]): CompanySummary {
  const active = bookings.filter((b) => b.status !== "CANCELLED");
  const bookingsThisWeek = branches.reduce((sum, b) => sum + b.bookingsThisWeek, 0);
  const onlineCount = active.filter((b) => b.source === "ONLINE").length;
  const noShowCount = branches.reduce((sum, b) => sum + b.noShowCount, 0);
  const depositsReceivedKobo = branches.reduce((sum, b) => sum + b.depositsReceivedKobo, 0);

  return {
    bookingsThisWeek,
    onlineSharePercent: bookingsThisWeek ? Math.round((onlineCount / bookingsThisWeek) * 100) : 0,
    noShowRatePercent: bookingsThisWeek ? Math.round((noShowCount / bookingsThisWeek) * 100) : 0,
    depositsReceivedKobo,
  };
}

export interface AttentionItem {
  kind: "waiting" | "unpaidPhoneDeposits";
  message: string;
}

/** One "needs your attention" item per branch whose longest live wait is over the 15-minute goal. */
export function buildWaitingAttentionItems(branches: BranchWeekStats[]): AttentionItem[] {
  return branches
    .filter((b) => b.waitingNowCount > 0 && b.longestWaitMinutes !== null && b.longestWaitMinutes > WAIT_GOAL_MINUTES)
    .map((b) => ({
      kind: "waiting" as const,
      message: `${b.branchName}: ${b.waitingNowCount} customer${b.waitingNowCount === 1 ? "" : "s"} waiting, the longest for ${b.longestWaitMinutes} minutes.`,
    }));
}

/** Phone bookings don't collect a deposit at booking time (M8-3 sends the link later) — flags any still unpaid ahead of their appointment. */
export function buildUnpaidPhoneDepositAttentionItem(unpaidPhoneBookings: OwnerBooking[]): AttentionItem | null {
  if (unpaidPhoneBookings.length === 0) return null;
  const count = unpaidPhoneBookings.length;
  const isSingular = count === 1;
  return {
    kind: "unpaidPhoneDeposits",
    message: `${count} phone booking${isSingular ? "" : "s"} ${isSingular ? "hasn't" : "haven't"} paid their deposit yet.`,
  };
}
