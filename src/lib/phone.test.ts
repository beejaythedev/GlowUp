import { describe, expect, it } from "vitest";
import { isValidNigerianPhone, normalizeNigerianPhone } from "./phone";

describe("normalizeNigerianPhone", () => {
  it("accepts a local number with spaces", () => {
    expect(normalizeNigerianPhone("0803 123 4521")).toBe("08031234521");
  });

  it("accepts a local number with no formatting", () => {
    expect(normalizeNigerianPhone("08031234521")).toBe("08031234521");
  });

  it("accepts a +234 country-code number", () => {
    expect(normalizeNigerianPhone("+234 803 123 4521")).toBe("08031234521");
  });

  it("accepts a 234 country-code number with no plus", () => {
    expect(normalizeNigerianPhone("2348031234521")).toBe("08031234521");
  });

  it("rejects a number that's too short", () => {
    expect(normalizeNigerianPhone("080312345")).toBeNull();
  });

  it("rejects a number that doesn't start with a mobile prefix", () => {
    expect(normalizeNigerianPhone("06031234521")).toBeNull();
  });

  it("rejects non-numeric input", () => {
    expect(normalizeNigerianPhone("not a phone number")).toBeNull();
  });
});

describe("isValidNigerianPhone", () => {
  it("is true for a valid number and false for an invalid one", () => {
    expect(isValidNigerianPhone("0803 123 4521")).toBe(true);
    expect(isValidNigerianPhone("123")).toBe(false);
  });
});
