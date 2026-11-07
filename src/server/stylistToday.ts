import type { BookingStatus, DepositStatus } from "@/generated/prisma/enums";
import { getWaitMinutes } from "@/server/status";

export interface StylistBooking {
  id: string;
  customerName: string;
  serviceName: string;
  startsAt: Date;
  endsAt: Date;
  blockedUntil: Date;
  status: BookingStatus;
  checkedInAt: Date | null;
  depositStatus: DepositStatus;
  isFirstVisit: boolean;
}

export type CurrentCardKind = "inService" | "waiting" | "next" | "none";

export interface CurrentCard {
  kind: CurrentCardKind;
  booking: StylistBooking | null;
}

/**
 * Which single booking the "now" card shows (docs/ROADMAP.md, M6-1): the one
 * being worked on right now, else the one checked in and waiting for the
 * stylist to start, else the soonest still-booked appointment, else none.
 */
export function selectCurrentCard(bookings: StylistBooking[], now: Date): CurrentCard {
  const active = [...bookings]
    .filter((b) => b.status !== "CANCELLED")
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  const inService = active.find((b) => b.status === "IN_SERVICE");
  if (inService) return { kind: "inService", booking: inService };

  const waiting = active.find((b) => b.status === "CHECKED_IN");
  if (waiting) return { kind: "waiting", booking: waiting };

  const next = active.find((b) => b.status === "BOOKED");
  if (next) return { kind: "next", booking: next };

  void now; // reserved for a future "overdue" lens; not needed to pick the card today
  return { kind: "none", booking: null };
}

/** Finished or no-show bookings for the "Earlier today" list, oldest first. */
export function getEarlierBookings(bookings: StylistBooking[], excludeId: string | null): StylistBooking[] {
  return bookings
    .filter((b) => (b.status === "DONE" || b.status === "NO_SHOW") && b.id !== excludeId)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

/**
 * The prep window still blocking the stylist after the current client's
 * service ends (rule 7 — prep is never shown to customers, but is useful to
 * the stylist running their own day). Only surfaced while it's still live.
 */
export function getPrepWindow(booking: StylistBooking, now: Date): { startsAt: Date; endsAt: Date } | null {
  if (booking.status !== "IN_SERVICE") return null;
  if (booking.blockedUntil.getTime() <= booking.endsAt.getTime()) return null;
  if (now >= booking.blockedUntil) return null;
  return { startsAt: booking.endsAt, endsAt: booking.blockedUntil };
}

export function getHeadline(card: CurrentCard, hasAnyBookingToday: boolean): string {
  switch (card.kind) {
    case "inService":
      return `You're with ${firstName(card.booking!.customerName)}`;
    case "waiting":
      return "Your next client is here";
    case "next":
      return `Next up: ${firstName(card.booking!.customerName)}`;
    case "none":
      return hasAnyBookingToday ? "You're done for today" : "Nothing booked for you today";
  }
}

/** The small status chip on the "now" card, e.g. "Checked in · waiting 6 min". */
export function getNowChipLabel(booking: StylistBooking, now: Date): string {
  if (booking.status === "IN_SERVICE") return "In service";
  if (booking.status === "CHECKED_IN") {
    if (!booking.checkedInAt || now < booking.startsAt) return "Checked in early";
    const waitMinutes = getWaitMinutes({
      checkedInAt: booking.checkedInAt,
      appointmentStart: booking.startsAt,
      comparedTo: now,
    });
    return `Checked in · waiting ${waitMinutes} min`;
  }
  return "Not checked in yet";
}

/** "Nothing else booked after X today." — only when the current client really is the last one. */
export function getFooterNote(card: CurrentCard, bookings: StylistBooking[]): string | null {
  if (card.kind === "none" || card.kind === "next") return null;
  const current = card.booking!;
  const hasLater = bookings.some(
    (b) => b.status === "BOOKED" && b.startsAt.getTime() > current.startsAt.getTime(),
  );
  if (hasLater) return null;
  return `Nothing else booked after ${firstName(current.customerName)} today.`;
}

function firstName(name: string): string {
  return name.split(" ")[0];
}
