import { describe, expect, it } from "vitest";
import {
  addLagosDays,
  formatLagosClockTime,
  formatLagosDateLabel,
  lagosDateParts,
  lagosInstant,
  lagosWeekdayLabel,
} from "./lagosTime";

describe("lagosDateParts", () => {
  it("shifts a UTC instant to Africa/Lagos wall-clock date parts", () => {
    // 23:30 UTC on 31 Oct is 00:30 WAT on 1 Nov.
    const parts = lagosDateParts(new Date("2026-10-31T23:30:00Z"));

    expect(parts).toEqual({ year: 2026, month: 11, day: 1, weekday: 0 }); // Sunday
  });
});

describe("lagosInstant", () => {
  it("converts a Lagos wall-clock time to its UTC instant", () => {
    expect(lagosInstant(2026, 10, 31, 9, 0)).toEqual(new Date("2026-10-31T08:00:00Z"));
  });
});

describe("addLagosDays", () => {
  it("adds days and rolls over month boundaries correctly", () => {
    const halloween = { year: 2026, month: 10, day: 31, weekday: 6 };

    expect(addLagosDays(halloween, 1)).toEqual({ year: 2026, month: 11, day: 1, weekday: 0 });
  });
});

describe("formatLagosClockTime", () => {
  it("formats a morning and an afternoon time", () => {
    expect(formatLagosClockTime(lagosInstant(2026, 10, 31, 9, 0))).toBe("9:00 am");
    expect(formatLagosClockTime(lagosInstant(2026, 10, 31, 14, 30))).toBe("2:30 pm");
  });

  it("formats noon and midnight correctly", () => {
    expect(formatLagosClockTime(lagosInstant(2026, 10, 31, 12, 0))).toBe("12:00 pm");
    expect(formatLagosClockTime(lagosInstant(2026, 10, 31, 0, 0))).toBe("12:00 am");
  });
});

describe("formatLagosDateLabel", () => {
  it("formats a date as weekday, day and month", () => {
    expect(formatLagosDateLabel(lagosInstant(2026, 10, 31, 9, 0))).toBe("Sat 31 Oct");
  });
});

describe("lagosWeekdayLabel", () => {
  it("returns the three-letter label for a weekday number", () => {
    expect(lagosWeekdayLabel(0)).toBe("Sun");
    expect(lagosWeekdayLabel(6)).toBe("Sat");
  });
});
