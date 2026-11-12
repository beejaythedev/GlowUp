import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { formatLagosClockTime, formatLagosDateLabel } from "@/lib/lagosTime";
import { getDelayContext } from "@/server/delayOfferForBooking";
import { DelayChoiceView } from "./DelayChoiceView";

export const metadata: Metadata = {
  title: "Choose a time — GlowUp Salons",
};

// Re-checks live availability on every request (M8-5) — a link sent earlier
// may no longer offer the same choices by the time it's opened.
export const instant = false;

interface PageProps {
  searchParams: Promise<{ bookingId?: string; done?: string }>;
}

export default async function DelayChoicePage({ searchParams }: PageProps) {
  const { bookingId, done } = await searchParams;
  if (!bookingId) notFound();

  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) notFound();

  if (done) {
    return (
      <DelayChoiceView
        bookingId={bookingId}
        state="done"
        whenLabel={`${formatLagosDateLabel(booking.startsAt)}, ${formatLagosClockTime(booking.startsAt)}`}
      />
    );
  }

  const stillChangeable = booking.status === "BOOKED" || booking.status === "CHECKED_IN";
  const context = stillChangeable ? await getDelayContext(db, bookingId, new Date()) : null;

  if (!context) {
    return <DelayChoiceView bookingId={bookingId} state="unavailable" />;
  }

  const whenLabel = (instant: Date) => `${formatLagosDateLabel(instant)}, ${formatLagosClockTime(instant)}`;

  return (
    <DelayChoiceView
      bookingId={bookingId}
      state="choosing"
      serviceName={context.booking.service.name}
      branchName={context.booking.branch.name}
      originalWhenLabel={whenLabel(context.booking.startsAt)}
      stylistName={context.booking.stylist.name}
      laterWhenLabel={context.offer.laterWithSameStylist ? whenLabel(context.offer.laterWithSameStylist) : null}
      otherStylistName={context.otherStylistName}
    />
  );
}
