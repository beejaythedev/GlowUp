import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { confirmDepositAndNotify } from "@/server/depositConfirmation";
import { paymentProvider } from "@/server/payments";
import { decideWebhookAction } from "@/server/paystackWebhook";

/**
 * Paystack calls this after a charge. CLAUDE.md rule 10: never trust the
 * browser's redirect alone — mark a deposit paid only once the webhook's
 * signature checks out AND Paystack's own verify API confirms the same
 * transaction, with the paid amount matching what we expect.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!paymentProvider.verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const parsedBody = JSON.parse(rawBody);
  const decision = decideWebhookAction(parsedBody);
  if (decision.action === "IGNORE") {
    // Still 200 — Paystack retries on non-2xx, and there's nothing to retry here.
    return NextResponse.json({ received: true, action: "ignored", reason: decision.reason });
  }

  const booking = await db.booking.findUnique({ where: { id: decision.bookingId } });
  if (!booking) {
    return NextResponse.json({ received: true, action: "ignored", reason: "Booking not found" });
  }

  const verification = await paymentProvider.verifyTransaction(decision.bookingId);
  if (!verification.ok || verification.status !== "success") {
    return NextResponse.json({ received: true, action: "ignored", reason: "Transaction not verified as successful" });
  }
  if (verification.amountKobo !== booking.depositAmountKobo) {
    return NextResponse.json({ received: true, action: "ignored", reason: "Amount mismatch" });
  }

  await confirmDepositAndNotify(db, decision.bookingId);

  return NextResponse.json({ received: true, action: "confirmed" });
}
