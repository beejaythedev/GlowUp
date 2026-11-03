"use client";

import { useActionState, useState } from "react";
import { performBookingAction, type BookingActionState } from "./actions";

export interface OverduePrompt {
  bookingId: string;
  customerName: string;
  stylistName: string;
  appointmentLabel: string;
  overdueLabel: string;
  minutesLate: number;
}

const ARRIVAL_OPTIONS = (minutesLate: number) =>
  [
    { label: "Just now", minutesAgo: 0 },
    { label: "5 min ago", minutesAgo: 5 },
    { label: "10 min ago", minutesAgo: 10 },
    { label: "On time", minutesAgo: minutesLate },
  ] as const;

const initialState: BookingActionState = {};

/**
 * One overdue booking at a time (docs/PRD.md rule 5's "Has [name] arrived?"
 * safety net). Dismissing or snoozing one just moves to the next in
 * `prompts` — snoozes live only in this component's state, lost on reload,
 * which matches "ask again in 5 min" rather than a stored preference.
 */
export function CheckInPromptModal({ prompts }: { prompts: OverduePrompt[] }) {
  const [snoozed, setSnoozed] = useState<Record<string, boolean>>({});
  const [state, formAction, pending] = useActionState(performBookingAction, initialState);
  const [arrivedMinutesAgo, setArrivedMinutesAgo] = useState(0);

  const visible = prompts.find((p) => !snoozed[p.bookingId]);
  if (!visible) return null;

  function snooze() {
    const id = visible!.bookingId;
    setSnoozed((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setSnoozed((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }, 5 * 60_000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text/40 p-5">
      <div
        role="alertdialog"
        aria-labelledby="prompt-title"
        className="flex w-full max-w-[400px] flex-col gap-3.5 rounded-card border border-warning-border bg-surface p-5"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-2xl bg-warning-tint">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-warning-text">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </span>
          <div className="flex flex-col gap-0.5">
            <div id="prompt-title" className="text-[17px] font-extrabold">
              Has {visible.customerName} arrived?
            </div>
            <div className="text-[13px] text-text-muted">
              Due {visible.appointmentLabel} with {visible.stylistName} · {visible.overdueLabel}, not checked in
            </div>
          </div>
        </div>

        <form action={formAction} className="flex flex-col gap-2.5">
          <input type="hidden" name="bookingId" value={visible.bookingId} />

          {state.error && (
            <p role="alert" className="text-sm font-semibold text-danger-text">
              {state.error}
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <div className="text-xs font-bold text-text-muted">They arrived</div>
            <div className="grid grid-cols-4 gap-1.5">
              {ARRIVAL_OPTIONS(visible.minutesLate).map((option) => (
                <button
                  key={option.label}
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

          <div className="mt-1 grid grid-cols-[2fr_1fr] gap-2">
            <button
              type="submit"
              name="action"
              value="CHECK_IN"
              disabled={pending}
              className="flex min-h-12 items-center justify-center rounded-full bg-primary text-[15px] font-bold text-white disabled:opacity-50"
            >
              Check in
            </button>
            <button
              type="submit"
              name="action"
              value="NO_SHOW"
              disabled={pending}
              className="flex min-h-12 items-center justify-center rounded-full border border-border-strong text-sm font-bold text-danger-text disabled:opacity-50"
            >
              No-show
            </button>
          </div>
        </form>

        <button
          type="button"
          onClick={snooze}
          className="self-center text-[13px] font-semibold text-primary"
        >
          Not yet, ask again in 5 min
        </button>
      </div>
    </div>
  );
}
