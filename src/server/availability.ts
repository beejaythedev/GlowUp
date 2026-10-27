import type { BookingStatus, DepositStatus } from "@/generated/prisma/enums";

const SLOT_STEP_MINUTES = 10;

export interface AvailabilityBooking {
  startsAt: Date;
  /** startsAt + the booked service's min duration + prep (the standard block width). */
  blockedUntil: Date;
  serviceMinDurationMinutes: number;
  serviceMaxDurationMinutes: number;
  servicePrepMinutes: number;
  status: BookingStatus;
  depositStatus: DepositStatus;
  holdExpiresAt: Date | null;
}

export interface AvailabilityStylist {
  id: string;
  /** This stylist's bookings for the date being queried, any status. */
  bookings: AvailabilityBooking[];
}

export interface GetAvailableSlotsInput {
  /** The branch's open/close instants for the date being queried, or null if closed that day. */
  openingHours: { opensAt: Date; closesAt: Date } | null;
  service: {
    minDurationMinutes: number;
    maxDurationMinutes: number;
    prepMinutes: number;
    nailsOnly: boolean;
  };
  branchOffersNails: boolean;
  /** "any" available stylist, or a specific stylist the customer requested. */
  selection: "any" | { stylistId: string };
  stylists: AvailabilityStylist[];
  now: Date;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

/** Expired, unpaid holds are ignored — the slot they held is free again (M2-3). */
function isBookingBlocking(booking: AvailabilityBooking, now: Date): boolean {
  if (booking.status === "CANCELLED") return false;
  const isExpiredHold =
    booking.status === "BOOKED" &&
    booking.depositStatus === "PENDING" &&
    booking.holdExpiresAt !== null &&
    booking.holdExpiresAt.getTime() <= now.getTime();
  return !isExpiredHold;
}

/**
 * Candidate start times for one stylist within one open-to-close window.
 *
 * `isRequested` is true only when this stylist was specifically chosen — then
 * their own ranged-service bookings block using the LONGEST duration plus
 * prep (docs/PRD.md, Check-in and timing, rule 8: a customer who requests a
 * stylist can't be reassigned if that stylist runs over). An "any available"
 * search always uses the shortest duration plus prep for every stylist's
 * bookings (rule 7), since an "any" booking can be moved to someone else.
 */
function stylistCandidates(
  stylist: AvailabilityStylist,
  service: GetAvailableSlotsInput["service"],
  windowStart: Date,
  windowEnd: Date,
  lastStartOfDay: Date,
  isRequested: boolean,
  now: Date,
): Date[] {
  const blocked = stylist.bookings
    .filter((b) => isBookingBlocking(b, now))
    .map((b) => {
      const isRanged = b.serviceMaxDurationMinutes > b.serviceMinDurationMinutes;
      const end =
        isRequested && isRanged
          ? addMinutes(b.startsAt, b.serviceMaxDurationMinutes + b.servicePrepMinutes)
          : b.blockedUntil;
      return { start: b.startsAt, end };
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const merged: { start: Date; end: Date }[] = [];
  for (const interval of blocked) {
    const last = merged[merged.length - 1];
    if (last && interval.start.getTime() <= last.end.getTime()) {
      if (interval.end.getTime() > last.end.getTime()) last.end = interval.end;
    } else {
      merged.push({ ...interval });
    }
  }

  // Free gaps between windowStart/windowEnd and the blocked intervals. The
  // final gap's end is null (bounded only by lastStartOfDay, not by
  // "blockEnd must fit before closing" — prep may run a little past close).
  const gaps: { start: Date; end: Date | null }[] = [];
  let cursor = windowStart;
  for (const interval of merged) {
    if (interval.start.getTime() > cursor.getTime()) {
      gaps.push({ start: cursor, end: interval.start });
    }
    if (interval.end.getTime() > cursor.getTime()) {
      cursor = interval.end;
    }
  }
  if (cursor.getTime() < windowEnd.getTime()) {
    gaps.push({ start: cursor, end: null });
  }

  const candidates: Date[] = [];
  for (const gap of gaps) {
    let candidate = gap.start;
    while (candidate.getTime() <= lastStartOfDay.getTime()) {
      const blockEnd = addMinutes(candidate, service.minDurationMinutes + service.prepMinutes);
      const fitsGap = gap.end === null || blockEnd.getTime() <= gap.end.getTime();
      if (!fitsGap) break;
      candidates.push(candidate);
      candidate = addMinutes(candidate, SLOT_STEP_MINUTES);
    }
  }
  return candidates;
}

/**
 * Which times a service can be booked for a branch, stylist selection and
 * date. Start times are every 10 minutes. Ranged services (braids 4–5 hrs)
 * block their shortest duration plus prep; the longest duration sets the
 * last start of the day (docs/PRD.md, Check-in and timing, rules 7–8).
 */
export function getAvailableSlots(input: GetAvailableSlotsInput): Date[] {
  if (input.service.nailsOnly && !input.branchOffersNails) return [];
  if (!input.openingHours) return [];

  const { opensAt: windowStart, closesAt: windowEnd } = input.openingHours;
  const lastStartOfDay = addMinutes(windowEnd, -input.service.maxDurationMinutes);
  if (lastStartOfDay.getTime() < windowStart.getTime()) return [];

  const isRequested = input.selection !== "any";
  const stylists = isRequested
    ? input.stylists.filter((s) => s.id === (input.selection as { stylistId: string }).stylistId)
    : input.stylists;

  const candidatesByTime = new Map<number, Date>();
  for (const stylist of stylists) {
    for (const candidate of stylistCandidates(
      stylist,
      input.service,
      windowStart,
      windowEnd,
      lastStartOfDay,
      isRequested,
      input.now,
    )) {
      if (candidate.getTime() >= input.now.getTime()) {
        candidatesByTime.set(candidate.getTime(), candidate);
      }
    }
  }

  return Array.from(candidatesByTime.values()).sort((a, b) => a.getTime() - b.getTime());
}

/** The earliest time this one stylist could start the service, or null if none fits that day. */
function getStylistSoonestFree(
  stylist: AvailabilityStylist,
  service: GetAvailableSlotsInput["service"],
  openingHours: { opensAt: Date; closesAt: Date } | null,
  now: Date,
): Date | null {
  if (!openingHours) return null;
  const { opensAt: windowStart, closesAt: windowEnd } = openingHours;
  const lastStartOfDay = addMinutes(windowEnd, -service.maxDurationMinutes);
  if (lastStartOfDay.getTime() < windowStart.getTime()) return null;

  const candidates = stylistCandidates(
    stylist,
    service,
    windowStart,
    windowEnd,
    lastStartOfDay,
    false,
    now,
  ).filter((c) => c.getTime() >= now.getTime());

  return candidates.length > 0 ? candidates[0] : null;
}

export interface PickedStylist {
  stylistId: string;
  startsAt: Date;
}

/**
 * "Any available stylist": the stylist who becomes free soonest; ties go to
 * whoever has fewer bookings that day (docs/ROADMAP.md, M2-2). Used once a
 * customer has chosen "Any available" (M2-1's `getAvailableSlots` already
 * confirms a time is bookable by *someone* — this resolves it to one
 * specific stylist for the booking record).
 */
export function pickAnyAvailableStylist(
  stylists: AvailabilityStylist[],
  service: GetAvailableSlotsInput["service"],
  openingHours: { opensAt: Date; closesAt: Date } | null,
  now: Date,
): PickedStylist | null {
  const options = stylists
    .map((stylist) => {
      const soonest = getStylistSoonestFree(stylist, service, openingHours, now);
      if (!soonest) return null;
      const bookingsToday = stylist.bookings.filter((b) => isBookingBlocking(b, now)).length;
      return { stylistId: stylist.id, startsAt: soonest, bookingsToday };
    })
    .filter((option): option is NonNullable<typeof option> => option !== null);

  if (options.length === 0) return null;

  options.sort((a, b) => {
    const byTime = a.startsAt.getTime() - b.startsAt.getTime();
    return byTime !== 0 ? byTime : a.bookingsToday - b.bookingsToday;
  });

  return { stylistId: options[0].stylistId, startsAt: options[0].startsAt };
}

export interface StylistSoonestFree {
  stylistId: string;
  /** Null means this stylist has no time left for the service today. */
  soonestFree: Date | null;
}

/**
 * Every stylist's own soonest-free time for a service, soonest first —
 * reception's new-booking screen picks a stylist from this list
 * (`ReceptionNew.dc.html`: "Stylist, soonest free first"). Stylists with no
 * time left today sort last.
 */
export function getSoonestFreePerStylist(
  stylists: AvailabilityStylist[],
  service: GetAvailableSlotsInput["service"],
  openingHours: { opensAt: Date; closesAt: Date } | null,
  now: Date,
): StylistSoonestFree[] {
  return stylists
    .map((stylist) => ({
      stylistId: stylist.id,
      soonestFree: getStylistSoonestFree(stylist, service, openingHours, now),
    }))
    .sort((a, b) => {
      if (a.soonestFree === null && b.soonestFree === null) return 0;
      if (a.soonestFree === null) return 1;
      if (b.soonestFree === null) return -1;
      return a.soonestFree.getTime() - b.soonestFree.getTime();
    });
}
