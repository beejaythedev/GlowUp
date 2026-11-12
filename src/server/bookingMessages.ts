export type BookingMessageType = "CONFIRMATION" | "REMINDER_24H" | "REMINDER_3H";

export interface PlannedMessage {
  type: BookingMessageType;
  scheduledFor: Date;
}

const REMINDER_24H_HOURS_BEFORE = 24;
const REMINDER_3H_HOURS_BEFORE = 3;

/**
 * Which messages to schedule once a deposit is confirmed, and when
 * (docs/PRD.md, Reminders — 24 hours and 3 hours before; docs/ROADMAP.md,
 * M8-4). The confirmation goes out as soon as the next job run picks it up;
 * a reminder is skipped entirely if its moment has already passed by
 * confirmation time — a booking made 2 hours out gets no 24-hour or 3-hour
 * reminder, not one "scheduled" for the past.
 */
export function planBookingMessages(startsAt: Date, now: Date): PlannedMessage[] {
  const plans: PlannedMessage[] = [{ type: "CONFIRMATION", scheduledFor: now }];

  const reminder24h = new Date(startsAt.getTime() - REMINDER_24H_HOURS_BEFORE * 60 * 60_000);
  if (reminder24h > now) plans.push({ type: "REMINDER_24H", scheduledFor: reminder24h });

  const reminder3h = new Date(startsAt.getTime() - REMINDER_3H_HOURS_BEFORE * 60 * 60_000);
  if (reminder3h > now) plans.push({ type: "REMINDER_3H", scheduledFor: reminder3h });

  return plans;
}
