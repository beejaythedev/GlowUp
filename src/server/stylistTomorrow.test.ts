import { describe, expect, it } from "vitest";
import { formatDurationLabel, getTomorrowHeadline, summarizeTomorrow } from "./stylistTomorrow";
import type { StylistBooking } from "./stylistToday";

function booking(overrides: Partial<StylistBooking> = {}): StylistBooking {
  return {
    id: "b1",
    customerName: "Adaeze",
    serviceName: "Wig installation",
    startsAt: new Date("2026-11-01T11:00:00Z"),
    endsAt: new Date("2026-11-01T13:00:00Z"),
    blockedUntil: new Date("2026-11-01T13:15:00Z"),
    status: "BOOKED",
    checkedInAt: null,
    depositStatus: "PAID",
    isFirstVisit: false,
    ...overrides,
  };
}

const identity = (d: Date) => d.toISOString();

describe("summarizeTomorrow", () => {
  it("is all null/zero with no bookings", () => {
    expect(summarizeTomorrow([], identity)).toEqual({
      clientCount: 0,
      firstStartLabel: null,
      finishLabel: null,
    });
  });

  it("counts clients and finds the earliest start and latest finish", () => {
    const bookings = [
      booking({ id: "a", startsAt: new Date("2026-11-01T11:00:00Z"), endsAt: new Date("2026-11-01T13:00:00Z") }),
      booking({ id: "b", startsAt: new Date("2026-11-01T13:00:00Z"), endsAt: new Date("2026-11-01T14:00:00Z") }),
      booking({ id: "c", startsAt: new Date("2026-11-01T15:00:00Z"), endsAt: new Date("2026-11-01T17:00:00Z") }),
    ];
    const summary = summarizeTomorrow(bookings, identity);
    expect(summary.clientCount).toBe(3);
    expect(summary.firstStartLabel).toBe(bookings[0].startsAt.toISOString());
    expect(summary.finishLabel).toBe(bookings[2].endsAt.toISOString());
  });

  it("excludes cancelled bookings from the count and the range", () => {
    const bookings = [
      booking({ id: "cancelled", status: "CANCELLED", startsAt: new Date("2026-11-01T08:00:00Z"), endsAt: new Date("2026-11-01T09:00:00Z") }),
      booking({ id: "kept", startsAt: new Date("2026-11-01T11:00:00Z"), endsAt: new Date("2026-11-01T13:00:00Z") }),
    ];
    const summary = summarizeTomorrow(bookings, identity);
    expect(summary.clientCount).toBe(1);
    expect(summary.firstStartLabel).toBe(bookings[1].startsAt.toISOString());
  });
});

describe("getTomorrowHeadline", () => {
  it("says nothing booked for zero clients", () => {
    expect(getTomorrowHeadline(0)).toBe("Nothing booked for you tomorrow");
  });

  it("uses singular client for one", () => {
    expect(getTomorrowHeadline(1)).toBe("You have 1 client tomorrow");
  });

  it("uses plural clients for more than one", () => {
    expect(getTomorrowHeadline(4)).toBe("You have 4 clients tomorrow");
  });
});

describe("formatDurationLabel", () => {
  it("formats whole hours", () => {
    expect(formatDurationLabel(new Date("2026-11-01T11:00:00Z"), new Date("2026-11-01T13:00:00Z"))).toBe("2 hrs");
  });

  it("uses singular hr for exactly one hour", () => {
    expect(formatDurationLabel(new Date("2026-11-01T11:00:00Z"), new Date("2026-11-01T12:00:00Z"))).toBe("1 hr");
  });

  it("formats a fractional hour", () => {
    expect(formatDurationLabel(new Date("2026-11-01T15:00:00Z"), new Date("2026-11-01T16:30:00Z"))).toBe("1.5 hrs");
  });

  it("formats under an hour in minutes", () => {
    expect(formatDurationLabel(new Date("2026-11-01T11:00:00Z"), new Date("2026-11-01T11:45:00Z"))).toBe("45 min");
  });
});
