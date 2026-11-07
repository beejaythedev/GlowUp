import { describe, expect, it } from "vitest";
import {
  getEarlierBookings,
  getFooterNote,
  getHeadline,
  getNowChipLabel,
  getPrepWindow,
  selectCurrentCard,
  type StylistBooking,
} from "./stylistToday";

const NOW = new Date("2026-10-31T10:14:00Z"); // 11:14 am Lagos

function booking(overrides: Partial<StylistBooking> = {}): StylistBooking {
  return {
    id: "b1",
    customerName: "Amaka Chukwu",
    serviceName: "Knotless braids",
    startsAt: new Date("2026-10-31T10:00:00Z"),
    endsAt: new Date("2026-10-31T14:00:00Z"),
    blockedUntil: new Date("2026-10-31T14:15:00Z"),
    status: "BOOKED",
    checkedInAt: null,
    depositStatus: "PAID",
    isFirstVisit: false,
    ...overrides,
  };
}

describe("selectCurrentCard", () => {
  it("picks the booking in service over a checked-in or booked one", () => {
    const bookings = [
      booking({ id: "earlier", status: "DONE", startsAt: new Date("2026-10-31T08:00:00Z") }),
      booking({ id: "active", status: "IN_SERVICE", startsAt: new Date("2026-10-31T09:00:00Z") }),
      booking({ id: "later", status: "BOOKED", startsAt: new Date("2026-10-31T15:00:00Z") }),
    ];
    const card = selectCurrentCard(bookings, NOW);
    expect(card.kind).toBe("inService");
    expect(card.booking?.id).toBe("active");
  });

  it("picks checked-in and waiting when nothing is in service", () => {
    const bookings = [
      booking({ id: "waiting", status: "CHECKED_IN", startsAt: new Date("2026-10-31T09:00:00Z") }),
      booking({ id: "later", status: "BOOKED", startsAt: new Date("2026-10-31T15:00:00Z") }),
    ];
    const card = selectCurrentCard(bookings, NOW);
    expect(card.kind).toBe("waiting");
    expect(card.booking?.id).toBe("waiting");
  });

  it("picks the soonest booked appointment when nothing is active yet", () => {
    const bookings = [
      booking({ id: "later", status: "BOOKED", startsAt: new Date("2026-10-31T15:00:00Z") }),
      booking({ id: "sooner", status: "BOOKED", startsAt: new Date("2026-10-31T11:00:00Z") }),
    ];
    const card = selectCurrentCard(bookings, NOW);
    expect(card.kind).toBe("next");
    expect(card.booking?.id).toBe("sooner");
  });

  it("ignores cancelled bookings", () => {
    const bookings = [booking({ id: "gone", status: "CANCELLED" })];
    expect(selectCurrentCard(bookings, NOW).kind).toBe("none");
  });

  it("is none when every booking is already finished and there are none left", () => {
    const bookings = [
      booking({ id: "done1", status: "DONE" }),
      booking({ id: "noshow1", status: "NO_SHOW" }),
    ];
    expect(selectCurrentCard(bookings, NOW).kind).toBe("none");
  });

  it("is none with an empty list", () => {
    expect(selectCurrentCard([], NOW).kind).toBe("none");
  });
});

describe("getEarlierBookings", () => {
  it("returns done and no-show bookings, oldest first, excluding the current card", () => {
    const bookings = [
      booking({ id: "done-late", status: "DONE", startsAt: new Date("2026-10-31T09:00:00Z") }),
      booking({ id: "done-early", status: "DONE", startsAt: new Date("2026-10-31T08:00:00Z") }),
      booking({ id: "noshow", status: "NO_SHOW", startsAt: new Date("2026-10-31T08:30:00Z") }),
      booking({ id: "active", status: "IN_SERVICE", startsAt: new Date("2026-10-31T10:00:00Z") }),
      booking({ id: "booked", status: "BOOKED", startsAt: new Date("2026-10-31T15:00:00Z") }),
    ];
    const earlier = getEarlierBookings(bookings, "active");
    expect(earlier.map((b) => b.id)).toEqual(["done-early", "noshow", "done-late"]);
  });
});

