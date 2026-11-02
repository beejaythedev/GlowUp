import { describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "./session";

const STAFF = { id: "staff_1", role: "STYLIST" as const, branchId: "branch_1" };

describe("createSessionToken/verifySessionToken", () => {
  it("round-trips a valid token", () => {
    const token = createSessionToken(STAFF, { rememberMe: false });
    const payload = verifySessionToken(token);
    expect(payload).toMatchObject({ staffId: "staff_1", role: "STYLIST", branchId: "branch_1" });
  });

  it("rejects a tampered token", () => {
    const token = createSessionToken(STAFF, { rememberMe: false });
    const tampered = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A");
    expect(verifySessionToken(tampered)).toBeNull();
  });

  it("rejects malformed input instead of throwing", () => {
    expect(verifySessionToken("not-a-token")).toBeNull();
    expect(verifySessionToken("")).toBeNull();
  });

  it("rejects an expired token", () => {
    const now = new Date("2026-11-01T10:00:00Z");
    const token = createSessionToken(STAFF, { rememberMe: false, now });
    const later = new Date(now.getTime() + 25 * 60 * 60 * 1000); // past the 24h default
    expect(verifySessionToken(token, later)).toBeNull();
  });

  it("a remembered session outlives the default session window", () => {
    const now = new Date("2026-11-01T10:00:00Z");
    const token = createSessionToken(STAFF, { rememberMe: true, now });
    const later = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    expect(verifySessionToken(token, later)).not.toBeNull();
  });
});
