import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { CustomerShell } from "@/components/layout/CustomerShell";
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
      include: {
        openingHours: true,
        // A branch with no stylists can't actually be booked — asking a
        // customer to pick a time there is a dead end (every date shows
        // "No times left" with no way to tell why). Hide it instead of
        // showing it and failing two steps later.
        staff: { where: { role: "STYLIST", status: "ACTIVE" }, select: { id: true } },
      },
    }),
    db.service.findMany({ orderBy: { createdAt: "asc" } }),
    db.settings.findFirst(),
  ]);

  const depositPercent = settings?.depositPercent ?? 20;
  const bookableBranches = branches.filter((branch) => branch.staff.length > 0);

  if (bookableBranches.length === 0) {
    return (
      <CustomerShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <h1 className="text-xl font-bold">No branches are taking online bookings yet</h1>
          <p className="text-sm text-text-muted">Please check back soon, or call your nearest branch.</p>
          <Link href="/" className="font-bold text-primary">
            Back to home
          </Link>
        </div>
      </CustomerShell>
    );
  }

  const branchOptions = bookableBranches.map((branch) => ({
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
