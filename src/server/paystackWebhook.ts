export type WebhookDecision =
  | { action: "CONFIRM"; bookingId: string }
  | { action: "IGNORE"; reason: string };

/**
 * Which webhook events we act on, and what booking they're for — pure so
 * it's testable without a real Paystack payload. We only ever act on
 * `charge.success`; everything else (failed charges, transfers, disputes,
 * …) is acknowledged but ignored.
 */
export function decideWebhookAction(parsedBody: unknown): WebhookDecision {
  if (typeof parsedBody !== "object" || parsedBody === null) {
    return { action: "IGNORE", reason: "Payload is not an object" };
  }
  const body = parsedBody as Record<string, unknown>;

  if (body.event !== "charge.success") {
    return { action: "IGNORE", reason: `Unhandled event: ${String(body.event)}` };
  }

  const data = body.data;
  const reference = typeof data === "object" && data !== null ? (data as Record<string, unknown>).reference : undefined;
  if (typeof reference !== "string" || reference.length === 0) {
    return { action: "IGNORE", reason: "Missing or invalid reference" };
  }

  return { action: "CONFIRM", bookingId: reference };
}
