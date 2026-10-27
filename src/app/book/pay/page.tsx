import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { formatLagosDateLabel, formatLagosClockTime } from "@/lib/lagosTime";
import { formatNaira } from "@/lib/money";
import { PayForm } from "./PayForm";

export const metadata: Metadata = {
  title: "Pay your deposit — GlowUp Salons",
};

// Reads the live booking/hold state on every request.
export const instant = false;

interface PageProps {
  searchParams: Promise<{ bookingId?: string }>;
}

export default async function BookPayPage({ searchParams }: PageProps) {
  const { bookingId } = await searchParams;
  if (!bookingId) notFound();

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { branch: true, service: true },
  });
  if (!booking) notFound();

  if (booking.depositStatus === "PAID") {
    redirect(`/book/confirmed?bookingId=${bookingId}`);
  }
  if (booking.status !== "BOOKED" || booking.depositStatus !== "PENDING") {
    notFound();
  }

  const holdExpired = booking.holdExpiresAt !== null && booking.holdExpiresAt < new Date();

  return (
    <PayForm
      bookingId={booking.id}
      serviceName={booking.service.name}
      branchName={booking.branch.name}
      whenLabel={`${formatLagosDateLabel(booking.startsAt)}, ${formatLagosClockTime(booking.startsAt)}`}
      depositLabel={formatNaira(booking.depositAmountKobo)}
      holdExpiresAt={booking.holdExpiresAt?.toISOString() ?? null}
      holdExpired={holdExpired}
    />
  );
}
