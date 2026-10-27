import { describe, expect, it } from "vitest";
import { formatBookingReference, maskPhone } from "./bookingReference";

describe("formatBookingReference", () => {
  it("uses the last 6 characters of the booking id, uppercased", () => {
    expect(formatBookingReference("clx1a2b3c4d5e6f7g8h9")).toBe("GU-F7G8H9");
  });
});

describe("maskPhone", () => {
  it("hides the middle digits of a local number", () => {
    expect(maskPhone("08039998888")).toBe("0803 ••• 8888");
  });
});
