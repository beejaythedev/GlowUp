// Nigeria is WAT (UTC+1) year-round — no DST, so a fixed offset is exact.
const LAGOS_OFFSET_MINUTES = 60;

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export interface LagosDateParts {
  year: number;
  month: number; // 1–12
  day: number;
  /** 0 = Sunday … 6 = Saturday, matching JS Date#getDay(). */
  weekday: number;
}

/** The Africa/Lagos calendar date and weekday for a given UTC instant (default: now). */
export function lagosDateParts(instant: Date = new Date()): LagosDateParts {
  const shifted = new Date(instant.getTime() + LAGOS_OFFSET_MINUTES * 60_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
  };
}

/** The UTC instant for a given Africa/Lagos wall-clock date and time. */
export function lagosInstant(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  return new Date(Date.UTC(year, month - 1, day, hour - LAGOS_OFFSET_MINUTES / 60, minute));
}

/** `date` plus `days` days, in Africa/Lagos calendar terms. */
export function addLagosDays(date: LagosDateParts, days: number): LagosDateParts {
  const instant = lagosInstant(date.year, date.month, date.day, 0, 0);
  return lagosDateParts(new Date(instant.getTime() + days * 24 * 60 * 60_000));
}

/** "9:00 am", "11:30 pm" — the Africa/Lagos wall-clock time of an instant. */
export function formatLagosClockTime(instant: Date): string {
  const shifted = new Date(instant.getTime() + LAGOS_OFFSET_MINUTES * 60_000);
  const hour24 = shifted.getUTCHours();
  const minute = shifted.getUTCMinutes();
  const period = hour24 >= 12 ? "pm" : "am";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

/** "Sat 31 Oct" — the Africa/Lagos calendar date of an instant. */
export function formatLagosDateLabel(instant: Date): string {
  const parts = lagosDateParts(instant);
  return `${WEEKDAY_LABELS[parts.weekday]} ${parts.day} ${MONTH_LABELS[parts.month - 1]}`;
}

/** The single-letter-weekday label used on the booking date strip, e.g. "Sat". */
export function lagosWeekdayLabel(weekday: number): string {
  return WEEKDAY_LABELS[weekday];
}
