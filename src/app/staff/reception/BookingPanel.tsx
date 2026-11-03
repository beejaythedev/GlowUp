"use client";

import { useActionState, useState, type ReactNode } from "react";
import { StatusBadge, type StatusBadgeStatus } from "@/components/ui/StatusBadge";
import { formatNaira } from "@/lib/money";
import type { DepositStatus } from "@/generated/prisma/enums";
import type { DisplayStatus } from "@/server/status";
import { performBookingAction, type BookingActionState } from "./actions";

export interface SelectedBooking {
  bookingId: string;
  customerName: string;
  sourceLabel: string;
  isFirstVisit: boolean;
  displayStatus: DisplayStatus;
  waitMinutes: number | null;
  serviceName: string;
  stylistName: string;
  stylistRequested: boolean;
  isWalkIn: boolean;
  depositAmountKobo: number;
  depositStatus: DepositStatus;
  balanceDueKobo: number;
  appointmentLabel: string;
  checkedInLabel: string | null;
  startedLabel: string | null;
  finishedLabel: string | null;
  lateNote: string | null;
  canCheckIn: boolean;
  canStart: boolean;
  canFinish: boolean;
  canUndoCheckIn: boolean;
  canMarkNoShow: boolean;
  canCancel: boolean;
  canMove: boolean;
  otherStylists: { id: string; name: string }[];
  /** In service, 15+ minutes from its booked end, not finished yet (docs/PRD.md rule 9). */
  runningOver: boolean;
  /** A prior booking for this stylist is running over, so this one may start late. */
  flaggedForDelay: boolean;
}

const statusBadgeFor: Record<DisplayStatus, StatusBadgeStatus | null> = {
  booked: "booked",
  checkedInEarly: "checkedInEarly",
  waiting: "waiting",
  inService: "inService",
  done: "done",
  noShow: "noShow",
  cancelled: null,
};

const statusLabelFor: Record<DisplayStatus, string> = {
  booked: "Booked",
  checkedInEarly: "Checked in",
  waiting: "Waiting",
  inService: "In service",
  done: "Done",
  noShow: "No-show",
  cancelled: "Cancelled",
};

const initialState: BookingActionState = {};

const ARRIVAL_OPTIONS = [
  { label: "Just now", minutesAgo: 0 },
  { label: "5 min ago", minutesAgo: 5 },
  { label: "10 min ago", minutesAgo: 10 },
] as const;

