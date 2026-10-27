import { describe, expect, it } from "vitest";
import { formatNaira } from "./money";

describe("formatNaira", () => {
  it("formats whole naira amounts with no decimals", () => {
    expect(formatNaira(500000)).toBe("₦5,000");
  });

  it("formats amounts with kobo as decimals", () => {
    expect(formatNaira(150050)).toBe("₦1,500.50");
  });

  it("formats zero", () => {
    expect(formatNaira(0)).toBe("₦0");
  });
});
