"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { normalizeNigerianPhone } from "@/lib/phone";
import { calculateDepositKobo } from "@/server/money";
import { holdSlot } from "@/server/bookings";

const confirmBookingSchema = z.object({
  name: z.string().trim().min(1, "Enter your name"),
  phone: z
    .string()
    .trim()
    .transform((value, ctx) => {
      const normalized = normalizeNigerianPhone(value);
      if (!normalized) {
        ctx.addIssue({ code: "custom", message: "Enter a valid Nigerian phone number" });
        return z.NEVER;
      }
      return normalized;
    }),
  branchId: z.string().min(1),
  serviceId: z.string().min(1),
  stylistId: z.string().min(1),
  stylistRequested: z.enum(["true", "false"]).transform((v) => v === "true"),
  startsAt: z.iso.datetime(),
});

export interface ConfirmBookingState {
  error?: string;
}

export async function confirmBooking(
  _prevState: ConfirmBookingState,
  formData: FormData,
): Promise<ConfirmBookingState> {
  const parsed = confirmBookingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details and try again." };
  }
  const data = parsed.data;

  // Never trust the screen — re-check the service/branch against the database.
  const [branch, service] = await Promise.all([
    db.branch.findUnique({ where: { id: data.branchId } }),
    db.service.findUnique({ where: { id: data.serviceId } }),
  ]);
  if (!branch || !service || (service.nailsOnly && !branch.offersNails)) {
    return { error: "This service is no longer available. Please start again." };
  }

  const startsAt = new Date(data.startsAt);
  const endsAt = new Date(startsAt.getTime() + service.minDurationMinutes * 60_000);
  const blockedUntil = new Date(endsAt.getTime() + service.prepMinutes * 60_000);

  const customer = await db.customer.upsert({
    where: { phone: data.phone },
    create: { name: data.name, phone: data.phone },
    update: { name: data.name },
  });

  const depositAmountKobo = calculateDepositKobo({
    priceKobo: service.priceKobo,
    depositPercent: (await db.settings.findFirst())?.depositPercent ?? 20,
    source: "ONLINE",
  });

  const result = await holdSlot(db, {
    branchId: data.branchId,
    serviceId: data.serviceId,
    stylistId: data.stylistId,
    stylistRequested: data.stylistRequested,
    customerId: customer.id,
    bookerPhone: data.phone,
    startsAt,
    endsAt,
    blockedUntil,
    depositAmountKobo,
    source: "ONLINE",
  });

  if (!result.ok) {
    return { error: "That time was just taken. Please go back and choose another." };
  }

  redirect(`/book/pay?bookingId=${result.bookingId}`);
}
