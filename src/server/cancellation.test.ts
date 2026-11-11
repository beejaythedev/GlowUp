import { describe, expect, it } from "vitest";
import { decideCancellationOutcome } from "./cancellation";

const APPOINTMENT = new Date("2026-11-20T10:00:00Z");

describe("decideCancellationOutcome", () => {
  it("refunds when cancelling well before the free-cancellation window", () => {
    const now = new Date("2026-11-15T10:00:00Z"); // 5 days before
    expect(decideCancellationOutcome(APPOINTMENT, now, 24)).toBe("REFUND");
  });

  it("refunds at exactly the free-cancellation boundary", () => {
    const now = new Date("2026-11-19T10:00:00Z"); // exactly 24 hours before
    expect(decideCancellationOutcome(APPOINTMENT, now, 24)).toBe("REFUND");
  });

  it("keeps the deposit just inside the window", () => {
    const now = new Date("2026-11-19T10:00:01Z"); // one second short of 24 hours
    expect(decideCancellationOutcome(APPOINTMENT, now, 24)).toBe("KEEP");
  });

  it("keeps the deposit for a last-minute cancellation", () => {
    const now = new Date("2026-11-20T09:30:00Z"); // 30 minutes before
    expect(decideCancellationOutcome(APPOINTMENT, now, 24)).toBe("KEEP");
  });

  it("respects a different free-cancellation window from Settings", () => {
    const now = new Date("2026-11-19T15:00:00Z"); // 19 hours before
    expect(decideCancellationOutcome(APPOINTMENT, now, 12)).toBe("REFUND");
    expect(decideCancellationOutcome(APPOINTMENT, now, 24)).toBe("KEEP");
  });
});
