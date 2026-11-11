import { describe, expect, it } from "vitest";
import { FakePaymentProvider } from "./fake";

describe("FakePaymentProvider", () => {
  it("returns a local authorization URL carrying the reference and amount", async () => {
    const result = await new FakePaymentProvider().initializeTransaction({
      amountKobo: 160000,
      reference: "booking_1",
      email: "customer@example.com",
      callbackUrl: "http://localhost:3000/book/pay/confirming?bookingId=booking_1",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.authorizationUrl).toContain("/dev/fake-pay");
      expect(result.authorizationUrl).toContain("reference=booking_1");
      expect(result.authorizationUrl).toContain("amountKobo=160000");
    }
  });

  it("verifies a signature it signed itself", () => {
    const provider = new FakePaymentProvider();
    const body = JSON.stringify({ event: "charge.success" });
    expect(provider.verifyWebhookSignature(body, FakePaymentProvider.sign(body))).toBe(true);
  });

  it("rejects a wrong or missing signature", () => {
    const provider = new FakePaymentProvider();
    const body = JSON.stringify({ event: "charge.success" });
    expect(provider.verifyWebhookSignature(body, "wrong")).toBe(false);
    expect(provider.verifyWebhookSignature(body, null)).toBe(false);
  });

  it("verifies success and remembers the amount from initializeTransaction", async () => {
    const provider = new FakePaymentProvider();
    await provider.initializeTransaction({
      amountKobo: 500000,
      reference: "booking_remember",
      email: "customer@example.com",
      callbackUrl: "http://localhost:3000/book/pay/confirming",
    });
    const result = await provider.verifyTransaction("booking_remember");
    expect(result).toEqual({ ok: true, status: "success", amountKobo: 500000, reference: "booking_remember" });
  });
});
