import { describe, expect, it } from "vitest";
import { planBookingMessages } from "./bookingMessages";

describe("planBookingMessages", () => {
  it("schedules all three messages for a booking made well ahead", () => {
    const startsAt = new Date("2026-11-20T10:00:00Z");
    const now = new Date("2026-11-10T10:00:00Z"); // 10 days ahead
    const plans = planBookingMessages(startsAt, now);

    expect(plans.map((p) => p.type)).toEqual(["CONFIRMATION", "REMINDER_24H", "REMINDER_3H"]);
    expect(plans[0].scheduledFor).toEqual(now);
    expect(plans[1].scheduledFor).toEqual(new Date("2026-11-19T10:00:00Z"));
    expect(plans[2].scheduledFor).toEqual(new Date("2026-11-20T07:00:00Z"));
  });

  it("skips the 24-hour reminder when booked less than 24 hours out, but keeps the 3-hour one", () => {
    const startsAt = new Date("2026-11-20T10:00:00Z");
    const now = new Date("2026-11-19T20:00:00Z"); // 14 hours ahead
    const plans = planBookingMessages(startsAt, now);

    expect(plans.map((p) => p.type)).toEqual(["CONFIRMATION", "REMINDER_3H"]);
  });

  it("skips both reminders when booked less than 3 hours out", () => {
    const startsAt = new Date("2026-11-20T10:00:00Z");
    const now = new Date("2026-11-20T08:30:00Z"); // 1.5 hours ahead
    const plans = planBookingMessages(startsAt, now);

    expect(plans.map((p) => p.type)).toEqual(["CONFIRMATION"]);
  });

  it("always includes the confirmation, scheduled for right now", () => {
    const now = new Date("2026-11-20T08:30:00Z");
    const plans = planBookingMessages(new Date("2026-11-20T09:00:00Z"), now);
    expect(plans[0]).toEqual({ type: "CONFIRMATION", scheduledFor: now });
  });
});
