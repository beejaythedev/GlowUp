import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { formatLagosDateLabel, formatLagosClockTime } from "@/lib/lagosTime";
import { balanceDueKobo, calculateDepositKobo } from "@/server/money";
import { BookingStep3Form } from "./BookingStep3Form";

export const metadata: Metadata = {
  title: "Confirm your booking — GlowUp Salons",
};

// Reads live branch/service/settings data on every request.
export const instant = false;

interface PageProps {
  searchParams: Promise<{
    branchId?: string;
    serviceId?: string;
    stylistId?: string;
    stylistRequested?: string;
    startsAt?: string;
  }>;
}

export default async function BookReviewPage({ searchParams }: PageProps) {
  const { branchId, serviceId, stylistId, stylistRequested, startsAt } = await searchParams;
  if (!branchId || !serviceId || !stylistId || !startsAt) notFound();

  const startsAtDate = new Date(startsAt);
  if (Number.isNaN(startsAtDate.getTime())) notFound();

  const [branch, service, stylist, settings] = await Promise.all([
    db.branch.findUnique({ where: { id: branchId } }),
    db.service.findUnique({ where: { id: serviceId } }),
    db.staff.findUnique({ where: { id: stylistId } }),
    db.settings.findFirst(),
  ]);
  if (!branch || !service || !stylist) notFound();
  if (service.nailsOnly && !branch.offersNails) notFound();

  const depositPercent = settings?.depositPercent ?? 20;
  const freeCancellationHours = settings?.freeCancellationHours ?? 24;

  const depositKobo = calculateDepositKobo({
    priceKobo: service.priceKobo,
    depositPercent,
    source: "ONLINE",
  });
  const payAtSalonKobo = balanceDueKobo(service.priceKobo, depositKobo);

  const freeCancellationDeadline = new Date(
    startsAtDate.getTime() - freeCancellationHours * 60 * 60_000,
  );

  return (
    <BookingStep3Form
      branchId={branch.id}
      serviceId={service.id}
      stylistId={stylist.id}
      stylistRequested={stylistRequested === "true"}
      startsAt={startsAtDate.toISOString()}
      branchName={branch.name}
      serviceName={service.name}
      stylistName={stylist.name}
      whenLabel={`${formatLagosDateLabel(startsAtDate)}, ${formatLagosClockTime(startsAtDate)}`}
      priceKobo={service.priceKobo}
      depositKobo={depositKobo}
      payAtSalonKobo={payAtSalonKobo}
      freeCancellationLabel={`${formatLagosDateLabel(freeCancellationDeadline)}, ${formatLagosClockTime(freeCancellationDeadline)}`}
    />
  );
}
