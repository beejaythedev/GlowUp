import type { PrismaClient } from "@/generated/prisma/client";
import { cancelBooking, type BookingActionResult } from "@/server/bookings";
import { decideCancellationOutcome } from "@/server/cancellation";
import { paymentProvider } from "@/server/payments";

/**
 * Cancels a booking and settles its deposit per the 24-hour free-cancellation
 * rule (docs/PRD.md, Business rules, M8-2): refunds a paid deposit if
 * cancelled far enough ahead, otherwise keeps it — same as a no-show, which
 * never gets this far since it's never cancelled. A deposit that was never
 * actually paid (still `PENDING` — the hold exists, but the customer hadn't
 * finished paying) has nothing to refund or keep, so it's left alone.
 */
export async function cancelBookingAndSettleDeposit(
  db: Pick<PrismaClient, "booking" | "settings">,
  bookingId: string,
  now: Date = new Date(),
): Promise<BookingActionResult> {
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return { ok: false, reason: "NOT_ALLOWED" };

  const cancelResult = await cancelBooking(db, bookingId, now);
  if (!cancelResult.ok) return cancelResult;

  if (booking.depositStatus === "PAID") {
    const settings = await db.settings.findFirst();
    const freeCancellationHours = settings?.freeCancellationHours ?? 24;
    const outcome = decideCancellationOutcome(booking.startsAt, now, freeCancellationHours);

    if (outcome === "KEEP") {
      await db.booking.update({ where: { id: bookingId }, data: { depositStatus: "KEPT" } });
    } else {
      const refund = await paymentProvider.refund({
        reference: booking.id,
        amountKobo: booking.depositAmountKobo,
      });
      // A failed refund call leaves depositStatus as PAID rather than
      // REFUNDED — the booking is still correctly cancelled, but this needs
      // a human to notice and retry; there's no retry queue in this
      // practice project.
      if (refund.ok) {
        await db.booking.update({ where: { id: bookingId }, data: { depositStatus: "REFUNDED" } });
      }
    }
  }

  return cancelResult;
}
