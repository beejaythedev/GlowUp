export type CancellationOutcome = "REFUND" | "KEEP";

/**
 * Cancelling at least `freeCancellationHours` before the appointment refunds
 * the deposit; any later cancellation keeps it (docs/PRD.md, Business rules
 * — same rule as a no-show, which never refunds at all since it's never
 * cancelled). `freeCancellationHours` comes from the owner-adjustable
 * Settings row (M7-4), not a hardcoded constant.
 */
export function decideCancellationOutcome(
  appointmentStartsAt: Date,
  now: Date,
  freeCancellationHours: number,
): CancellationOutcome {
  const hoursUntilAppointment = (appointmentStartsAt.getTime() - now.getTime()) / (60 * 60 * 1000);
  return hoursUntilAppointment >= freeCancellationHours ? "REFUND" : "KEEP";
}
