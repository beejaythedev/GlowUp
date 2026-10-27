import { describe, expect, it } from "vitest";
import {
  getAvailableSlots,
  pickAnyAvailableStylist,
  type AvailabilityBooking,
} from "./availability";

// A fixed Saturday, used as "today" for every test unless noted otherwise.
const DAY = "2026-10-31"; // Saturday
function time(hour: number, minute: number): Date {
  return new Date(`${DAY}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`);
}

const MON_SAT_HOURS = { opensAt: time(9, 0), closesAt: time(19, 0) };
const EARLY_NOW = time(0, 0); // before opening — nothing is "in the past" yet

const washAndSet = { minDurationMinutes: 60, maxDurationMinutes: 60, prepMinutes: 10, nailsOnly: false };
const manicure = { minDurationMinutes: 45, maxDurationMinutes: 45, prepMinutes: 5, nailsOnly: true };
const braids = { minDurationMinutes: 240, maxDurationMinutes: 300, prepMinutes: 15, nailsOnly: false };

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

describe("getAvailableSlots", () => {
  it("offers every 10-minute slot across a full empty day", () => {
    const slots = getAvailableSlots({
      openingHours: MON_SAT_HOURS,
      service: washAndSet,
      branchOffersNails: false,
      selection: "any",
      stylists: [{ id: "s1", bookings: [] }],
      now: EARLY_NOW,
    });

    expect(slots[0]).toEqual(time(9, 0));
    expect(slots[1]).toEqual(time(9, 10));
    // Last offerable start: close (19:00) minus the 60-minute duration.
    expect(slots[slots.length - 1]).toEqual(time(18, 0));
  });

  it("skips times blocked by an existing booking on a partly booked day", () => {
    const slots = getAvailableSlots({
      openingHours: MON_SAT_HOURS,
      service: washAndSet,
      branchOffersNails: false,
      selection: "any",
      stylists: [
        {
          id: "s1",
          bookings: [booking({ startsAt: time(12, 0), serviceMinDurationMinutes: 60, servicePrepMinutes: 10 })],
        },
      ],
      now: EARLY_NOW,
    });

    // Blocked from 12:00 to 13:10 (60 min + 10 min prep).
    expect(slots).toContainEqual(time(9, 0));
    // 10:50 is the last pre-booking start that still fits its 70-minute
    // block (60 min + 10 min prep) before the booking starts at 12:00.
    expect(slots).toContainEqual(time(10, 50));
    expect(slots).not.toContainEqual(time(11, 0));
    expect(slots).not.toContainEqual(time(12, 0));
    expect(slots).not.toContainEqual(time(13, 0));
    expect(slots).toContainEqual(time(13, 10));
  });

  it("sets the last start of the day from the longest duration of a ranged service (braids: 2pm on a 7pm close)", () => {
    const slots = getAvailableSlots({
      openingHours: MON_SAT_HOURS,
      service: braids,
      branchOffersNails: false,
      selection: "any",
      stylists: [{ id: "s1", bookings: [] }],
      now: EARLY_NOW,
    });

    expect(slots).toContainEqual(time(14, 0));
    expect(slots).not.toContainEqual(time(14, 10));
  });

  it("returns no slots for a nails-only service at a branch that doesn't offer nails", () => {
    const slots = getAvailableSlots({
      openingHours: MON_SAT_HOURS,
      service: manicure,
      branchOffersNails: false,
      selection: "any",
      stylists: [{ id: "s1", bookings: [] }],
      now: EARLY_NOW,
    });

    expect(slots).toEqual([]);
  });

  it("offers slots for a nails-only service at a branch that offers nails (Lekki, Ikeja)", () => {
    const slots = getAvailableSlots({
      openingHours: MON_SAT_HOURS,
      service: manicure,
      branchOffersNails: true,
      selection: "any",
      stylists: [{ id: "s1", bookings: [] }],
      now: EARLY_NOW,
    });

    expect(slots[0]).toEqual(time(9, 0));
  });

  it("returns no slots when the branch is closed that day", () => {
    const slots = getAvailableSlots({
      openingHours: null,
      service: washAndSet,
      branchOffersNails: false,
      selection: "any",
      stylists: [{ id: "s1", bookings: [] }],
      now: EARLY_NOW,
    });

    expect(slots).toEqual([]);
  });

  it("respects Lekki's shorter Sunday hours", () => {
    const sundayHours = { opensAt: time(12, 0), closesAt: time(18, 0) };
    const slots = getAvailableSlots({
      openingHours: sundayHours,
      service: washAndSet,
      branchOffersNails: false,
      selection: "any",
      stylists: [{ id: "s1", bookings: [] }],
      now: EARLY_NOW,
    });

    expect(slots[0]).toEqual(time(12, 0));
    expect(slots.every((s) => s.getTime() >= time(12, 0).getTime())).toBe(true);
    expect(slots[slots.length - 1]).toEqual(time(17, 0));
  });

  it("the Ronke example: any-stylist offers 3:15 right after her braids booking, a Ronke-requested search waits until 4:15", () => {
    const ronkesBraidsBooking = booking({
      startsAt: time(11, 0),
      serviceMinDurationMinutes: 240,
      serviceMaxDurationMinutes: 300,
      servicePrepMinutes: 15,
    });
    const stylists = [{ id: "ronke", bookings: [ronkesBraidsBooking] }];

    const anySlots = getAvailableSlots({
      openingHours: MON_SAT_HOURS,
      service: washAndSet,
      branchOffersNails: false,
      selection: "any",
      stylists,
      now: EARLY_NOW,
    });
    expect(anySlots).toContainEqual(time(15, 15));
    expect(anySlots).not.toContainEqual(time(15, 5));

    const requestedSlots = getAvailableSlots({
      openingHours: MON_SAT_HOURS,
      service: washAndSet,
      branchOffersNails: false,
      selection: { stylistId: "ronke" },
      stylists,
      now: EARLY_NOW,
    });
    expect(requestedSlots).not.toContainEqual(time(15, 15));
    expect(requestedSlots).toContainEqual(time(16, 15));
  });

  it("ignores an expired, unpaid hold — the slot is free again", () => {
    const expiredHold = booking({
      startsAt: time(10, 0),
      status: "BOOKED",
      depositStatus: "PENDING",
      holdExpiresAt: time(10, 5),
    });
    const slots = getAvailableSlots({
      openingHours: MON_SAT_HOURS,
      service: washAndSet,
      branchOffersNails: false,
      selection: "any",
      stylists: [{ id: "s1", bookings: [expiredHold] }],
      now: time(10, 30),
    });

    expect(slots).toContainEqual(time(10, 30));
  });

  it("still blocks on an active (unexpired) hold", () => {
    const activeHold = booking({
      startsAt: time(10, 0),
      status: "BOOKED",
      depositStatus: "PENDING",
      holdExpiresAt: time(10, 30),
    });
    const slots = getAvailableSlots({
      openingHours: MON_SAT_HOURS,
      service: washAndSet,
      branchOffersNails: false,
      selection: "any",
      stylists: [{ id: "s1", bookings: [activeHold] }],
      now: time(10, 5),
    });

    expect(slots).not.toContainEqual(time(10, 0));
  });

  it("ignores a cancelled booking entirely", () => {
    const cancelled = booking({ startsAt: time(10, 0), status: "CANCELLED" });
    const slots = getAvailableSlots({
      openingHours: MON_SAT_HOURS,
      service: washAndSet,
      branchOffersNails: false,
      selection: "any",
      stylists: [{ id: "s1", bookings: [cancelled] }],
      now: EARLY_NOW,
    });

    expect(slots).toContainEqual(time(10, 0));
  });
});

