"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { formatBookingReference } from "@/lib/bookingReference";
import { formatLagosClockTime, formatLagosDateLabel } from "@/lib/lagosTime";
import { formatNaira } from "@/lib/money";
import { normalizeNigerianPhone } from "@/lib/phone";
import { formatPhoneDepositMessage } from "@/lib/phoneDepositMessage";
import { getCurrentStaff } from "@/server/auth/currentStaff";
import { createReceptionBooking } from "@/server/bookings";
import { calculateDepositKobo } from "@/server/money";
import { messageSender } from "@/server/messages";

export interface CustomerLookupResult {
  found: boolean;
  name: string | null;
  visitCount: number;
}

/** Looks up a returning customer by phone as reception types it in (`ReceptionNew.dc.html`). */
export async function lookupCustomer(phone: string): Promise<CustomerLookupResult> {
  const normalized = normalizeNigerianPhone(phone);
  if (!normalized) return { found: false, name: null, visitCount: 0 };

  const customer = await db.customer.findUnique({
    where: { phone: normalized },
    include: { _count: { select: { bookings: true } } },
  });
  if (!customer) return { found: false, name: null, visitCount: 0 };

  return { found: true, name: customer.name, visitCount: customer._count.bookings };
}

const createBookingSchema = z.object({
  branchId: z.string().min(1),
  serviceId: z.string().min(1),
  stylistId: z.string().min(1),
  source: z.enum(["WALK_IN", "PHONE"]),
  name: z.string().trim().min(1, "Enter the customer's name."),
  phone: z.string().trim().transform((value, ctx) => {
    const normalized = normalizeNigerianPhone(value);
    if (!normalized) {
      ctx.addIssue({ code: "custom", message: "Enter a valid Nigerian phone number." });
      return z.NEVER;
    }
    return normalized;
  }),
  startsAt: z.iso.datetime(),
});

export interface CreateBookingState {
  error?: string;
}

export async function createBookingAction(
  _prevState: CreateBookingState,
  formData: FormData,
): Promise<CreateBookingState> {
  const parsed = createBookingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the details and try again." };
  }
  const { branchId, serviceId, stylistId, source, name, phone, startsAt } = parsed.data;

  const staff = await getCurrentStaff();
  if (!staff || staff.branchId !== branchId) {
    return { error: "You're signed out, or this isn't your branch. Please sign in again." };
  }

  const [branch, service] = await Promise.all([
    db.branch.findUnique({ where: { id: branchId } }),
    db.service.findUnique({ where: { id: serviceId } }),
  ]);
  if (!branch || !service || (service.nailsOnly && !branch.offersNails)) {
    return { error: "That service is no longer available. Please start again." };
  }

  const startsAtDate = new Date(startsAt);
  const endsAt = new Date(startsAtDate.getTime() + service.minDurationMinutes * 60_000);
  const blockedUntil = new Date(endsAt.getTime() + service.prepMinutes * 60_000);

  const customer = await db.customer.upsert({
    where: { phone },
    create: { name, phone },
    update: { name },
  });

  const settings = await db.settings.findFirst();
  const depositAmountKobo = calculateDepositKobo({
    priceKobo: service.priceKobo,
    depositPercent: settings?.depositPercent ?? 20,
    source,
  });

  const result = await createReceptionBooking(db, {
    branchId,
    serviceId,
    stylistId,
    customerId: customer.id,
    bookerPhone: phone,
    startsAt: startsAtDate,
    endsAt,
    blockedUntil,
    depositAmountKobo,
    source,
  });

  if (!result.ok) {
    return { error: "That stylist was just booked for that time. Please pick another." };
  }

  // Phone bookings aren't paid for yet (unlike a walk-in, whose deposit is
  // always zero) — send the deposit link the same way a confirmation would
  // be sent, so the customer can pay from wherever they are (M8-3).
  if (source === "PHONE" && depositAmountKobo > 0) {
    const origin = (await headers()).get("origin") ?? "";
    await messageSender.send({
      to: phone,
      body: formatPhoneDepositMessage({
        customerFirstName: name.split(" ")[0] ?? name,
        serviceName: service.name,
        branchName: branch.name,
        whenLabel: `${formatLagosDateLabel(startsAtDate)}, ${formatLagosClockTime(startsAtDate)}`,
        depositLabel: formatNaira(depositAmountKobo),
        bookingReference: formatBookingReference(result.bookingId),
        payUrl: `${origin}/book/pay?bookingId=${result.bookingId}`,
      }),
    });
  }

  redirect(`/staff/reception?bookingId=${result.bookingId}`);
}
