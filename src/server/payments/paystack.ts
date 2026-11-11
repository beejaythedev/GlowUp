import { createHmac, timingSafeEqual } from "node:crypto";
import type { InitializeInput, InitializeResult, PaymentProvider, RefundInput, RefundResult, VerifyResult } from "./types";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

export class PaystackPaymentProvider implements PaymentProvider {
  constructor(private readonly secretKey: string) {}

  async initializeTransaction(input: InitializeInput): Promise<InitializeResult> {
    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: input.email,
        // Paystack's `amount` is already in kobo for NGN, same unit we store (CLAUDE.md rule 1).
        amount: input.amountKobo,
        reference: input.reference,
        callback_url: input.callbackUrl,
      }),
    });

    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.status || !body?.data?.authorization_url) {
      return { ok: false, reason: body?.message ?? `Paystack initialize failed (${response.status})` };
    }
    return { ok: true, authorizationUrl: body.data.authorization_url };
  }

  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
    if (!signatureHeader) return false;
    const expected = createHmac("sha512", this.secretKey).update(rawBody).digest("hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    const actualBuffer = Buffer.from(signatureHeader, "hex");
    if (expectedBuffer.length !== actualBuffer.length) return false;
    return timingSafeEqual(expectedBuffer, actualBuffer);
  }

  async verifyTransaction(reference: string): Promise<VerifyResult> {
    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${this.secretKey}` },
    });

    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.status || !body?.data) {
      return { ok: false, reason: body?.message ?? `Paystack verify failed (${response.status})` };
    }

    const data = body.data;
    if (data.status === "success") {
      return { ok: true, status: "success", amountKobo: data.amount, reference: data.reference };
    }
    return { ok: true, status: data.status, reference: data.reference };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    const response = await fetch(`${PAYSTACK_BASE_URL}/refund`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ transaction: input.reference, amount: input.amountKobo }),
    });

    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.status) {
      return { ok: false, reason: body?.message ?? `Paystack refund failed (${response.status})` };
    }
    return { ok: true };
  }
}
