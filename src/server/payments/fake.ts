import type { InitializeInput, InitializeResult, PaymentProvider, VerifyResult } from "./types";

/**
 * Stands in for Paystack when no API keys are configured (local dev without
 * `.env` secrets, and unit tests). `initializeTransaction` hands back a local
 * page instead of a real Paystack checkout; that page's own form posts
 * straight to the webhook route with a correctly-signed fake payload, so the
 * rest of the pipeline — signature check, transaction verify, confirmDeposit
 * — exercises the exact same code path a real webhook would.
 */
export class FakePaymentProvider implements PaymentProvider {
  // Local-dev-only convenience: remembers each reference's amount between
  // initializeTransaction and verifyTransaction within the same process,
  // since there's no real Paystack to round-trip through.
  private static amountsByReference = new Map<string, number>();

  async initializeTransaction(input: InitializeInput): Promise<InitializeResult> {
    FakePaymentProvider.amountsByReference.set(input.reference, input.amountKobo);
    const url = new URL("/dev/fake-pay", "http://localhost");
    url.searchParams.set("reference", input.reference);
    url.searchParams.set("amountKobo", String(input.amountKobo));
    url.searchParams.set("callbackUrl", input.callbackUrl);
    return { ok: true, authorizationUrl: url.pathname + url.search };
  }

  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
    return signatureHeader === FakePaymentProvider.sign(rawBody);
  }

  async verifyTransaction(reference: string): Promise<VerifyResult> {
    const amountKobo = FakePaymentProvider.amountsByReference.get(reference) ?? 0;
    return { ok: true, status: "success", amountKobo, reference };
  }

  /** The fake "signature" the dev fake-pay page and this provider agree on — not real crypto, just a shared marker. */
  static sign(rawBody: string): string {
    return `fake-signature:${rawBody.length}`;
  }
}
