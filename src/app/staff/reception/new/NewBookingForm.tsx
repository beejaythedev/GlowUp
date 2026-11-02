"use client";

import Link from "next/link";
import { useActionState, useMemo, useState, useTransition } from "react";
import { signOut } from "@/app/staff/actions";
import { formatDurationLabel } from "@/lib/duration";
import { formatLagosClockTime } from "@/lib/lagosTime";
import { formatNaira } from "@/lib/money";
import { isValidNigerianPhone } from "@/lib/phone";
import {
  getAvailableSlots,
  getSoonestFreePerStylist,
  type AvailabilityBooking,
} from "@/server/availability";
import { calculateDepositKobo, balanceDueKobo } from "@/server/money";
import { createBookingAction, lookupCustomer, type CreateBookingState } from "./actions";

export interface StylistOption {
  id: string;
  name: string;
  bookings: AvailabilityBooking[];
}

export interface ServiceOption {
  id: string;
  name: string;
  priceKobo: number;
  minDurationMinutes: number;
  maxDurationMinutes: number;
  prepMinutes: number;
  nailsOnly: boolean;
}

export interface NewBookingFormProps {
  branchId: string;
  branchName: string;
  branchOffersNails: boolean;
  staffName: string;
  stylists: StylistOption[];
  services: ServiceOption[];
  depositPercent: number;
  openingHours: { opensAt: string; closesAt: string } | null;
}

const MAX_TIME_OPTIONS = 3;
const initialState: CreateBookingState = {};

