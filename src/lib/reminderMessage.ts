export interface ReminderMessageParams {
  customerFirstName: string;
  serviceName: string;
  branchName: string;
  whenLabel: string;
  arriveByLabel: string;
  bookingReference: string;
}

/**
 * The 24-hour reminder — also the last moment a cancellation is refundable
 * (docs/PRD.md, Reminders: "24 hours before (last free-cancellation
 * chance)"), so it says so.
 */
export function formatReminder24hMessage(params: ReminderMessageParams): string {
  const { customerFirstName, serviceName, branchName, whenLabel, arriveByLabel, bookingReference } = params;
  return (
    `Hi ${customerFirstName}, a reminder: you're booked at ${branchName} for ${serviceName} ` +
    `on ${whenLabel}. Please arrive by ${arriveByLabel}. This is also your last chance to ` +
    `cancel for a full refund of your deposit. Ref ${bookingReference}.`
  );
}

/** The 3-hour reminder — just a nudge, the free-cancellation window has already closed. */
export function formatReminder3hMessage(params: ReminderMessageParams): string {
  const { customerFirstName, serviceName, branchName, whenLabel, arriveByLabel, bookingReference } = params;
  return (
    `Hi ${customerFirstName}, see you soon! Your ${serviceName} at ${branchName} is at ${whenLabel}. ` +
    `Please arrive by ${arriveByLabel}. Ref ${bookingReference}.`
  );
}
