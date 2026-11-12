import type { PrismaClient } from "@/generated/prisma/client";
import { formatBookingReference } from "@/lib/bookingReference";
import { formatDelayMessage } from "@/lib/delayMessage";
import { formatLagosClockTime, formatLagosDateLabel } from "@/lib/lagosTime";
import type { BookingActionResult } from "@/server/bookings";
import { getDelayContext } from "@/server/delayOfferForBooking";
import { messageSender } from "@/server/messages";

/** Reception's "Send delay message" (M8-5) — offers whichever of the two options (M8-5) are genuinely available. */
export async function sendDelayMessage(
  db: Pick<PrismaClient, "booking" | "staff">,
  bookingId: string,
  choiceUrl: string,
  now: Date = new Date(),
): Promise<BookingActionResult> {
  const context = await getDelayContext(db, bookingId, now);
  if (!context) return { ok: false, reason: "NOT_ALLOWED" };
  const { booking, offer } = context;

  const whenLabel = (instant: Date) => `${formatLagosDateLabel(instant)}, ${formatLagosClockTime(instant)}`;

  const message = formatDelayMessage({
    customerFirstName: booking.customer.name.split(" ")[0] ?? booking.customer.name,
    stylistName: booking.stylist.name,
    serviceName: booking.service.name,
    branchName: booking.branch.name,
    originalWhenLabel: whenLabel(booking.startsAt),
    laterWhenLabel: offer.laterWithSameStylist ? whenLabel(offer.laterWithSameStylist) : null,
    otherStylistAvailable: offer.otherStylistAtOriginalTime !== null,
    bookingReference: formatBookingReference(booking.id),
    choiceUrl,
  });

  await messageSender.send({ to: booking.customer.phone, body: message });
  return { ok: true };
}
