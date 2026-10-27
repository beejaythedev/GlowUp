import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("hashPassword/verifyPassword", () => {
  it("verifies the correct password", () => {
    const hash = hashPassword("correct horse battery staple");
    expect(verifyPassword("correct horse battery staple", hash)).toBe(true);
  });

  it("rejects the wrong password", () => {
    const hash = hashPassword("correct horse battery staple");
    expect(verifyPassword("wrong password", hash)).toBe(false);
  });

  it("uses a different salt each time, so hashes of the same password differ", () => {
    const a = hashPassword("password1");
    const b = hashPassword("password1");
    expect(a).not.toBe(b);
  });

  it("rejects a malformed stored hash instead of throwing", () => {
    expect(verifyPassword("password1", "not-a-valid-hash")).toBe(false);
  });
});
