import { describe, expect, it } from "vitest";
import { formatDurationLabel } from "./duration";

describe("formatDurationLabel", () => {
  it("formats minutes under an hour", () => {
    expect(formatDurationLabel(45, 45)).toBe("45 min");
  });

  it("formats a whole number of hours", () => {
    expect(formatDurationLabel(60, 60)).toBe("1 hr");
    expect(formatDurationLabel(120, 120)).toBe("2 hrs");
  });

  it("formats a fractional number of hours", () => {
    expect(formatDurationLabel(90, 90)).toBe("1.5 hrs");
  });

  it("formats a ranged duration", () => {
    expect(formatDurationLabel(240, 300)).toBe("4–5 hrs");
  });
});
