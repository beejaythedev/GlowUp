import { describe, expect, it } from "vitest";
import { computeDelayOffer } from "./delayOffer";
import type { AvailabilityBooking } from "./availability";

const DAY = "2026-10-31"; // Saturday
function time(hour: number, minute: number): Date {
  return new Date(`${DAY}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`);
}

const MON_SAT_HOURS = { opensAt: time(9, 0), closesAt: time(19, 0) };
const EARLY_NOW = time(0, 0);
const washAndSet = { minDurationMinutes: 60, maxDurationMinutes: 60, prepMinutes: 10, nailsOnly: false };

function booking(overrides: Partial<AvailabilityBooking> & { startsAt: Date }): AvailabilityBooking {
  const minDuration = overrides.serviceMinDurationMinutes ?? 60;
  const prep = overrides.servicePrepMinutes ?? 10;
  return {
    blockedUntil: new Date(overrides.startsAt.getTime() + (minDuration + prep) * 60_000),
    serviceMinDurationMinutes: minDuration,
    serviceMaxDurationMinutes: overrides.serviceMaxDurationMinutes ?? minDuration,
    servicePrepMinutes: prep,
    status: "BOOKED",
    depositStatus: "PAID",
    holdExpiresAt: null,
    ...overrides,
  };
}

describe("computeDelayOffer", () => {
  it("offers the requested stylist's next free slot after the original time", () => {
    const originalStartsAt = time(11, 0);
    const offer = computeDelayOffer({
      service: washAndSet,
      branchOffersNails: false,
      openingHours: MON_SAT_HOURS,
      requestedStylistId: "ronke",
      // Ronke is running over on an 11:00 job and has nothing else booked —
      // free again once this job's blockedUntil passes.
      requestedStylistBookings: [booking({ startsAt: originalStartsAt })],
      otherStylists: [],
      originalStartsAt,
      now: EARLY_NOW,
    });
    expect(offer.laterWithSameStylist).toEqual(time(12, 10));
  });

  it("is null for the same stylist when they have nothing free the rest of the day", () => {
    const originalStartsAt = time(11, 0);
    // Booked solid from 11:00 all the way to closing.
    const bookings: AvailabilityBooking[] = [];
    for (let hour = 11; hour < 19; hour++) {
      bookings.push(booking({ startsAt: time(hour, 0) }));
    }
    const offer = computeDelayOffer({
      service: washAndSet,
      branchOffersNails: false,
      openingHours: MON_SAT_HOURS,
      requestedStylistId: "ronke",
      requestedStylistBookings: bookings,
      otherStylists: [],
      originalStartsAt,
      now: EARLY_NOW,
    });
    expect(offer.laterWithSameStylist).toBeNull();
  });

  it("offers another stylist who is genuinely free at the exact original time", () => {
    const originalStartsAt = time(11, 0);
    const offer = computeDelayOffer({
      service: washAndSet,
      branchOffersNails: false,
      openingHours: MON_SAT_HOURS,
      requestedStylistId: "ronke",
      requestedStylistBookings: [booking({ startsAt: originalStartsAt })],
      otherStylists: [
        { id: "zainab", bookings: [] }, // free all day
      ],
      originalStartsAt,
      now: EARLY_NOW,
    });
    expect(offer.otherStylistAtOriginalTime).toEqual({ stylistId: "zainab" });
  });

  it("is null when no other stylist is actually free at that exact time", () => {
    const originalStartsAt = time(11, 0);
    const offer = computeDelayOffer({
      service: washAndSet,
      branchOffersNails: false,
      openingHours: MON_SAT_HOURS,
      requestedStylistId: "ronke",
      requestedStylistBookings: [booking({ startsAt: originalStartsAt })],
      otherStylists: [{ id: "zainab", bookings: [booking({ startsAt: originalStartsAt })] }],
      originalStartsAt,
      now: EARLY_NOW,
    });
    expect(offer.otherStylistAtOriginalTime).toBeNull();
  });

  it("picks the first free other stylist when more than one qualifies", () => {
    const originalStartsAt = time(11, 0);
    const offer = computeDelayOffer({
      service: washAndSet,
      branchOffersNails: false,
      openingHours: MON_SAT_HOURS,
      requestedStylistId: "ronke",
      requestedStylistBookings: [booking({ startsAt: originalStartsAt })],
      otherStylists: [
        { id: "blessing", bookings: [booking({ startsAt: originalStartsAt })] }, // busy then
        { id: "zainab", bookings: [] }, // free
        { id: "ifeoma", bookings: [] }, // also free
      ],
      originalStartsAt,
      now: EARLY_NOW,
    });
    expect(offer.otherStylistAtOriginalTime).toEqual({ stylistId: "zainab" });
  });
});
