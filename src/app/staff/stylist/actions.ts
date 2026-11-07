"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentStaff } from "@/server/auth/currentStaff";
import { finishService, startService, type BookingActionResult } from "@/server/bookings";
import { canViewBooking } from "@/server/permissions";

const stylistActionSchema = z.object({
  bookingId: z.string().min(1),
  action: z.enum(["START", "FINISH"]),
});

export interface StylistActionState {
  error?: string;
}

const GENERIC_ERROR = "That action isn't available anymore — the schedule may have changed.";

/** Start/Finish for the stylist's own booking (docs/ROADMAP.md, M6-1/M6-3) — a stylist may only act on their own bookings (CLAUDE.md rule 3). */
export async function performStylistAction(
  _prevState: StylistActionState,
  formData: FormData,
): Promise<StylistActionState> {
  const parsed = stylistActionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Something went wrong. Please try again." };
  const { bookingId, action } = parsed.data;

  const staff = await getCurrentStaff();
  if (!staff) return { error: "You're signed out. Please sign in again." };

  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return { error: "Booking not found." };
  if (!canViewBooking(staff, booking)) return { error: "You can't act on this booking." };

  const result: BookingActionResult = action === "START" ? await startService(db, bookingId) : await finishService(db, bookingId);

  if (!result.ok) return { error: GENERIC_ERROR };

  revalidatePath("/staff/stylist");
  return {};
}
