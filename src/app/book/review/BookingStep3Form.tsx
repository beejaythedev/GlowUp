"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { CustomerShell } from "@/components/layout/CustomerShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { isValidNigerianPhone } from "@/lib/phone";
import { formatNaira } from "@/lib/money";
import { confirmBooking, type ConfirmBookingState } from "./actions";

export interface BookingStep3FormProps {
  branchId: string;
  serviceId: string;
  stylistId: string;
  stylistRequested: boolean;
  startsAt: string;
  branchName: string;
  serviceName: string;
  stylistName: string;
  whenLabel: string;
  priceKobo: number;
  depositKobo: number;
  payAtSalonKobo: number;
  freeCancellationLabel: string;
}

const initialState: ConfirmBookingState = {};

export function BookingStep3Form(props: BookingStep3FormProps) {
  const {
    branchId, serviceId, stylistId, stylistRequested, startsAt,
    branchName, serviceName, stylistName, whenLabel,
    priceKobo, depositKobo, payAtSalonKobo, freeCancellationLabel,
  } = props;

  const [state, formAction, pending] = useActionState(confirmBooking, initialState);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const canSubmit = name.trim().length > 0 && isValidNigerianPhone(phone) && !pending;

  return (
    <CustomerShell>
      <header className="flex flex-col gap-4 px-5 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <Link
            href="/book/time"
            aria-label="Back"
            className="-ml-3 flex h-11 w-11 items-center justify-center text-text"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </Link>
          <div className="text-[13px] text-text-muted">Step 3 of 3</div>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <div className="h-1 rounded-full bg-primary" />
          <div className="h-1 rounded-full bg-primary" />
          <div className="h-1 rounded-full bg-primary" />
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          Confirm your booking
        </h1>
      </header>

      <form action={formAction} className="flex flex-1 flex-col gap-4 px-5">
        <input type="hidden" name="branchId" value={branchId} />
        <input type="hidden" name="serviceId" value={serviceId} />
        <input type="hidden" name="stylistId" value={stylistId} />
        <input type="hidden" name="stylistRequested" value={String(stylistRequested)} />
        <input type="hidden" name="startsAt" value={startsAt} />

        <Input
          label="Your name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          required
        />
        <Input
          label="Phone number"
          name="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
          placeholder="0803 123 4521"
          hint="We'll send your confirmation and reminders here."
          required
        />

        <div className="flex flex-col gap-2.5 rounded-2xl border border-border bg-surface p-3.5 text-sm">
          <SummaryRow label="Service" value={serviceName} />
          <SummaryRow
            label="Stylist"
            value={stylistRequested ? stylistName : "Any available"}
          />
          <SummaryRow label="When" value={whenLabel} />
          <SummaryRow label="Branch" value={branchName} />
          <div className="h-px bg-border" />
          <SummaryRow label="Total price" value={formatNaira(priceKobo)} />
          <SummaryRow label="Pay at the salon" value={formatNaira(payAtSalonKobo)} />
          <div className="flex justify-between gap-3 text-base">
            <span className="font-bold">Deposit due now</span>
            <span className="font-bold text-primary">{formatNaira(depositKobo)}</span>
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-2xl bg-primary-tint p-3.5 text-[13px] leading-relaxed text-primary-dark">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 flex-none">
            <path d="M12 3l8 4v5c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V7z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          <span>
            Free cancellation until {freeCancellationLabel}. After that, or if you don&apos;t
            arrive, the deposit isn&apos;t refunded.
          </span>
        </div>

        {state.error && (
          <p role="alert" className="text-sm font-semibold text-danger-text">
            {state.error}
          </p>
        )}

        <div className="flex-1" />

        <footer className="-mx-5 flex flex-col gap-2.5 border-t border-border bg-surface px-5 py-4">
          <Button type="submit" size="lg" disabled={!canSubmit}>
            {pending ? "Reserving your slot…" : `Pay ${formatNaira(depositKobo)} deposit`}
          </Button>
          <div className="text-center text-xs text-text-muted">
            Card or bank transfer · secure payment
          </div>
        </footer>
      </form>
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
