import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { formatBookingReference, maskPhone } from "@/lib/bookingReference";
import { formatLagosDateLabel, formatLagosClockTime } from "@/lib/lagosTime";
import { formatNaira } from "@/lib/money";
import { balanceDueKobo } from "@/server/money";
import { ConfirmedScreen } from "./ConfirmedScreen";

export const metadata: Metadata = {
  title: "Booking confirmed — GlowUp Salons",
};

// Reads the live booking/settings state on every request.
export const instant = false;

interface PageProps {
  searchParams: Promise<{ bookingId?: string }>;
}

export default async function BookConfirmedPage({ searchParams }: PageProps) {
  const { bookingId } = await searchParams;
  if (!bookingId) notFound();

  const [booking, settings] = await Promise.all([
    db.booking.findUnique({
      where: { id: bookingId },
      include: { branch: true, service: true, customer: true },
    }),
    db.settings.findFirst(),
  ]);
  if (!booking) notFound();
  if (booking.depositStatus !== "PAID") {
    redirect(`/book/pay?bookingId=${bookingId}`);
  }

  const arriveEarlyMinutes = settings?.arriveEarlyMinutes ?? 10;
  const arriveByAt = new Date(booking.startsAt.getTime() - arriveEarlyMinutes * 60_000);
  const payAtSalonKobo = balanceDueKobo(booking.service.priceKobo, booking.depositAmountKobo);

  return (
    <ConfirmedScreen
      customerFirstName={booking.customer.name.split(" ")[0] ?? booking.customer.name}
      depositLabel={formatNaira(booking.depositAmountKobo)}
      maskedPhone={maskPhone(booking.customer.phone)}
      serviceName={booking.service.name}
      whenLabel={`${formatLagosDateLabel(booking.startsAt)}, ${formatLagosClockTime(booking.startsAt)}`}
      branchName={booking.branch.name}
      branchAddress={booking.branch.address}
      payAtSalonLabel={formatNaira(payAtSalonKobo)}
      bookingReference={formatBookingReference(booking.id)}
      arriveByLabel={formatLagosClockTime(arriveByAt)}
    />
  );
}
