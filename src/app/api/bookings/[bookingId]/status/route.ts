import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Read-only poll target for the "confirming payment" page (M8-1) — it never
 * marks anything paid itself, just reports what the webhook has already
 * done. `bookingId` is an unguessable cuid, same exposure as the pay page
 * it's already linked from.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { status: true, depositStatus: true },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ status: booking.status, depositStatus: booking.depositStatus });
}
