"use client";

import { useActionState, useEffect, useState } from "react";
import { CustomerShell } from "@/components/layout/CustomerShell";
import { Button } from "@/components/ui/Button";
import { payDeposit, type PayDepositState } from "./actions";

export interface PayFormProps {
  bookingId: string;
  serviceName: string;
  branchName: string;
  whenLabel: string;
  depositLabel: string;
  holdExpiresAt: string | null;
  holdExpired: boolean;
}

const initialState: PayDepositState = {};

export function PayForm(props: PayFormProps) {
  const { bookingId, serviceName, branchName, whenLabel, depositLabel, holdExpiresAt, holdExpired } = props;
  const [state, formAction, pending] = useActionState(payDeposit, initialState);
  const secondsLeft = useHoldCountdown(holdExpiresAt);
  const expired = holdExpired || secondsLeft === 0;

  return (
    <CustomerShell>
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="text-xl font-extrabold tracking-tight text-primary">GlowUp</div>
        {!expired && secondsLeft !== null && (
          <div className="rounded-full bg-primary-tint px-3 py-1 text-[13px] font-semibold text-primary-dark">
            Reserved for {formatCountdown(secondsLeft)}
          </div>
        )}
      </header>

      <div className="flex flex-1 flex-col gap-4 px-5">
        <h1 className="text-2xl font-bold tracking-tight">Pay your deposit</h1>

        <div className="flex flex-col gap-2.5 rounded-2xl border border-border bg-surface p-3.5 text-sm">
          <SummaryRow label="Service" value={serviceName} />
          <SummaryRow label="When" value={whenLabel} />
          <SummaryRow label="Branch" value={branchName} />
          <div className="h-px bg-border" />
          <div className="flex justify-between gap-3 text-base">
            <span className="font-bold">Deposit due now</span>
            <span className="font-bold text-primary">{depositLabel}</span>
          </div>
        </div>

        {expired ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-danger-border bg-surface p-3.5 text-sm text-danger-text">
            <p>
              Your hold on this slot has expired. Please go back and choose a time
              again.
            </p>
            <Button href="/book" variant="secondary">
              Start again
            </Button>
          </div>
        ) : (
          <form action={formAction} className="flex flex-col gap-2.5">
            <input type="hidden" name="bookingId" value={bookingId} />

            {state.error && (
              <p role="alert" className="text-sm font-semibold text-danger-text">
                {state.error}
              </p>
            )}

            <Button
              type="submit"
              name="forceFailure"
              value="false"
              size="lg"
              disabled={pending}
              className="w-full"
            >
              {pending ? "Paying…" : `Pay ${depositLabel} deposit`}
            </Button>
            <div className="text-center text-xs text-text-muted">
              Card or bank transfer · secure payment
            </div>

            <button
              type="submit"
              name="forceFailure"
              value="true"
              disabled={pending}
              className="mt-2 text-center text-xs text-text-muted underline disabled:opacity-50"
            >
              Simulate a failed payment (test mode)
            </button>
          </form>
        )}
      </div>
    </CustomerShell>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-text-muted">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

/** Seconds left until `holdExpiresAt`, ticking down every second. Null if there's no hold to track. */
function useHoldCountdown(holdExpiresAt: string | null): number | null {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(() =>
    holdExpiresAt ? secondsUntil(holdExpiresAt) : null,
  );

  useEffect(() => {
    if (!holdExpiresAt) return;
    const interval = setInterval(() => {
      setSecondsLeft(secondsUntil(holdExpiresAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [holdExpiresAt]);

  return secondsLeft;
}

function secondsUntil(iso: string): number {
  return Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 1000));
}

function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}
