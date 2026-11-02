import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { lagosDateParts, lagosInstant } from "@/lib/lagosTime";
import { requireStaffSection } from "@/server/auth/requireStaffSection";
import { roleHomePath } from "@/server/auth/roleHome";
import type { AvailabilityBooking } from "@/server/availability";
import { NewBookingForm, type ServiceOption, type StylistOption } from "./NewBookingForm";

export const metadata: Metadata = {
  title: "New booking — GlowUp Salons",
};

// Reads live stylist availability on every request.
export const instant = false;

export default async function NewBookingPage() {
  const staff = await requireStaffSection("reception");
  if (!staff.branchId) redirect(roleHomePath(staff.role));

  const branch = await db.branch.findUnique({
    where: { id: staff.branchId },
    include: { openingHours: true },
  });
  if (!branch) notFound();

  const [stylists, services, settings] = await Promise.all([
    db.staff.findMany({
      where: { branchId: branch.id, role: "STYLIST", status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    }),
    db.service.findMany({ orderBy: { createdAt: "asc" } }),
    db.settings.findFirst(),
  ]);

  const today = lagosDateParts();
  const hours = branch.openingHours.find((h) => h.weekday === today.weekday);
  const opensAt = hours ? lagosInstant(today.year, today.month, today.day, 0, hours.opensAtMinute) : null;
  const closesAt = hours ? lagosInstant(today.year, today.month, today.day, 0, hours.closesAtMinute) : null;

  const dayStart = lagosInstant(today.year, today.month, today.day, 0, 0);
  const dayEnd = lagosInstant(today.year, today.month, today.day, 24, 0);

  const bookings = stylists.length
    ? await db.booking.findMany({
        where: { stylistId: { in: stylists.map((s) => s.id) }, startsAt: { gte: dayStart, lt: dayEnd } },
        include: { service: true },
      })
    : [];

  const stylistOptions: StylistOption[] = stylists.map((stylist) => ({
    id: stylist.id,
    name: stylist.name,
    bookings: bookings
      .filter((b) => b.stylistId === stylist.id)
      .map((b): AvailabilityBooking => ({
        startsAt: b.startsAt,
        blockedUntil: b.blockedUntil,
        serviceMinDurationMinutes: b.service.minDurationMinutes,
        serviceMaxDurationMinutes: b.service.maxDurationMinutes,
        servicePrepMinutes: b.service.prepMinutes,
        status: b.status,
        depositStatus: b.depositStatus,
        holdExpiresAt: b.holdExpiresAt,
      })),
  }));

  const serviceOptions: ServiceOption[] = services
    .filter((s) => !s.nailsOnly || branch.offersNails)
    .map((s) => ({
      id: s.id,
      name: s.name,
      priceKobo: s.priceKobo,
      minDurationMinutes: s.minDurationMinutes,
      maxDurationMinutes: s.maxDurationMinutes,
      prepMinutes: s.prepMinutes,
      nailsOnly: s.nailsOnly,
    }));

  return (
    <NewBookingForm
      branchId={branch.id}
      branchName={branch.name}
      branchOffersNails={branch.offersNails}
      staffName={staff.name}
      stylists={stylistOptions}
      services={serviceOptions}
      depositPercent={settings?.depositPercent ?? 20}
      openingHours={opensAt && closesAt ? { opensAt: opensAt.toISOString(), closesAt: closesAt.toISOString() } : null}
    />
  );
}
