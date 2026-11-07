import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { addLagosDays, formatLagosDateLabel, lagosDateParts, lagosInstant } from "@/lib/lagosTime";
import { requireStaffSection } from "@/server/auth/requireStaffSection";
import { roleHomePath } from "@/server/auth/roleHome";
import { fetchStylistDayBookings, toStylistBookings } from "../stylistData";
import { StylistTomorrowView } from "./StylistTomorrowView";

export const metadata: Metadata = {
  title: "Tomorrow — GlowUp Salons",
};

// Reads live booking state on every request (matches the Today view, M6-1).
export const instant = false;

export default async function StylistTomorrowPage() {
  const staff = await requireStaffSection("stylist");
  if (staff.role !== "STYLIST") redirect(roleHomePath(staff.role));

  const tomorrow = addLagosDays(lagosDateParts(), 1);
  const dayStart = lagosInstant(tomorrow.year, tomorrow.month, tomorrow.day, 0, 0);
  const dayEnd = lagosInstant(tomorrow.year, tomorrow.month, tomorrow.day, 24, 0);

  const rows = await fetchStylistDayBookings(staff.id, dayStart, dayEnd);
  const bookings = await toStylistBookings(rows);

  return (
    <StylistTomorrowView
      staffName={staff.name}
      dateLabel={formatLagosDateLabel(dayStart)}
      bookings={bookings}
    />
  );
}
