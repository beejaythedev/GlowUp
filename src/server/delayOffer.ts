import { getAvailableSlots, type AvailabilityBooking, type AvailabilityStylist, type GetAvailableSlotsInput } from "@/server/availability";

export interface DelayOfferInput {
  service: GetAvailableSlotsInput["service"];
  branchOffersNails: boolean;
  openingHours: { opensAt: Date; closesAt: Date } | null;
  requestedStylistId: string;
  /** The requested stylist's own bookings today (including the one running over). */
  requestedStylistBookings: AvailabilityBooking[];
  /** Every other active stylist at the branch, with their own bookings today. */
  otherStylists: AvailabilityStylist[];
  originalStartsAt: Date;
  now: Date;
}

export interface DelayOffer {
  /** The requested stylist's soonest slot after the original time, or null if they have none free today. */
  laterWithSameStylist: Date | null;
  /** An other stylist genuinely free at the exact original time, or null if none is. */
  otherStylistAtOriginalTime: { stylistId: string } | null;
}

/**
 * What a "running over" requested-stylist booking can be offered instead
 * (docs/ROADMAP.md, M8-5): a later slot with the same stylist, or the
 * original time with someone else. Reuses the same availability engine
 * (M2-1/M2-2) customers see when booking, rather than a separate check —
 * an offer that wouldn't actually be bookable isn't worth sending.
 */
export function computeDelayOffer(input: DelayOfferInput): DelayOffer {
  const sameStylistSlots = getAvailableSlots({
    openingHours: input.openingHours,
    service: input.service,
    branchOffersNails: input.branchOffersNails,
    selection: { stylistId: input.requestedStylistId },
    stylists: [{ id: input.requestedStylistId, bookings: input.requestedStylistBookings }],
    now: input.now,
  });
  const laterWithSameStylist =
    sameStylistSlots.find((slot) => slot.getTime() > input.originalStartsAt.getTime()) ?? null;

  let otherStylistAtOriginalTime: { stylistId: string } | null = null;
  for (const stylist of input.otherStylists) {
    const slots = getAvailableSlots({
      openingHours: input.openingHours,
      service: input.service,
      branchOffersNails: input.branchOffersNails,
      selection: "any",
      stylists: [stylist],
      now: input.now,
    });
    if (slots.some((slot) => slot.getTime() === input.originalStartsAt.getTime())) {
      otherStylistAtOriginalTime = { stylistId: stylist.id };
      break;
    }
  }

  return { laterWithSameStylist, otherStylistAtOriginalTime };
}
