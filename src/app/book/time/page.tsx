import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { addLagosDays, lagosDateParts, lagosInstant } from "@/lib/lagosTime";
import type { AvailabilityBooking } from "@/server/availability";
import { BookingStep2Form, type DayOption, type StylistOption } from "./BookingStep2Form";

export const metadata: Metadata = {
  title: "Pick a stylist and time — GlowUp Salons",
};

// Reads live availability on every request — see src/app/book/page.tsx for why.
export const instant = false;

const WINDOW_DAYS = 6;
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface PageProps {
  searchParams: Promise<{ branchId?: string; serviceId?: string }>;
}

export default async function BookTimePage({ searchParams }: PageProps) {
  const { branchId, serviceId } = await searchParams;
  if (!branchId || !serviceId) notFound();

  const [branch, service, settings] = await Promise.all([
    db.branch.findUnique({ where: { id: branchId }, include: { openingHours: true } }),
    db.service.findUnique({ where: { id: serviceId } }),
    db.settings.findFirst(),
  ]);
  if (!branch || !service) notFound();
  if (service.nailsOnly && !branch.offersNails) notFound();

  const stylists = await db.staff.findMany({
    where: { branchId, role: "STYLIST", status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });

  const today = lagosDateParts();
  const days: LagosDay[] = Array.from({ length: WINDOW_DAYS }, (_, i) => {
    const parts = addLagosDays(today, i);
    const hours = branch.openingHours.find((h) => h.weekday === parts.weekday);
    return {
      ...parts,
      opensAt: hours ? lagosInstant(parts.year, parts.month, parts.day, 0, hours.opensAtMinute) : null,
      closesAt: hours ? lagosInstant(parts.year, parts.month, parts.day, 0, hours.closesAtMinute) : null,
    };
  });

  const windowStart = lagosInstant(today.year, today.month, today.day, 0, 0);
  const windowEnd = addLagosDays(today, WINDOW_DAYS);
  const windowEndInstant = lagosInstant(windowEnd.year, windowEnd.month, windowEnd.day, 0, 0);

  const bookings = stylists.length
    ? await db.booking.findMany({
        where: {
          stylistId: { in: stylists.map((s) => s.id) },
          startsAt: { gte: windowStart, lt: windowEndInstant },
        },
        include: { service: true },
      })
    : [];

  const dayOptions: DayOption[] = days.map((day) => ({
    label: WEEKDAY_LABELS[day.weekday],
    dayNumber: day.day,
    dateLabel: formatDateLabel(day),
    opensAt: day.opensAt,
    closesAt: day.closesAt,
    stylists: stylists.map((stylist) => ({
      id: stylist.id,
      name: stylist.name,
      bookings: bookings
        .filter(
          (b) =>
            b.stylistId === stylist.id &&
            day.opensAt &&
            day.closesAt &&
            b.startsAt.getTime() >= lagosInstant(day.year, day.month, day.day, 0, 0).getTime() &&
            b.startsAt.getTime() < lagosInstant(day.year, day.month, day.day, 24, 0).getTime(),
        )
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
    })),
  }));

  const stylistOptions: StylistOption[] = stylists.map((s) => ({ id: s.id, name: s.name }));

  return (
    <BookingStep2Form
      branchId={branch.id}
      serviceId={service.id}
      serviceName={service.name}
      priceKobo={service.priceKobo}
      depositPercent={settings?.depositPercent ?? 20}
      minDurationMinutes={service.minDurationMinutes}
      maxDurationMinutes={service.maxDurationMinutes}
      prepMinutes={service.prepMinutes}
      stylists={stylistOptions}
      days={dayOptions}
    />
  );
}

interface LagosDay {
  year: number;
  month: number;
  day: number;
  weekday: number;
  opensAt: Date | null;
  closesAt: Date | null;
}

function formatDateLabel(day: LagosDay): string {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${WEEKDAY_LABELS[day.weekday]} ${day.day} ${months[day.month - 1]}`;
}
