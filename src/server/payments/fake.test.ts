import { describe, expect, it } from "vitest";
import { FakePaymentProvider } from "./fake";

describe("FakePaymentProvider", () => {
  it("succeeds by default", async () => {
    const result = await new FakePaymentProvider().charge({
      amountKobo: 160000,
      reference: "booking_1",
    });
    expect(result).toEqual({ ok: true, providerRef: "FAKE-booking_1" });
  });

  it("fails when asked to, for testing the retry path", async () => {
    const result = await new FakePaymentProvider().charge({
      amountKobo: 160000,
      reference: "booking_1",
      forceFailure: true,
    });
    expect(result.ok).toBe(false);
  });
});
