"use client";

import { useActionState } from "react";
import { CustomerShell } from "@/components/layout/CustomerShell";
import { Button } from "@/components/ui/Button";
import { chooseLaterWithSameStylist, chooseOtherStylist, type DelayChoiceState } from "./actions";

export interface DelayChoiceViewProps {
  bookingId: string;
  state: "choosing" | "unavailable" | "done";
  serviceName?: string;
  branchName?: string;
  originalWhenLabel?: string;
  stylistName?: string;
  laterWhenLabel?: string | null;
  otherStylistName?: string | null;
  whenLabel?: string;
}

const initialState: DelayChoiceState = {};

export function DelayChoiceView(props: DelayChoiceViewProps) {
  const { bookingId, state } = props;
  const [laterState, laterAction, laterPending] = useActionState(chooseLaterWithSameStylist, initialState);
  const [otherState, otherAction, otherPending] = useActionState(chooseOtherStylist, initialState);

  if (state === "done") {
    return (
      <CustomerShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <h1 className="text-xl font-bold">You&apos;re all set</h1>
          <p className="text-sm text-text-muted">
            Your booking is now at {props.whenLabel}. We&apos;ve updated everything on our end — no need to do
            anything else.
          </p>
        </div>
      </CustomerShell>
    );
  }

  if (state === "unavailable" || !props.serviceName) {
    return (
      <CustomerShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <h1 className="text-xl font-bold">This offer is no longer available</h1>
          <p className="text-sm text-text-muted">
            Your original booking time still stands. If you need to change anything, please call your branch.
          </p>
        </div>
      </CustomerShell>
    );
  }

  const { serviceName, branchName, originalWhenLabel, stylistName, laterWhenLabel, otherStylistName } = props;

  return (
    <CustomerShell>
      <div className="flex flex-1 flex-col gap-4 px-5 pt-8">
        <h1 className="text-xl font-bold">Choose a new time</h1>
        <p className="text-sm text-text-muted">
          {stylistName} is running a little behind, so your {serviceName} at {branchName} ({originalWhenLabel}) may
          start late. Pick whichever works better for you.
        </p>

        {(laterState.error || otherState.error) && (
          <p role="alert" className="text-sm font-semibold text-danger-text">
            {laterState.error || otherState.error}
          </p>
        )}

        <div className="flex flex-col gap-3">
          {laterWhenLabel && (
            <form action={laterAction} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
              <input type="hidden" name="bookingId" value={bookingId} />
              <p className="text-sm">
                Keep <strong>{stylistName}</strong>, move to <strong>{laterWhenLabel}</strong>
              </p>
              <Button type="submit" variant="secondary" disabled={laterPending}>
                {laterPending ? "Updating…" : "Choose this time"}
              </Button>
            </form>
          )}

          {otherStylistName && (
            <form action={otherAction} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
              <input type="hidden" name="bookingId" value={bookingId} />
              <p className="text-sm">
                Keep <strong>{originalWhenLabel}</strong>, with <strong>{otherStylistName}</strong> instead
              </p>
              <Button type="submit" variant="secondary" disabled={otherPending}>
                {otherPending ? "Updating…" : "Choose this stylist"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </CustomerShell>
  );
}
