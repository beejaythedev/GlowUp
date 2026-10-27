import type { BookingSource } from "@/generated/prisma/enums";

/** Rounds to the nearest whole naira (100 kobo) — never a fraction of a naira. */
function roundToWholeNaira(kobo: number): number {
  return Math.round(kobo / 100) * 100;
}

/**
 * The deposit due at booking time. Walk-ins pay no deposit (docs/PRD.md,
 * Business rules). Otherwise depositPercent of the price, rounded to the
 * nearest whole naira (CLAUDE.md rule 1: money is always integer kobo).
 */
export function calculateDepositKobo(params: {
  priceKobo: number;
  depositPercent: number;
  source: BookingSource;
}): number {
  if (params.source === "WALK_IN") return 0;
  return roundToWholeNaira((params.priceKobo * params.depositPercent) / 100);
}

/** What's left to pay once the deposit is deducted from the total (docs/PRD.md, Business rules). */
export function balanceDueKobo(priceKobo: number, depositAmountKobo: number): number {
  return priceKobo - depositAmountKobo;
}
