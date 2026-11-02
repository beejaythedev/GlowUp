import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { maskPhone } from "@/lib/bookingReference";
import { formatLagosClockTime, formatLagosDateLabel, lagosDateParts, lagosInstant } from "@/lib/lagosTime";
import { requireStaffSection } from "@/server/auth/requireStaffSection";
import { roleHomePath } from "@/server/auth/roleHome";
import { formatTimeUntil, searchBookings } from "@/server/checkInSearch";
import { buildSelectedBooking, fetchTodaysBookings } from "../receptionData";
import { CheckInSearchView, type SearchResult } from "./CheckInSearchView";

export const metadata: Metadata = {
  title: "Check in a customer — GlowUp Salons",
};

// Reads live bookings on every request — the whole point is "who's not yet checked in".
export const instant = false;

interface PageProps {
  searchParams: Promise<{ q?: string; bookingId?: string }>;
}

export default async function CheckInPage({ searchParams }: PageProps) {
  const { q, bookingId } = await searchParams;
  const query = q ?? "";

  const staff = await requireStaffSection("reception");
  if (!staff.branchId) redirect(roleHomePath(staff.role));

  const branch = await db.branch.findUnique({ where: { id: staff.branchId } });
  if (!branch) notFound();

  const now = new Date();
  const today = lagosDateParts(now);
  const dayStart = lagosInstant(today.year, today.month, today.day, 0, 0);
  const dayEnd = lagosInstant(today.year, today.month, today.day, 24, 0);

  const stylists = await db.staff.findMany({
    where: { branchId: branch.id, role: "STYLIST", status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });

  const todaysBookings = stylists.length
    ? await fetchTodaysBookings(stylists.map((s) => s.id), dayStart, dayEnd)
    : [];

  // Only bookings nobody has checked in yet — once checked in, there's
  // nothing left to find here.
  const notCheckedIn = todaysBookings.filter((b) => b.status === "BOOKED");

  const searchable = notCheckedIn.map((b) => ({
    id: b.id,
    customerName: b.customer.name,
    customerPhone: b.bookerPhone,
    serviceName: b.service.name,
  }));
  const matches = searchBookings(searchable, query);
  const matchedBookings = matches
    .map((m) => notCheckedIn.find((b) => b.id === m.id)!)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  const results: SearchResult[] = matchedBookings.map((b) => {
    const stylistName = stylists.find((s) => s.id === b.stylistId)?.name ?? "—";
    return {
      bookingId: b.id,
      timeLabel: formatLagosClockTime(b.startsAt),
      relativeLabel: formatTimeUntil(b.startsAt, now),
      customerName: b.customer.name,
      serviceName: b.service.name,
      stylistName,
      maskedPhone: maskPhone(b.bookerPhone),
      depositPaid: b.depositStatus === "PAID",
    };
  });

  const selectedBookingId = bookingId ?? results[0]?.bookingId ?? null;
  const selectedRow = selectedBookingId ? todaysBookings.find((b) => b.id === selectedBookingId) : undefined;
  const selectedBooking = selectedRow ? await buildSelectedBooking(selectedRow, stylists, now) : null;

  return (
    <CheckInSearchView
      staffName={staff.name}
      branchName={branch.name}
      dateLabel={formatLagosDateLabel(now)}
      nowLabel={formatLagosClockTime(now)}
      query={query}
      results={results}
      selectedBookingId={selectedBookingId}
      selectedBooking={selectedBooking}
    />
  );
}
