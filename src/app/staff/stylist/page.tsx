import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { formatLagosClockTime, formatLagosDateLabel, lagosDateParts, lagosInstant } from "@/lib/lagosTime";
import { requireStaffSection } from "@/server/auth/requireStaffSection";
import { roleHomePath } from "@/server/auth/roleHome";
import { selectCurrentCard } from "@/server/stylistToday";
import { fetchStylistDayBookings, toStylistBookings } from "./stylistData";
import { StylistTodayView } from "./StylistTodayView";

export const metadata: Metadata = {
  title: "Today — GlowUp Salons",
};

// Reads live bookings/check-in state on every request (matches reception, M5-1).
export const instant = false;

export default async function StylistTodayPage() {
  const staff = await requireStaffSection("stylist");
  // The owner can open every section (M4-3), but has no personal bookings of
  // their own to run a day against — send them to their own overview instead
  // of a page that will always look empty.
  if (staff.role !== "STYLIST") redirect(roleHomePath(staff.role));

  const now = new Date();
  const today = lagosDateParts(now);
  const dayStart = lagosInstant(today.year, today.month, today.day, 0, 0);
  const dayEnd = lagosInstant(today.year, today.month, today.day, 24, 0);

  const rows = await fetchStylistDayBookings(staff.id, dayStart, dayEnd);
  const bookings = await toStylistBookings(rows);
  const card = selectCurrentCard(bookings, now);

  return (
    <StylistTodayView
      staffName={staff.name}
      dateLabel={formatLagosDateLabel(now)}
      nowLabel={formatLagosClockTime(now)}
      now={now}
      bookings={bookings}
      card={card}
    />
  );
}
