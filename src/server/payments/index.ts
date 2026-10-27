import { FakePaymentProvider } from "./fake";
import type { PaymentProvider } from "./types";

export type { ChargeInput, ChargeResult, PaymentProvider } from "./types";

/** The one payment provider app code should call. Swap this line for Paystack in M8. */
export const paymentProvider: PaymentProvider = new FakePaymentProvider();
