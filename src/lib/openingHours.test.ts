import { describe, expect, it } from "vitest";
import { formatOpeningHoursLabel } from "./openingHours";

describe("formatOpeningHoursLabel", () => {
  it("formats a branch open Mon–Sat and Sunday (Lekki)", () => {
    const label = formatOpeningHoursLabel([
      { weekday: 0, opensAtMinute: 12 * 60, closesAtMinute: 18 * 60 },
      { weekday: 1, opensAtMinute: 9 * 60, closesAtMinute: 19 * 60 },
      { weekday: 6, opensAtMinute: 9 * 60, closesAtMinute: 19 * 60 },
    ]);

    expect(label).toBe("Mon–Sat 9am–7pm · Sun 12pm–6pm");
  });

  it("formats a branch closed Sundays", () => {
    const label = formatOpeningHoursLabel([
      { weekday: 1, opensAtMinute: 9 * 60, closesAtMinute: 19 * 60 },
    ]);

    expect(label).toBe("Mon–Sat 9am–7pm");
  });
});
