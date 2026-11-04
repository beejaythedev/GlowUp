export interface SearchableBooking {
  id: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[\s-]/g, "");
}

/** Matches on customer name, phone (spaces/dashes ignored) or service name. Empty query matches everything. */
export function matchesQuery(booking: SearchableBooking, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  return (
    normalize(booking.customerName).includes(q) ||
    normalize(booking.customerPhone).includes(q) ||
    normalize(booking.serviceName).includes(q)
  );
}

export function searchBookings<T extends SearchableBooking>(bookings: T[], query: string): T[] {
  return bookings.filter((booking) => matchesQuery(booking, query));
}

export interface HighlightSegment {
  text: string;
  matched: boolean;
}

/** Splits `text` around the first case-insensitive match of `query`, for `<mark>` rendering. */
export function highlightMatch(text: string, query: string): HighlightSegment[] {
  const trimmed = query.trim();
  if (!trimmed) return [{ text, matched: false }];

  const index = text.toLowerCase().indexOf(trimmed.toLowerCase());
  if (index === -1) return [{ text, matched: false }];

  const segments: HighlightSegment[] = [];
  if (index > 0) segments.push({ text: text.slice(0, index), matched: false });
  segments.push({ text: text.slice(index, index + trimmed.length), matched: true });
  if (index + trimmed.length < text.length) {
    segments.push({ text: text.slice(index + trimmed.length), matched: false });
  }
  return segments;
}

/** "in 10 min", "in 4 hrs", "15 min ago", or "now" — how far `target` is from `now`. */
export function formatTimeUntil(target: Date, now: Date): string {
  const rawMinutes = (target.getTime() - now.getTime()) / 60_000;
  if (Math.abs(rawMinutes) < 0.5) return "now";

  const diffMinutes = Math.round(rawMinutes);
  const future = diffMinutes > 0;
  const absMinutes = Math.abs(diffMinutes);
  const label =
    absMinutes >= 60
      ? `${Math.round(absMinutes / 60)} hr${Math.round(absMinutes / 60) === 1 ? "" : "s"}`
      : `${absMinutes} min`;

  return future ? `in ${label}` : `${label} ago`;
}
