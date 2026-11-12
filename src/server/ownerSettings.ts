export const PREP_MINUTES_OPTIONS = [0, 5, 10, 15, 20] as const;
export const DEPOSIT_PERCENT_OPTIONS = [10, 20, 30] as const;
export const FREE_CANCELLATION_HOURS_OPTIONS = [12, 24, 48] as const;
export const ARRIVE_EARLY_MINUTES_OPTIONS = [0, 5, 10, 15] as const;
export const CHECK_IN_PROMPT_MINUTES_OPTIONS = [10, 15, 20] as const;

export function formatPrepTimeLabel(minutes: number): string {
  return minutes === 0 ? "None" : `${minutes} min`;
}

export function formatArriveEarlyLabel(minutes: number): string {
  return minutes === 0 ? "On time" : `${minutes} min early`;
}

export interface OfferedAtBranch {
  offersNails: boolean;
}

/**
 * How many of the branches actually offer a service — every branch for a
 * regular service, only the nail-service branches for one that's nails-only
 * (docs/PRD.md — mirrors the same `nailsOnly && !offersNails` check the
 * customer booking flow and reception's new-booking form already use).
 */
export function countOfferedBranches(service: { nailsOnly: boolean }, branches: OfferedAtBranch[]): number {
  if (!service.nailsOnly) return branches.length;
  return branches.filter((b) => b.offersNails).length;
}

/** "All branches" once every branch offers it, otherwise "N branches" (or "1 branch"). */
export function formatOfferedAtLabel(offeredCount: number, totalBranches: number): string {
  if (offeredCount === totalBranches) return "All branches";
  return `${offeredCount} branch${offeredCount === 1 ? "" : "es"}`;
}
