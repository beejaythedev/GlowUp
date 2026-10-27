import { describe, expect, it } from "vitest";
import { hashPassword } from "./password";
import { evaluateSignInAttempt } from "./lockout";

const PASSWORD_HASH = hashPassword("password1");

describe("evaluateSignInAttempt", () => {
  it("succeeds with the correct password and no lock", () => {
    const result = evaluateSignInAttempt({
      passwordHash: PASSWORD_HASH,
      failedSignInAttempts: 0,
      lockedUntil: null,
      passwordAttempt: "password1",
    });
    expect(result).toEqual({ outcome: "SUCCESS" });
  });

  it("counts a wrong password as one more failed attempt", () => {
    const result = evaluateSignInAttempt({
      passwordHash: PASSWORD_HASH,
      failedSignInAttempts: 2,
      lockedUntil: null,
      passwordAttempt: "wrong",
    });
    expect(result).toEqual({
      outcome: "WRONG_PASSWORD",
      failedSignInAttempts: 3,
      lockedUntil: null,
    });
  });

  it("locks the account on the 5th consecutive wrong password", () => {
    const now = new Date("2026-11-01T10:00:00Z");
    const result = evaluateSignInAttempt({
      passwordHash: PASSWORD_HASH,
      failedSignInAttempts: 4,
      lockedUntil: null,
      passwordAttempt: "wrong",
      now,
    });
    expect(result).toEqual({
      outcome: "WRONG_PASSWORD",
      failedSignInAttempts: 0,
      lockedUntil: new Date("2026-11-01T10:15:00Z"),
    });
  });

  it("refuses even the correct password while locked", () => {
    const now = new Date("2026-11-01T10:05:00Z");
    const result = evaluateSignInAttempt({
      passwordHash: PASSWORD_HASH,
      failedSignInAttempts: 0,
      lockedUntil: new Date("2026-11-01T10:15:00Z"),
      passwordAttempt: "password1",
      now,
    });
    expect(result).toEqual({ outcome: "LOCKED", retryAt: new Date("2026-11-01T10:15:00Z") });
  });

  it("allows sign-in again once the lock has expired", () => {
    const now = new Date("2026-11-01T10:20:00Z");
    const result = evaluateSignInAttempt({
      passwordHash: PASSWORD_HASH,
      failedSignInAttempts: 0,
      lockedUntil: new Date("2026-11-01T10:15:00Z"),
      passwordAttempt: "password1",
      now,
    });
    expect(result).toEqual({ outcome: "SUCCESS" });
  });
});
