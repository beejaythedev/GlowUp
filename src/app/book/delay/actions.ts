"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { moveBooking, rescheduleBooking } from "@/server/bookings";
import { getDelayContext } from "@/server/delayOfferForBooking";

export interface DelayChoiceState {
  error?: string;
}

const schema = z.object({ bookingId: z.string().min(1) });

/** Re-checks the offer live rather than trusting the link's embedded times — things may have changed since it was sent. */
export async function chooseLaterWithSameStylist(
  _prevState: DelayChoiceState,
  formData: FormData,
): Promise<DelayChoiceState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Something went wrong. Please try again." };
  const { bookingId } = parsed.data;

  const context = await getDelayContext(db, bookingId, new Date());
  if (!context || !context.offer.laterWithSameStylist) {
    return { error: "That time is no longer available. Please refresh and try again." };
  }

  const newStartsAt = context.offer.laterWithSameStylist;
  const newEndsAt = new Date(newStartsAt.getTime() + context.booking.service.minDurationMinutes * 60_000);
  const newBlockedUntil = new Date(newEndsAt.getTime() + context.booking.service.prepMinutes * 60_000);

  const result = await rescheduleBooking(db, bookingId, {
    startsAt: newStartsAt,
    endsAt: newEndsAt,
    blockedUntil: newBlockedUntil,
  });
  if (!result.ok) return { error: "That time was just taken. Please refresh and try again." };

  redirect(`/book/delay?bookingId=${bookingId}&done=1`);
}

export async function chooseOtherStylist(
  _prevState: DelayChoiceState,
  formData: FormData,
): Promise<DelayChoiceState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Something went wrong. Please try again." };
  const { bookingId } = parsed.data;

  const context = await getDelayContext(db, bookingId, new Date());
  if (!context || !context.offer.otherStylistAtOriginalTime) {
    return { error: "That option is no longer available. Please refresh and try again." };
  }

  const result = await moveBooking(db, bookingId, context.offer.otherStylistAtOriginalTime.stylistId);
  if (!result.ok) return { error: "That stylist was just booked. Please refresh and try again." };

  redirect(`/book/delay?bookingId=${bookingId}&done=1`);
}
