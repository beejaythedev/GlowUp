"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signOut } from "@/app/staff/actions";
import { Button } from "@/components/ui/Button";
import { formatDurationLabel } from "@/lib/duration";
import { formatNaira } from "@/lib/money";
import { calculateDepositKobo } from "@/server/money";
import {
  ARRIVE_EARLY_MINUTES_OPTIONS,
  CHECK_IN_PROMPT_MINUTES_OPTIONS,
  DEPOSIT_PERCENT_OPTIONS,
  FREE_CANCELLATION_HOURS_OPTIONS,
  PREP_MINUTES_OPTIONS,
  formatArriveEarlyLabel,
  formatOfferedAtLabel,
  formatPrepTimeLabel,
} from "@/server/ownerSettings";
import { saveOwnerSettings, type SettingsActionState } from "./settingsActions";

export interface SettingsService {
  id: string;
  name: string;
  minDurationMinutes: number;
  maxDurationMinutes: number;
  priceKobo: number;
  prepMinutes: number;
  nailsOnly: boolean;
  offeredCount: number;
}

export interface BookingRuleSettings {
  depositPercent: number;
  freeCancellationHours: number;
  arriveEarlyMinutes: number;
  checkInPromptAfterMinutes: number;
}

export interface OwnerSettingsViewProps {
  ownerName: string;
  services: SettingsService[];
  totalBranches: number;
  settings: BookingRuleSettings;
}

const initialState: SettingsActionState = {};

export function OwnerSettingsView({ ownerName, services, totalBranches, settings }: OwnerSettingsViewProps) {
  const [state, formAction, pending] = useActionState(saveOwnerSettings, initialState);
  const [depositPercent, setDepositPercent] = useState(settings.depositPercent);
  const [prepMinutesByService, setPrepMinutesByService] = useState<Record<string, number>>(
    Object.fromEntries(services.map((s) => [s.id, s.prepMinutes])),
  );

  return (
    <div className="min-h-screen bg-bg text-text">
      <nav className="flex flex-wrap items-center justify-between gap-3 bg-brand-navy px-6 py-3 text-white">
        <div className="flex flex-wrap items-center gap-3.5">
          <span className="text-xl font-extrabold tracking-tight">GlowUp</span>
          <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-brand-navy">Owner</span>
          <Link href="/staff/owner" className="text-sm text-nav-muted hover:text-white">
            Overview
          </Link>
          <Link href="/staff/owner/staff" className="text-sm text-nav-muted hover:text-white">
            Staff and access
          </Link>
          <span className="text-sm font-bold text-white">Settings</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm">{ownerName}</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-extrabold text-brand-navy">
            {ownerName.charAt(0).toUpperCase()}
          </span>
          <form action={signOut}>
            <button type="submit" className="text-[13px] text-nav-muted hover:text-white">
              Sign out
            </button>
          </form>
        </div>
      </nav>

      <form action={formAction} className="mx-auto flex max-w-[1360px] flex-col gap-5 p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[28px] font-extrabold tracking-tight">Services and booking rules</h1>
            <p className="text-sm text-text-muted">Applies to all four branches. Customers never see prep time.</p>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>

        {state.error && (
          <p role="alert" className="text-sm font-semibold text-danger-text">
            {state.error}
          </p>
        )}

        <div className="flex flex-wrap items-start gap-5">
          <section className="min-w-0 flex-[999_1_560px] rounded-card border border-border bg-surface p-1.5 pb-1.5">
            <div className="px-3.5 py-2.5">
              <h2 className="text-[17px] font-extrabold">Services</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-text-muted">
                    <th className="px-3.5 py-3">Service</th>
                    <th className="px-3.5 py-3">Duration</th>
                    <th className="px-3.5 py-3">Price</th>
                    <th className="px-3.5 py-3">{`Deposit (${depositPercent}%)`}</th>
                    <th className="px-3.5 py-3">Prep time after</th>
                    <th className="px-3.5 py-3">Offered at</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((service) => (
                    <tr key={service.id} className="border-b border-border">
                      <td className="px-3.5 py-3 font-bold">
                        <input type="hidden" name="serviceId" value={service.id} />
                        {service.name}
                      </td>
                      <td className="px-3.5 py-3">{formatDurationLabel(service.minDurationMinutes, service.maxDurationMinutes)}</td>
                      <td className="px-3.5 py-3">{formatNaira(service.priceKobo)}</td>
                      <td className="px-3.5 py-3">
                        {formatNaira(calculateDepositKobo({ priceKobo: service.priceKobo, depositPercent, source: "ONLINE" }))}
                      </td>
                      <td className="px-3.5 py-3">
                        <label className="sr-only" htmlFor={`prep-${service.id}`}>
                          Prep time after {service.name}
                        </label>
                        <select
                          id={`prep-${service.id}`}
                          name="prepMinutes"
                          value={prepMinutesByService[service.id]}
                          onChange={(e) =>
                            setPrepMinutesByService((prev) => ({ ...prev, [service.id]: Number(e.target.value) }))
                          }
                          className="h-10 rounded-input border border-border-strong bg-surface px-2.5 text-sm"
                        >
                          {PREP_MINUTES_OPTIONS.map((minutes) => (
                            <option key={minutes} value={minutes}>
                              {formatPrepTimeLabel(minutes)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3.5 py-3">{formatOfferedAtLabel(service.offeredCount, totalBranches)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="m-3.5 rounded-2xl bg-primary-tint p-3.5 text-[13px] leading-relaxed text-primary-dark">
              With 10 minutes&apos; prep, a stylist fits 8 one-hour services between 9am and 7pm, instead of 10 back to
              back.
            </div>
          </section>

          <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-4 rounded-card border border-border bg-surface p-5">
            <h2 className="text-[17px] font-extrabold">Booking rules</h2>
            <RuleSelect
              label="Deposit"
              name="depositPercent"
              value={depositPercent}
              onChange={setDepositPercent}
              options={DEPOSIT_PERCENT_OPTIONS}
              formatOption={(v) => `${v}% of price`}
            />
            <RuleSelect
              label="Free cancellation up to"
              name="freeCancellationHours"
              defaultValue={settings.freeCancellationHours}
              options={FREE_CANCELLATION_HOURS_OPTIONS}
              formatOption={(v) => `${v} hours before`}
            />
            <RuleSelect
              label="Ask customers to arrive"
              name="arriveEarlyMinutes"
              defaultValue={settings.arriveEarlyMinutes}
              options={ARRIVE_EARLY_MINUTES_OPTIONS}
              formatOption={formatArriveEarlyLabel}
            />
            <RuleSelect
              label="Ask reception if not checked in after"
              name="checkInPromptAfterMinutes"
              defaultValue={settings.checkInPromptAfterMinutes}
              options={CHECK_IN_PROMPT_MINUTES_OPTIONS}
              formatOption={(v) => `${v} min`}
            />
          </aside>
        </div>
      </form>
    </div>
  );
}

function RuleSelect<T extends number>({
  label,
  name,
  value,
  defaultValue,
  onChange,
  options,
  formatOption,
}: {
  label: string;
  name: string;
  value?: T;
  defaultValue?: T;
  onChange?: (value: T) => void;
  options: readonly T[];
  formatOption: (value: T) => string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-text-muted">{label}</span>
      <select
        name={name}
        value={value}
        defaultValue={value === undefined ? defaultValue : undefined}
        onChange={onChange ? (e) => onChange(Number(e.target.value) as T) : undefined}
        className="h-10 rounded-input border border-border-strong bg-surface px-2.5 text-sm"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {formatOption(option)}
          </option>
        ))}
      </select>
    </label>
  );
}