describe("getPrepWindow", () => {
  it("returns the prep range while the stylist is still blocked after service", () => {
    const b = booking({
      status: "IN_SERVICE",
      endsAt: new Date("2026-10-31T14:00:00Z"),
      blockedUntil: new Date("2026-10-31T14:15:00Z"),
    });
    const window = getPrepWindow(b, new Date("2026-10-31T13:00:00Z"));
    expect(window).toEqual({
      startsAt: new Date("2026-10-31T14:00:00Z"),
      endsAt: new Date("2026-10-31T14:15:00Z"),
    });
  });

  it("is null once the prep window has already passed", () => {
    const b = booking({
      status: "IN_SERVICE",
      endsAt: new Date("2026-10-31T14:00:00Z"),
      blockedUntil: new Date("2026-10-31T14:15:00Z"),
    });
    expect(getPrepWindow(b, new Date("2026-10-31T14:16:00Z"))).toBeNull();
  });

  it("is null when there's no prep time at all", () => {
    const b = booking({
      status: "IN_SERVICE",
      endsAt: new Date("2026-10-31T14:00:00Z"),
      blockedUntil: new Date("2026-10-31T14:00:00Z"),
    });
    expect(getPrepWindow(b, new Date("2026-10-31T13:00:00Z"))).toBeNull();
  });

  it("is null when the booking isn't in service", () => {
    const b = booking({ status: "CHECKED_IN" });
    expect(getPrepWindow(b, NOW)).toBeNull();
  });
});

describe("getHeadline", () => {
  it("names the client when in service", () => {
    const card = { kind: "inService" as const, booking: booking({ customerName: "Amaka Chukwu" }) };
    expect(getHeadline(card, true)).toBe("You're with Amaka");
  });

  it("announces the waiting client", () => {
    const card = { kind: "waiting" as const, booking: booking() };
    expect(getHeadline(card, true)).toBe("Your next client is here");
  });

  it("names the next booked client", () => {
    const card = { kind: "next" as const, booking: booking({ customerName: "Tola Martins" }) };
    expect(getHeadline(card, true)).toBe("Next up: Tola");
  });

  it("says done for today when every booking is finished", () => {
    expect(getHeadline({ kind: "none", booking: null }, true)).toBe("You're done for today");
  });

  it("says nothing booked when there were no bookings at all", () => {
    expect(getHeadline({ kind: "none", booking: null }, false)).toBe("Nothing booked for you today");
  });
});

describe("getNowChipLabel", () => {
  it("shows in service", () => {
    expect(getNowChipLabel(booking({ status: "IN_SERVICE" }), NOW)).toBe("In service");
  });

  it("shows waiting minutes once the appointment time has arrived", () => {
    const b = booking({
      status: "CHECKED_IN",
      startsAt: new Date("2026-10-31T10:00:00Z"),
      checkedInAt: new Date("2026-10-31T10:08:00Z"),
    });
    expect(getNowChipLabel(b, NOW)).toBe("Checked in · waiting 6 min");
  });

  it("shows checked in early before the appointment time", () => {
    const b = booking({
      status: "CHECKED_IN",
      startsAt: new Date("2026-10-31T11:00:00Z"),
      checkedInAt: new Date("2026-10-31T10:08:00Z"),
    });
    expect(getNowChipLabel(b, NOW)).toBe("Checked in early");
  });

  it("shows not checked in yet for a plain booked appointment", () => {
    expect(getNowChipLabel(booking({ status: "BOOKED" }), NOW)).toBe("Not checked in yet");
  });
});

describe("getFooterNote", () => {
  it("is null when another booking is still ahead today", () => {
    const current = booking({ id: "active", status: "IN_SERVICE", startsAt: new Date("2026-10-31T09:00:00Z") });
    const bookings = [current, booking({ id: "later", status: "BOOKED", startsAt: new Date("2026-10-31T15:00:00Z") })];
    expect(getFooterNote({ kind: "inService", booking: current }, bookings)).toBeNull();
  });

  it("names the last client when nothing else is booked after them", () => {
    const current = booking({ id: "active", status: "IN_SERVICE", customerName: "Amaka Chukwu" });
    expect(getFooterNote({ kind: "inService", booking: current }, [current])).toBe(
      "Nothing else booked after Amaka today.",
    );
  });

  it("is null for the none and next card kinds", () => {
    expect(getFooterNote({ kind: "none", booking: null }, [])).toBeNull();
    expect(getFooterNote({ kind: "next", booking: booking() }, [booking()])).toBeNull();
  });
});
