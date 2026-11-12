import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { PaystackPaymentProvider } from "./paystack";

const SECRET = "sk_test_example_secret";

function sign(secret: string, body: string): string {
  return createHmac("sha512", secret).update(body).digest("hex");
}

describe("PaystackPaymentProvider.verifyWebhookSignature", () => {
  it("accepts a correctly signed body", () => {
    const provider = new PaystackPaymentProvider(SECRET);
    const body = JSON.stringify({ event: "charge.success", data: { reference: "booking_1" } });
    expect(provider.verifyWebhookSignature(body, sign(SECRET, body))).toBe(true);
  });

  it("rejects a body signed with the wrong secret", () => {
    const provider = new PaystackPaymentProvider(SECRET);
    const body = JSON.stringify({ event: "charge.success" });
    expect(provider.verifyWebhookSignature(body, sign("wrong-secret", body))).toBe(false);
  });

  it("rejects a tampered body even with a signature that was valid for the original body", () => {
    const provider = new PaystackPaymentProvider(SECRET);
    const original = JSON.stringify({ event: "charge.success", data: { amount: 160000 } });
    const tampered = JSON.stringify({ event: "charge.success", data: { amount: 999999999 } });
    expect(provider.verifyWebhookSignature(tampered, sign(SECRET, original))).toBe(false);
  });

  it("rejects a missing signature header", () => {
    const provider = new PaystackPaymentProvider(SECRET);
    expect(provider.verifyWebhookSignature("{}", null)).toBe(false);
  });

  it("rejects a malformed (non-hex or wrong-length) signature without throwing", () => {
    const provider = new PaystackPaymentProvider(SECRET);
    expect(provider.verifyWebhookSignature("{}", "not-valid-hex")).toBe(false);
    expect(provider.verifyWebhookSignature("{}", "ab")).toBe(false);
  });
});
