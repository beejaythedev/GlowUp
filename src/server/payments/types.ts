/**
 * Behind this interface: Paystack in test mode (M8, docs/ARCHITECTURE.md) —
 * a fake provider stands in when no Paystack keys are configured (local dev
 * without `.env` secrets, and unit tests). Paystack's own flow is
 * redirect-based (docs/ARCHITECTURE.md's "Customer books" flow): we ask for
 * a payment page, the customer pays there, and Paystack's webhook — not the
 * browser redirect back to us — is what actually confirms the charge
 * (CLAUDE.md rule 10).
 */
export interface PaymentProvider {
  /** Starts a transaction and returns the hosted page to send the customer to. */
  initializeTransaction(input: InitializeInput): Promise<InitializeResult>;
  /** Checks the raw webhook body against Paystack's signature header — call before trusting any webhook payload. */
  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean;
  /** Asks Paystack directly whether a transaction succeeded — never trust the webhook payload or the browser alone. */
  verifyTransaction(reference: string): Promise<VerifyResult>;
}

export interface InitializeInput {
  amountKobo: number;
  /** What the charge is for — the booking id. Lets Paystack's webhook match back to us. */
  reference: string;
  email: string;
  callbackUrl: string;
}

export type InitializeResult =
  | { ok: true; authorizationUrl: string }
  | { ok: false; reason: string };

export type VerifyResult =
  | { ok: true; status: "success"; amountKobo: number; reference: string }
  | { ok: true; status: "failed" | "abandoned" | "pending"; reference: string }
  | { ok: false; reason: string };
