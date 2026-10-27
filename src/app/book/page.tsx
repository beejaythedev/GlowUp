import type { Metadata } from "next";
import { db } from "@/lib/db";
import { calculateDepositKobo } from "@/server/money";
import { formatOpeningHoursLabel } from "@/lib/openingHours";
import { BookingStep1Form } from "./BookingStep1Form";

export const metadata: Metadata = {
  title: "Book an appointment — GlowUp Salons",
};

// Branches and services are read live from the database on every request —
// not something to prerender/cache statically (Next 16 Cache Components).
export const instant = false;

export default async function BookPage() {
  const [branches, services, settings] = await Promise.all([
    db.branch.findMany({
      orderBy: { createdAt: "asc" },
      include: { openingHours: true },
    }),
    db.service.findMany({ orderBy: { createdAt: "asc" } }),
    db.settings.findFirst(),
  ]);

  const depositPercent = settings?.depositPercent ?? 20;

  const branchOptions = branches.map((branch) => ({
    id: branch.id,
    name: branch.name,
    offersNails: branch.offersNails,
    hoursLabel: formatOpeningHoursLabel(branch.openingHours),
  }));

  const serviceOptions = services.map((service) => ({
    id: service.id,
    name: service.name,
    priceKobo: service.priceKobo,
    minDurationMinutes: service.minDurationMinutes,
    maxDurationMinutes: service.maxDurationMinutes,
    nailsOnly: service.nailsOnly,
    depositKobo: calculateDepositKobo({
      priceKobo: service.priceKobo,
      depositPercent,
      source: "ONLINE",
    }),
  }));

  return <BookingStep1Form branches={branchOptions} services={serviceOptions} />;
}