describe("pickAnyAvailableStylist", () => {
  it("picks the stylist who becomes free soonest", () => {
    const busyUntilNoon = { id: "busy", bookings: [booking({ startsAt: time(9, 0), serviceMinDurationMinutes: 180 })] };
    const freeAllDay = { id: "free", bookings: [] };

    const picked = pickAnyAvailableStylist([busyUntilNoon, freeAllDay], washAndSet, MON_SAT_HOURS, EARLY_NOW);

    expect(picked?.stylistId).toBe("free");
    expect(picked?.startsAt).toEqual(time(9, 0));
  });

  it("breaks a tie by fewer bookings that day", () => {
    const busierStylist = {
      id: "busier",
      bookings: [
        booking({ startsAt: time(13, 0) }),
        booking({ startsAt: time(15, 0) }),
      ],
    };
    const quieterStylist = { id: "quieter", bookings: [booking({ startsAt: time(13, 0) })] };

    // Both are free from 9:00 (nothing is booked before 13:00 for either).
    const picked = pickAnyAvailableStylist(
      [busierStylist, quieterStylist],
      washAndSet,
      MON_SAT_HOURS,
      EARLY_NOW,
    );

    expect(picked?.stylistId).toBe("quieter");
    expect(picked?.startsAt).toEqual(time(9, 0));
  });

  it("ignores cancelled bookings when counting bookings for the tie-break", () => {
    const stylistA = {
      id: "a",
      bookings: [
        booking({ startsAt: time(13, 0) }),
        booking({ startsAt: time(15, 0), status: "CANCELLED" }),
      ],
    };
    const stylistB = { id: "b", bookings: [booking({ startsAt: time(13, 0) })] };

    // Both have one *active* booking, so it's a true tie — either may win,
    // but it must not be decided by stylistA's cancelled booking.
    const picked = pickAnyAvailableStylist([stylistA, stylistB], washAndSet, MON_SAT_HOURS, EARLY_NOW);

    expect(picked?.startsAt).toEqual(time(9, 0));
    expect(["a", "b"]).toContain(picked?.stylistId);
  });

  it("returns null when no stylist has any time free that day", () => {
    const fullyBooked = { id: "full", bookings: [booking({ startsAt: time(9, 0), serviceMinDurationMinutes: 600 })] };

    const picked = pickAnyAvailableStylist([fullyBooked], washAndSet, MON_SAT_HOURS, EARLY_NOW);

    expect(picked).toBeNull();
  });

  it("returns null when the branch is closed that day", () => {
    const picked = pickAnyAvailableStylist(
      [{ id: "s1", bookings: [] }],
      washAndSet,
      null,
      EARLY_NOW,
    );

    expect(picked).toBeNull();
  });
});