export function BookingPanel({ booking }: { booking: SelectedBooking }) {
  const [state, formAction, pending] = useActionState(performBookingAction, initialState);
  const [arrivedMinutesAgo, setArrivedMinutesAgo] = useState(0);
  const badgeStatus = booking.runningOver ? "waiting" : statusBadgeFor[booking.displayStatus];
  const badgeLabel = booking.runningOver
    ? "Running over"
    : booking.displayStatus === "waiting" && booking.waitMinutes !== null
      ? `Waiting ${booking.waitMinutes} min`
      : statusLabelFor[booking.displayStatus];

  return (
    <div className="flex flex-col gap-3.5 rounded-card border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xl font-extrabold">{booking.customerName}</div>
          <div className="text-[13px] text-text-muted">
            {booking.sourceLabel}
            {booking.isFirstVisit ? " · first visit" : ""}
          </div>
        </div>
        {badgeStatus && <StatusBadge status={badgeStatus}>{badgeLabel}</StatusBadge>}
      </div>

      {booking.flaggedForDelay && (
        <div className="flex flex-col gap-2 rounded-xl border border-warning-border bg-warning-tint p-3 text-[13px] text-warning-text">
          <span>
            {booking.stylistName} is running over on the appointment before this one — it may
            start late.
          </span>
          {booking.stylistRequested ? (
            <button
              type="button"
              disabled
              title="Sends an SMS offering a later time with the same stylist or this time with another — arrives in M8"
              className="flex min-h-9 w-fit items-center rounded-full border border-warning-border bg-surface px-3 text-xs font-bold text-warning-text opacity-60"
            >
              Send delay message
            </button>
          ) : (
            <span className="text-xs">This was &quot;any available&quot; — move it to a free stylist below.</span>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2 text-sm">
        <Row label="Service" value={booking.serviceName} />
        <Row
          label="Stylist"
          value={booking.stylistRequested ? `${booking.stylistName} · Requested` : booking.stylistName}
        />
        <Row
          label="Deposit"
          value={
            booking.depositStatus === "PAID"
              ? `${formatNaira(booking.depositAmountKobo)} paid`
              : booking.depositStatus === "NONE"
                ? "None (walk-in)"
                : booking.depositStatus
          }
        />
        <Row label="Balance due" value={formatNaira(booking.balanceDueKobo)} bold />
      </div>

      <div className="flex flex-col gap-2.5 rounded-xl bg-bg p-3.5 text-[13px]">
        <div className="text-xs font-bold text-text-muted">Timeline</div>
        <TimelineRow label="Appointment time" value={booking.appointmentLabel} done />
        <TimelineRow label="Checked in" value={booking.checkedInLabel} done={booking.checkedInLabel !== null} />
        <TimelineRow label="Stylist starts" value={booking.startedLabel} done={booking.startedLabel !== null} />
        <TimelineRow label="Stylist finishes" value={booking.finishedLabel} done={booking.finishedLabel !== null} />
        {booking.lateNote && <div className="text-xs text-text-muted">{booking.lateNote}</div>}
      </div>

      <form action={formAction} className="flex flex-col gap-2.5">
        <input type="hidden" name="bookingId" value={booking.bookingId} />

        {state.error && (
          <p role="alert" className="text-sm font-semibold text-danger-text">
            {state.error}
          </p>
        )}

        {booking.canCheckIn && (
          <>
            <div className="flex flex-col gap-1.5">
              <div className="text-xs font-semibold text-text-muted">Did they arrive earlier?</div>
              <div className="grid grid-cols-3 gap-1.5">
                {ARRIVAL_OPTIONS.map((option) => (
                  <button
                    key={option.minutesAgo}
                    type="button"
                    aria-pressed={arrivedMinutesAgo === option.minutesAgo}
                    onClick={() => setArrivedMinutesAgo(option.minutesAgo)}
                    className={`flex min-h-10 items-center justify-center rounded-full border text-[13px] font-semibold ${
                      arrivedMinutesAgo === option.minutesAgo
                        ? "border-2 border-primary bg-primary-tint text-primary-dark"
                        : "border-border-strong text-text"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <input type="hidden" name="checkedInMinutesAgo" value={arrivedMinutesAgo} />
            <ActionButton name="action" value="CHECK_IN" pending={pending} primary>
              Check in
            </ActionButton>
          </>
        )}
        {booking.canStart && (
          <ActionButton name="action" value="START" pending={pending} primary>
            Start service (backup)
          </ActionButton>
        )}
        {booking.canFinish && (
          <ActionButton name="action" value="FINISH" pending={pending} primary>
            Finish service (backup)
          </ActionButton>
        )}

        {(booking.canUndoCheckIn || booking.canCancel || booking.canMarkNoShow) && (
          <div className="grid grid-cols-2 gap-2.5">
            {booking.canUndoCheckIn && (
              <ActionButton name="action" value="UNDO_CHECK_IN" pending={pending}>
                Undo check-in
              </ActionButton>
            )}
            {booking.canMarkNoShow && (
              <ActionButton name="action" value="NO_SHOW" pending={pending}>
                Mark no-show
              </ActionButton>
            )}
            {booking.canCancel && (
              <ActionButton name="action" value="CANCEL" pending={pending}>
                Cancel booking
              </ActionButton>
            )}
          </div>
        )}

        {booking.canMove && booking.otherStylists.length > 0 && (
          <div className="flex items-center gap-2 border-t border-border pt-2.5">
            <select
              name="newStylistId"
              className="h-11 flex-1 rounded-input border border-border-strong bg-surface px-3 text-sm"
              defaultValue=""
            >
              <option value="" disabled>
                Move to…
              </option>
              {booking.otherStylists.map((stylist) => (
                <option key={stylist.id} value={stylist.id}>
                  {stylist.name}
                </option>
              ))}
            </select>
            <ActionButton name="action" value="MOVE" pending={pending}>
              Move
            </ActionButton>
          </div>
        )}
      </form>
    </div>
  );
}

function Row({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-text-muted">{label}</span>
      <span className={bold ? "font-extrabold" : "font-semibold"}>{value}</span>
    </div>
  );
}

function TimelineRow({ label, value, done }: { label: string; value: string | null; done: boolean }) {
  return (
    <div className="grid grid-cols-[14px_1fr_auto] items-center gap-2.5">
      <span
        className={
          done
            ? "h-2.5 w-2.5 rounded-full bg-primary"
            : "h-2.5 w-2.5 rounded-full border-2 border-dashed border-border-strong"
        }
      />
      <span className={done ? "" : "text-text-muted"}>{label}</span>
      <span className={done ? "font-bold" : "text-text-muted"}>{value ?? "–"}</span>
    </div>
  );
}

function ActionButton({
  name,
  value,
  pending,
  primary = false,
  children,
}: {
  name: string;
  value: string;
  pending: boolean;
  primary?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={
        primary
          ? "flex min-h-[52px] items-center justify-center rounded-full bg-primary text-[15px] font-bold text-white disabled:opacity-50"
          : "flex min-h-11 items-center justify-center rounded-full border border-border-strong text-sm font-semibold disabled:opacity-50"
      }
    >
      {children}
    </button>
  );
}
