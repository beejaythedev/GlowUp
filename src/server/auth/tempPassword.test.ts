import { describe, expect, it } from "vitest";
import { generateTempPassword } from "./tempPassword";

describe("generateTempPassword", () => {
  it("is 8 characters long", () => {
    expect(generateTempPassword()).toHaveLength(8);
  });

  it("never contains visually ambiguous characters", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateTempPassword()).not.toMatch(/[0O1Il]/);
    }
  });

  it("generates different passwords across calls", () => {
    const passwords = new Set(Array.from({ length: 20 }, () => generateTempPassword()));
    expect(passwords.size).toBeGreaterThan(1);
  });
});
