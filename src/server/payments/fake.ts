import type { ChargeInput, ChargeResult, PaymentProvider } from "./types";

/**
 * Stands in for Paystack until M8. Always succeeds unless asked to fail
 * (`forceFailure`), which lets the booking flow's "payment failed, retry"
 * path be exercised without a real provider.
 */
export class FakePaymentProvider implements PaymentProvider {
  async charge(input: ChargeInput): Promise<ChargeResult> {
    if (input.forceFailure) {
      return { ok: false, reason: "Simulated payment failure" };
    }
    return { ok: true, providerRef: `FAKE-${input.reference}` };
  }
}
