import type { PrismaClient } from "@/generated/prisma/client";
import { formatBookingReference } from "@/lib/bookingReference";
import { formatConfirmationMessage } from "@/lib/confirmationMessage";
import { formatLagosClockTime, formatLagosDateLabel } from "@/lib/lagosTime";
import { formatNaira } from "@/lib/money";
import { messageSender } from "@/server/messages";
import { confirmDeposit, type ConfirmDepositResult } from "@/server/bookings";

/**
 * Marks a booking's deposit paid and sends the confirmation message — the
 * one thing that should happen once Paystack has genuinely confirmed a
 * charge (CLAUDE.md rule 10). Called from the webhook route (M8-1); kept
 * here rather than in that route so the same "deposit is confirmed" step
 * can't drift between it and any other caller.
 */
export async function confirmDepositAndNotify(
  db: Pick<PrismaClient, "booking" | "settings">,
  bookingId: string,
): Promise<ConfirmDepositResult> {
  const result = await confirmDeposit(db, bookingId);
  if (!result.ok) return result;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { branch: true, service: true, customer: true },
  });
  if (!booking) return result;

  const settings = await db.settings.findFirst();
  const arriveEarlyMinutes = settings?.arriveEarlyMinutes ?? 10;
  const arriveByAt = new Date(booking.startsAt.getTime() - arriveEarlyMinutes * 60_000);

  await messageSender.send({
    to: booking.customer.phone,
    body: formatConfirmationMessage({
      customerFirstName: booking.customer.name.split(" ")[0] ?? booking.customer.name,
      serviceName: booking.service.name,
      branchName: booking.branch.name,
      whenLabel: `${formatLagosDateLabel(booking.startsAt)}, ${formatLagosClockTime(booking.startsAt)}`,
      arriveByLabel: formatLagosClockTime(arriveByAt),
      depositLabel: formatNaira(booking.depositAmountKobo),
      bookingReference: formatBookingReference(booking.id),
    }),
  });

  return result;
}
