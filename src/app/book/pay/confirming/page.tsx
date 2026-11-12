import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { ConfirmingView } from "./ConfirmingView";

export const metadata: Metadata = {
  title: "Confirming your payment — GlowUp Salons",
};

// Reads the live deposit status on every request.
export const instant = false;

interface PageProps {
  searchParams: Promise<{ bookingId?: string }>;
}

/**
 * Where Paystack's hosted page sends the customer back to. Never trusts
 * that redirect itself (CLAUDE.md rule 10) — it only reflects whatever the
 * webhook has already confirmed in the database, polling until it has.
 */
export default async function PayConfirmingPage({ searchParams }: PageProps) {
  const { bookingId } = await searchParams;
  if (!bookingId) notFound();

  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) notFound();

  if (booking.depositStatus === "PAID") {
    redirect(`/book/confirmed?bookingId=${bookingId}`);
  }

  return <ConfirmingView bookingId={bookingId} />;
}
