import type { StylistBooking } from "@/server/stylistToday";

export interface TomorrowSummary {
  clientCount: number;
  firstStartLabel: string | null;
  finishLabel: string | null;
}

/** The three summary tiles on the Tomorrow view: client count, first start, last finish. */
export function summarizeTomorrow(
  bookings: StylistBooking[],
  formatClockTime: (instant: Date) => string,
): TomorrowSummary {
  const active = bookings.filter((b) => b.status !== "CANCELLED");
  if (active.length === 0) return { clientCount: 0, firstStartLabel: null, finishLabel: null };

  const firstStart = active.reduce((soonest, b) => (b.startsAt < soonest ? b.startsAt : soonest), active[0].startsAt);
  const finish = active.reduce((latest, b) => (b.endsAt > latest ? b.endsAt : latest), active[0].endsAt);

  return {
    clientCount: active.length,
    firstStartLabel: formatClockTime(firstStart),
    finishLabel: formatClockTime(finish),
  };
}

export function getTomorrowHeadline(clientCount: number): string {
  if (clientCount === 0) return "Nothing booked for you tomorrow";
  return `You have ${clientCount} client${clientCount === 1 ? "" : "s"} tomorrow`;
}

/** "2 hrs", "1 hr", "1.5 hrs", "45 min" — the duration label next to each booking row. */
export function formatDurationLabel(startsAt: Date, endsAt: Date): string {
  const minutes = Math.round((endsAt.getTime() - startsAt.getTime()) / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours} hr${hours === 1 ? "" : "s"}` : `${hours} hrs`;
}
