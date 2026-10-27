/**
 * Behind this interface: the fake provider for now, Paystack in test mode from
 * M8 (docs/ARCHITECTURE.md). Swapping providers should only mean changing
 * what `paymentProvider` (src/server/payments/index.ts) points to.
 */
export interface PaymentProvider {
  charge(input: ChargeInput): Promise<ChargeResult>;
}

export interface ChargeInput {
  amountKobo: number;
  /** What the charge is for — the booking id. Lets a provider match its webhook back to us. */
  reference: string;
  /** Dev/test only: ask the fake provider to fail this charge instead of succeeding. Ignored by a real provider. */
  forceFailure?: boolean;
}

export type ChargeResult =
  | { ok: true; providerRef: string }
  | { ok: false; reason: string };