export function NewBookingForm(props: NewBookingFormProps) {
  const { branchId, branchName, branchOffersNails, staffName, stylists, services, depositPercent, openingHours } =
    props;

  const [state, formAction, pending] = useActionState(createBookingAction, initialState);
  const now = useMemo(() => new Date(), []);
  const openWindow = useMemo(
    () => (openingHours ? { opensAt: new Date(openingHours.opensAt), closesAt: new Date(openingHours.closesAt) } : null),
    [openingHours],
  );

  const [source, setSource] = useState<"WALK_IN" | "PHONE">("WALK_IN");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [lookup, setLookup] = useState<{ found: boolean; visitCount: number } | null>(null);
  const [, startLookup] = useTransition();

  // Each of these three only overrides the "soonest/first" default once the
  // receptionist actually picks something — derived from the service/stylist
  // selection instead of synced via effects, so there's no cascading render.
  const [serviceId, setServiceId] = useState<string | undefined>(services[0]?.id);
  const [stylistOverride, setStylistOverride] = useState<string | undefined>(undefined);
  const [timeOverride, setTimeOverride] = useState<Date | null | undefined>(undefined);

  const service = services.find((s) => s.id === serviceId);
  const availableForService = service && (!service.nailsOnly || branchOffersNails);

  const soonestFree = useMemo(() => {
    if (!service || !availableForService) return [];
    return getSoonestFreePerStylist(stylists, service, openWindow, now);
  }, [stylists, service, availableForService, openWindow, now]);

  const stylistId = stylistOverride ?? soonestFree.find((s) => s.soonestFree)?.stylistId;

  const availableTimes = useMemo(() => {
    if (!service || !stylistId || !openWindow) return [];
    return getAvailableSlots({
      openingHours: openWindow,
      service,
      branchOffersNails,
      selection: { stylistId },
      stylists,
      now,
    }).slice(0, MAX_TIME_OPTIONS);
  }, [service, stylistId, openWindow, branchOffersNails, stylists, now]);

  const selectedTime = timeOverride !== undefined ? timeOverride : (availableTimes[0] ?? null);

  function selectService(id: string) {
    setServiceId(id);
    setStylistOverride(undefined);
    setTimeOverride(undefined);
  }

  function selectStylist(id: string) {
    setStylistOverride(id);
    setTimeOverride(undefined);
  }

  function handlePhoneChange(value: string) {
    setPhone(value);
    setLookup(null);
    if (!isValidNigerianPhone(value)) return;
    startLookup(async () => {
      const result = await lookupCustomer(value);
      setLookup({ found: result.found, visitCount: result.visitCount });
      if (result.found && result.name && !nameTouched) setName(result.name);
    });
  }

  const depositKobo = service ? calculateDepositKobo({ priceKobo: service.priceKobo, depositPercent, source }) : 0;
  const payAtSalonKobo = service ? balanceDueKobo(service.priceKobo, depositKobo) : 0;
  const selectedStylistName = stylists.find((s) => s.id === stylistId)?.name ?? "";

  const canSubmit =
    !pending && !!service && !!stylistId && !!selectedTime && name.trim().length > 0 && isValidNigerianPhone(phone);

  return (
    <div className="min-h-screen bg-bg text-text">
      <nav className="flex flex-wrap items-center justify-between gap-3 bg-brand-navy px-6 py-3 text-white">
        <div className="flex flex-wrap items-center gap-3.5">
          <span className="text-xl font-extrabold tracking-tight">GlowUp</span>
          <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-bold">Reception</span>
          <span className="text-sm text-nav-muted">{branchName}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-extrabold text-brand-navy">
            {staffName.charAt(0).toUpperCase()}
          </span>
          <span className="text-sm">{staffName}</span>
          <form action={signOut}>
            <button type="submit" className="text-[13px] text-nav-muted hover:text-white">
              Sign out
            </button>
          </form>
        </div>
      </nav>

      <main className="mx-auto flex max-w-[1200px] flex-col gap-5 p-6">
        <div className="flex flex-col gap-1.5">
          <Link href="/staff/reception" className="inline-flex min-h-8 items-center gap-1.5 text-sm font-semibold">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" />
            </svg>
            Back to schedule
          </Link>
          <h1 className="text-[28px] font-extrabold tracking-tight">New booking</h1>
        </div>

        <div className="flex flex-wrap items-start gap-5">
          <form
            id="new-booking-form"
            action={formAction}
            className="flex min-w-0 flex-[999_1_560px] flex-col gap-5 rounded-card border border-border bg-surface p-6"
          >
            <input type="hidden" name="branchId" value={branchId} />
            <input type="hidden" name="serviceId" value={serviceId ?? ""} />
            <input type="hidden" name="stylistId" value={stylistId ?? ""} />
            <input type="hidden" name="source" value={source} />
            <input type="hidden" name="phone" value={phone} />
            <input type="hidden" name="startsAt" value={selectedTime ? selectedTime.toISOString() : ""} />

            <div className="inline-flex w-fit gap-1 rounded-full bg-disabled-bg p-1">
              {(["WALK_IN", "PHONE"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={source === option}
                  onClick={() => setSource(option)}
                  className={`flex min-h-10 items-center rounded-full px-5 text-sm font-bold ${
                    source === option ? "bg-brand-navy text-white" : "text-text"
                  }`}
                >
                  {option === "WALK_IN" ? "Walk-in" : "Phone call"}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="cust-phone" className="text-[13px] font-semibold text-text-muted">
                  Customer phone
                </label>
                <input
                  id="cust-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="0803 123 4521"
                  className="h-12 rounded-input border-2 border-primary bg-surface px-3.5 text-[15px] text-text outline-none"
                />
                {lookup && (
                  <span className={`text-xs font-semibold ${lookup.found ? "text-success-text" : "text-text-muted"}`}>
                    {lookup.found ? `Returning customer · ${lookup.visitCount} visits` : "New customer"}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="cust-name" className="text-[13px] font-semibold text-text-muted">
                  Name
                </label>
                <input
                  id="cust-name"
                  name="name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setNameTouched(true);
                  }}
                  className="h-12 rounded-input border border-border-strong bg-surface px-3.5 text-[15px] text-text outline-none"
                />
                {lookup?.found && <span className="text-xs text-text-muted">Filled in from her last visit</span>}
              </div>
            </div>

            <fieldset className="flex flex-col gap-2.5 border-0 p-0">
              <legend className="mb-1 text-[13px] font-semibold text-text-muted">Service</legend>
              <div className="flex flex-wrap gap-2">
                {services.map((option) => {
                  const unavailable = option.nailsOnly && !branchOffersNails;
                  const selected = option.id === serviceId;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={unavailable}
                      aria-pressed={selected}
                      onClick={() => selectService(option.id)}
                      className={`flex min-h-[42px] items-center rounded-full border px-3.5 text-sm disabled:cursor-not-allowed disabled:opacity-40 ${
                        selected
                          ? "border-2 border-primary bg-primary-tint font-bold text-primary-dark"
                          : "border-border-strong text-text"
                      }`}
                    >
                      {option.name}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="flex flex-col gap-2.5 border-0 p-0">
              <legend className="mb-1 text-[13px] font-semibold text-text-muted">Stylist, soonest free first</legend>
              {soonestFree.length === 0 ? (
                <p className="text-sm text-text-muted">No stylists free for this service today.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {soonestFree.map((option) => {
                    const stylistName = stylists.find((s) => s.id === option.stylistId)?.name ?? "";
                    const selected = option.stylistId === stylistId;
                    return (
                      <button
                        key={option.stylistId}
                        type="button"
                        disabled={!option.soonestFree}
                        aria-pressed={selected}
                        onClick={() => selectStylist(option.stylistId)}
                        className={`flex flex-col gap-0.5 rounded-2xl border px-3.5 py-3 text-left disabled:cursor-not-allowed ${
                          selected
                            ? "border-2 border-primary bg-primary-tint"
                            : option.soonestFree
                              ? "border-border-strong"
                              : "border-transparent bg-disabled-bg"
                        }`}
                      >
                        <span className={`text-sm font-bold ${selected ? "text-primary-dark" : option.soonestFree ? "text-text" : "text-disabled-text"}`}>
                          {stylistName}
                        </span>
                        <span className={`text-xs ${selected ? "text-primary-dark" : "text-text-muted"}`}>
                          {option.soonestFree ? `Free at ${formatLagosClockTime(option.soonestFree)}` : "Fully booked today"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </fieldset>

            <fieldset className="flex flex-col gap-2.5 border-0 p-0">
              <legend className="mb-1 text-[13px] font-semibold text-text-muted">Time</legend>
              <div className="flex flex-wrap gap-2">
                {availableTimes.map((time, index) => {
                  const selected = selectedTime?.getTime() === time.getTime();
                  return (
                    <button
                      key={time.toISOString()}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setTimeOverride(time)}
                      className={`flex min-h-[42px] items-center rounded-full border px-4 text-sm ${
                        selected
                          ? "border-2 border-primary bg-primary-tint font-bold text-primary-dark"
                          : "border-border-strong text-text"
                      }`}
                    >
                      {formatLagosClockTime(time)}
                      {index === 0 ? " · first free" : ""}
                    </button>
                  );
                })}
                <Link
                  href="/book"
                  className="flex min-h-[42px] items-center rounded-full border border-dashed border-border-strong px-4 text-sm font-semibold text-primary"
                >
                  Another day
                </Link>
              </div>
            </fieldset>

            {state.error && (
              <p role="alert" className="text-sm font-semibold text-danger-text">
                {state.error}
              </p>
            )}
          </form>

          <aside className="w-full min-w-0 flex-1 rounded-card bg-brand-navy p-5.5 text-white sm:w-[300px] sm:flex-none">
            <div className="text-[13px] font-semibold text-nav-muted">Booking summary</div>
            <div className="mt-1.5 text-xl font-extrabold">{name || "—"}</div>
            <div className="mt-3 flex flex-col gap-2.5 text-sm">
              <SummaryRow
                label="Service"
                value={service ? `${service.name} · ${formatDurationLabel(service.minDurationMinutes, service.maxDurationMinutes)}` : "—"}
              />
              <SummaryRow label="Stylist" value={selectedStylistName || "—"} />
              <SummaryRow label="When" value={selectedTime ? `Today, ${formatLagosClockTime(selectedTime)}` : "—"} />
              <div className="h-px bg-[#2A4470]" />
              <SummaryRow label="Price" value={service ? formatNaira(service.priceKobo) : "—"} />
              <SummaryRow
                label="Deposit"
                value={source === "WALK_IN" ? "None, walk-in" : service ? `${formatNaira(depositKobo)}, sent by SMS` : "—"}
              />
              {source === "PHONE" && service && <SummaryRow label="Pay at salon" value={formatNaira(payAtSalonKobo)} />}
            </div>
            <button
              type="submit"
              form="new-booking-form"
              disabled={!canSubmit}
              className="mt-3 flex min-h-[52px] w-full items-center justify-center rounded-full bg-accent text-[15px] font-extrabold text-brand-navy disabled:opacity-50"
            >
              {pending ? "Adding…" : "Add to schedule"}
            </button>
            <div className="mt-2 text-center text-xs text-nav-muted">
              {source === "WALK_IN"
                ? "Walk-ins served right away are checked in automatically."
                : "A deposit link will be texted once this is sent (M8)."}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-nav-muted">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
