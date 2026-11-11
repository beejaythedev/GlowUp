"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { paymentProvider } from "@/server/payments";

const payDepositSchema = z.object({
  bookingId: z.string().min(1),
});

export interface PayDepositState {
  error?: string;
}

/** Paystack needs an email for its receipt; booking only ever collects a phone number (M3). */
function placeholderEmail(phone: string): string {
  return `${phone}@customer.glowupsalons.ng`;
}

export async function payDeposit(
  _prevState: PayDepositState,
  formData: FormData,
): Promise<PayDepositState> {
  const parsed = payDepositSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Something went wrong. Please go back and try again." };
  }
  const { bookingId } = parsed.data;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { customer: true },
  });
  if (!booking || booking.status !== "BOOKED" || booking.depositStatus !== "PENDING") {
    return { error: "This booking is no longer waiting for payment." };
  }
  if (booking.holdExpiresAt && booking.holdExpiresAt < new Date()) {
    return { error: "Your hold expired. Please go back and choose a time again." };
  }

  const origin = (await headers()).get("origin") ?? "";
  const result = await paymentProvider.initializeTransaction({
    amountKobo: booking.depositAmountKobo,
    reference: booking.id,
    email: placeholderEmail(booking.customer.phone),
    callbackUrl: `${origin}/book/pay/confirming?bookingId=${bookingId}`,
  });

  if (!result.ok) {
    return { error: "We couldn't start the payment. Please try again." };
  }

  redirect(result.authorizationUrl);
}
