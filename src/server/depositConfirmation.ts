import type { PrismaClient } from "@/generated/prisma/client";
import { formatBookingReference } from "@/lib/bookingReference";
import { formatConfirmationMessage } from "@/lib/confirmationMessage";
import { formatLagosClockTime, formatLagosDateLabel } from "@/lib/lagosTime";
import { formatNaira } from "@/lib/money";
import { formatReminder24hMessage, formatReminder3hMessage } from "@/lib/reminderMessage";
import { confirmDeposit, type ConfirmDepositResult } from "@/server/bookings";
import { planBookingMessages, type BookingMessageType } from "@/server/bookingMessages";

/**
 * Marks a booking's deposit paid and schedules its messages — the one thing
 * that should happen once Paystack has genuinely confirmed a charge
 * (CLAUDE.md rule 10). Called from the webhook route (M8-1); kept here
 * rather than in that route so the "deposit is confirmed" step can't drift
 * between it and any other caller.
 *
 * Messages are scheduled, not sent here (M8-4) — `/api/jobs/run` sends
 * whatever's due. Each body is composed once, now, from data we already
 * have, so `/dev/messages` shows exactly what will be sent before it is.
 */
export async function confirmDepositAndNotify(
  db: Pick<PrismaClient, "booking" | "settings" | "message">,
  bookingId: string,
  now: Date = new Date(),
): Promise<ConfirmDepositResult> {
  const result = await confirmDeposit(db, bookingId, now);
  if (!result.ok) return result;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { branch: true, service: true, customer: true },
  });
  if (!booking) return result;

  const settings = await db.settings.findFirst();
  const arriveEarlyMinutes = settings?.arriveEarlyMinutes ?? 10;
  const arriveByAt = new Date(booking.startsAt.getTime() - arriveEarlyMinutes * 60_000);

  const shared = {
    customerFirstName: booking.customer.name.split(" ")[0] ?? booking.customer.name,
    serviceName: booking.service.name,
    branchName: booking.branch.name,
    whenLabel: `${formatLagosDateLabel(booking.startsAt)}, ${formatLagosClockTime(booking.startsAt)}`,
    arriveByLabel: formatLagosClockTime(arriveByAt),
    bookingReference: formatBookingReference(booking.id),
  };

  const bodyFor: Record<BookingMessageType, string> = {
    CONFIRMATION: formatConfirmationMessage({ ...shared, depositLabel: formatNaira(booking.depositAmountKobo) }),
    REMINDER_24H: formatReminder24hMessage(shared),
    REMINDER_3H: formatReminder3hMessage(shared),
  };

  const plans = planBookingMessages(booking.startsAt, now);
  await db.message.createMany({
    data: plans.map((plan) => ({
      bookingId: booking.id,
      type: plan.type,
      to: booking.customer.phone,
      body: bodyFor[plan.type],
      scheduledFor: plan.scheduledFor,
    })),
  });

  return result;
}
