import { FakePaymentProvider } from "./fake";
import { PaystackPaymentProvider } from "./paystack";
import type { PaymentProvider } from "./types";

export type { InitializeInput, InitializeResult, PaymentProvider, VerifyResult } from "./types";

/**
 * The one payment provider app code should call. Paystack in test mode
 * (M8) when its secret key is configured; the fake provider otherwise, so
 * local dev and CI don't need real keys (CLAUDE.md rule 8 — secrets stay
 * in `.env`, never a required default).
 */
export const paymentProvider: PaymentProvider = process.env.PAYSTACK_SECRET_KEY
  ? new PaystackPaymentProvider(process.env.PAYSTACK_SECRET_KEY)
  : new FakePaymentProvider();
