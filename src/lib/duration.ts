function formatHours(minutes: number): string {
  if (minutes % 60 === 0) return `${minutes / 60}`;
  return `${(minutes / 60).toFixed(1)}`;
}

/** "45 min", "1 hr", "1.5 hrs", or "4–5 hrs" for a ranged service. */
export function formatDurationLabel(
  minDurationMinutes: number,
  maxDurationMinutes: number,
): string {
  if (minDurationMinutes < 60 && minDurationMinutes === maxDurationMinutes) {
    return `${minDurationMinutes} min`;
  }
  if (minDurationMinutes === maxDurationMinutes) {
    const hours = formatHours(minDurationMinutes);
    return `${hours} ${hours === "1" ? "hr" : "hrs"}`;
  }
  return `${formatHours(minDurationMinutes)}–${formatHours(maxDurationMinutes)} hrs`;
}
