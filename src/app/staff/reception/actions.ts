"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentStaff } from "@/server/auth/currentStaff";
import {
  checkIn,
  finishService,
  markNoShow,
  moveBooking,
  startService,
  undoCheckIn,
  type BookingActionResult,
  type MoveBookingResult,
} from "@/server/bookings";
import { cancelBookingAndSettleDeposit } from "@/server/bookingCancellation";
import { sendDelayMessage } from "@/server/delayMessageSender";
import { canViewBooking } from "@/server/permissions";

const bookingActionSchema = z.object({
  bookingId: z.string().min(1),
  action: z.enum(["CHECK_IN", "START", "FINISH", "UNDO_CHECK_IN", "NO_SHOW", "CANCEL", "MOVE", "SEND_DELAY_MESSAGE"]),
  newStylistId: z.string().optional(),
  // "Did they arrive earlier?" correction on check-in (docs/ROADMAP.md, M5-3):
  // backdates checkedInAt so a late tap doesn't inflate the customer's wait.
  checkedInMinutesAgo: z.coerce.number().int().min(0).max(60).optional(),
});

export interface BookingActionState {
  error?: string;
}

const GENERIC_ERROR = "That action isn't available anymore — the schedule may have changed.";

export async function performBookingAction(
  _prevState: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const parsed = bookingActionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Something went wrong. Please try again." };
  const { bookingId, action, newStylistId, checkedInMinutesAgo } = parsed.data;

  const staff = await getCurrentStaff();
  if (!staff) return { error: "You're signed out. Please sign in again." };

  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return { error: "Booking not found." };
  if (!canViewBooking(staff, booking)) return { error: "You can't act on this booking." };

  let result: BookingActionResult | MoveBookingResult;
  switch (action) {
    case "CHECK_IN": {
      const now = new Date(Date.now() - (checkedInMinutesAgo ?? 0) * 60_000);
      result = await checkIn(db, bookingId, now);
      break;
    }
    case "START":
      result = await startService(db, bookingId);
      break;
    case "FINISH":
      result = await finishService(db, bookingId);
      break;
    case "UNDO_CHECK_IN":
      result = await undoCheckIn(db, bookingId);
      break;
    case "NO_SHOW":
      result = await markNoShow(db, bookingId);
      break;
    case "CANCEL":
      result = await cancelBookingAndSettleDeposit(db, bookingId);
      break;
    case "MOVE":
      if (!newStylistId) return { error: "Choose a stylist to move this booking to." };
      result = await moveBooking(db, bookingId, newStylistId);
      break;
    case "SEND_DELAY_MESSAGE": {
      const origin = (await headers()).get("origin") ?? "";
      result = await sendDelayMessage(db, bookingId, `${origin}/book/delay?bookingId=${bookingId}`);
      break;
    }
  }

  if (!result.ok) {
    return {
      error: result.reason === "SLOT_TAKEN" ? "That stylist already has a booking then." : GENERIC_ERROR,
    };
  }

  revalidatePath("/staff/reception");
  revalidatePath("/staff/reception/check-in");
  return {};
}
