"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { confirmDeposit } from "@/server/bookings";
import { paymentProvider } from "@/server/payments";

const payDepositSchema = z.object({
  bookingId: z.string().min(1),
  forceFailure: z.enum(["true", "false"]).transform((v) => v === "true"),
});

export interface PayDepositState {
  error?: string;
}

export async function payDeposit(
  _prevState: PayDepositState,
  formData: FormData,
): Promise<PayDepositState> {
  const parsed = payDepositSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Something went wrong. Please go back and try again." };
  }
  const { bookingId, forceFailure } = parsed.data;

  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.status !== "BOOKED" || booking.depositStatus !== "PENDING") {
    return { error: "This booking is no longer waiting for payment." };
  }
  if (booking.holdExpiresAt && booking.holdExpiresAt < new Date()) {
    return { error: "Your hold expired. Please go back and choose a time again." };
  }

  const charge = await paymentProvider.charge({
    amountKobo: booking.depositAmountKobo,
    reference: booking.id,
    forceFailure,
  });

  if (!charge.ok) {
    return { error: "Payment failed. Your slot is still held — please try again." };
  }

  const result = await confirmDeposit(db, bookingId);
  if (!result.ok) {
    return { error: "Your hold expired while paying. Please go back and choose a time again." };
  }

  redirect(`/book/confirmed?bookingId=${bookingId}`);
}
