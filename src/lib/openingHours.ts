export interface OpeningHoursRow {
  weekday: number; // 0 = Sunday … 6 = Saturday
  opensAtMinute: number;
  closesAtMinute: number;
}

function formatHourLabel(minute: number): string {
  const hour24 = Math.floor(minute / 60);
  const minutePart = minute % 60;
  const period = hour24 >= 12 ? "pm" : "am";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return minutePart === 0 ? `${hour12}${period}` : `${hour12}:${String(minutePart).padStart(2, "0")}${period}`;
}

/**
 * "Mon–Sat 9am–7pm" plus a separate "Sun 12pm–6pm" segment when the branch
 * opens Sundays too (only Lekki does — docs/PRD.md, Branches, services and
 * staff). Assumes Mon–Sat share one set of hours, which matches every
 * branch's seed data; a branch with different hours on different weekdays
 * would need a richer formatter than this.
 */
export function formatOpeningHoursLabel(rows: OpeningHoursRow[]): string {
  const monToSat = rows.find((r) => r.weekday === 1);
  const sunday = rows.find((r) => r.weekday === 0);

  const segments: string[] = [];
  if (monToSat) {
    segments.push(
      `Mon–Sat ${formatHourLabel(monToSat.opensAtMinute)}–${formatHourLabel(monToSat.closesAtMinute)}`,
    );
  }
  if (sunday) {
    segments.push(`Sun ${formatHourLabel(sunday.opensAtMinute)}–${formatHourLabel(sunday.closesAtMinute)}`);
  }
  return segments.join(" · ");
}
