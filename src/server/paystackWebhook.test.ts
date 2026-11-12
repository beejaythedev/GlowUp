import { describe, expect, it } from "vitest";
import { decideWebhookAction } from "./paystackWebhook";

describe("decideWebhookAction", () => {
  it("confirms the booking named in a charge.success event", () => {
    expect(decideWebhookAction({ event: "charge.success", data: { reference: "booking_1" } })).toEqual({
      action: "CONFIRM",
      bookingId: "booking_1",
    });
  });

  it("ignores any other event type", () => {
    expect(decideWebhookAction({ event: "charge.failed", data: { reference: "booking_1" } }).action).toBe("IGNORE");
    expect(decideWebhookAction({ event: "transfer.success", data: {} }).action).toBe("IGNORE");
  });

  it("ignores a charge.success with no reference", () => {
    expect(decideWebhookAction({ event: "charge.success", data: {} }).action).toBe("IGNORE");
    expect(decideWebhookAction({ event: "charge.success" }).action).toBe("IGNORE");
  });

  it("ignores malformed payloads without throwing", () => {
    expect(decideWebhookAction(null).action).toBe("IGNORE");
    expect(decideWebhookAction("a string").action).toBe("IGNORE");
    expect(decideWebhookAction(42).action).toBe("IGNORE");
  });
});
