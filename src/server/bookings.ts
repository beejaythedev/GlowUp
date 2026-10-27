import type { BookingSource } from "@/generated/prisma/enums";
import type { PrismaClient } from "@/generated/prisma/client";

const HOLD_MINUTES = 10;

export interface HoldSlotParams {
  branchId: string;
  serviceId: string;
  stylistId: string;
  stylistRequested: boolean;
  customerId: string;
  bookerPhone: string;
  startsAt: Date;
  endsAt: Date;
  blockedUntil: Date;
  depositAmountKobo: number;
  source: BookingSource;
  now?: Date;
}

export type HoldSlotResult =
  | { ok: true; bookingId: string; holdExpiresAt: Date }
  | { ok: false; reason: "SLOT_TAKEN" };

/**
 * A Prisma client or interactive-transaction client — whatever `db.$transaction`
 * hands back has the same model delegates as the client it was called on.
 */
type Db = Pick<PrismaClient, "$transaction" | "booking">;

/**
 * Holds a slot for 10 minutes while the customer pays (docs/PRD.md, Business
 * rules). Safe under concurrent requests for the same slot: the database's
 * no-double-booking exclusion constraint (M2-3 migration) guarantees only one
 * concurrent insert for an overlapping [startsAt, blockedUntil) range on the
 * same stylist can succeed — this function just clears the loser's path by
 * reporting SLOT_TAKEN instead of throwing.
 *
 * Expired, unpaid holds don't block a new hold: they're deleted first, in
 * the same transaction, so no background job is needed to release them
 * (docs/PRD.md, Business rules — "Slot hold").
 */
export async function holdSlot(db: Db, params: HoldSlotParams): Promise<HoldSlotResult> {
  const now = params.now ?? new Date();
  const holdExpiresAt = new Date(now.getTime() + HOLD_MINUTES * 60_000);

  try {
    const booking = await db.$transaction(async (tx) => {
      await tx.booking.deleteMany({
        where: {
          stylistId: params.stylistId,
          status: "BOOKED",
          depositStatus: "PENDING",
          holdExpiresAt: { lt: now },
        },
      });

      return tx.booking.create({
        data: {
          branchId: params.branchId,
          serviceId: params.serviceId,
          stylistId: params.stylistId,
          stylistRequested: params.stylistRequested,
          customerId: params.customerId,
          bookerPhone: params.bookerPhone,
          startsAt: params.startsAt,
          endsAt: params.endsAt,
          blockedUntil: params.blockedUntil,
          status: "BOOKED",
          source: params.source,
          depositAmountKobo: params.depositAmountKobo,
          depositStatus: "PENDING",
          holdExpiresAt,
        },
      });
    });

    return { ok: true, bookingId: booking.id, holdExpiresAt };
  } catch (error) {
    if (isSlotConflict(error)) {
      return { ok: false, reason: "SLOT_TAKEN" };
    }
    throw error;
  }
}

/**
 * True if `error` is the no-double-booking exclusion constraint (Postgres
 * SQLSTATE 23P01). Prisma's driver-level errors don't surface the raw
 * SQLSTATE as `error.code` (that's Prisma's own, unrelated error code) — the
 * SQLSTATE and constraint name only appear in the message text.
 */
function isSlotConflict(error: unknown): boolean {
  const message = findErrorMessage(error);
  return /23P01|Booking_no_stylist_overlap/.test(message ?? "");
}

function findErrorMessage(error: unknown, depth = 0): string | undefined {
  if (!error || typeof error !== "object" || depth > 5) return undefined;
  const message = (error as { message?: unknown }).message;
  if (typeof message === "string") return message;
  const cause = (error as { cause?: unknown }).cause;
  return cause ? findErrorMessage(cause, depth + 1) : undefined;
}
