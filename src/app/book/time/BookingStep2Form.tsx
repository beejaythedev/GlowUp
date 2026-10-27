"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CustomerShell } from "@/components/layout/CustomerShell";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { formatLagosClockTime } from "@/lib/lagosTime";
import { formatNaira } from "@/lib/money";
import { calculateDepositKobo } from "@/server/money";
import {
  getAvailableSlots,
  type AvailabilityBooking,
  type AvailabilityStylist,
} from "@/server/availability";

export interface StylistOption {
  id: string;
  name: string;
}

export interface DayOption {
  label: string; // "Mon", "Tue", ...
  dayNumber: number;
  dateLabel: string; // "Sat 31 Oct"
  opensAt: Date | null;
  closesAt: Date | null;
  stylists: { id: string; name: string; bookings: AvailabilityBooking[] }[];
}

export interface BookingStep2FormProps {
  branchId: string;
  serviceId: string;
  serviceName: string;
  priceKobo: number;
  depositPercent: number;
  minDurationMinutes: number;
  maxDurationMinutes: number;
  prepMinutes: number;
  stylists: StylistOption[];
  days: DayOption[];
}

const SERVICE_NAILS_ONLY_IRRELEVANT_HERE = false; // already validated compatible server-side

/** Which of these stylists actually covers `time` (short-blocking "any" lens). */
function resolveStylistForTime(
  stylists: AvailabilityStylist[],
  service: BookingStep2FormProps,
  openingHours: { opensAt: Date; closesAt: Date },
  now: Date,
  time: Date,
): string | undefined {
  return stylists.find((stylist) =>
    getAvailableSlots({
      openingHours,
      service: {
        minDurationMinutes: service.minDurationMinutes,
        maxDurationMinutes: service.maxDurationMinutes,
        prepMinutes: service.prepMinutes,
        nailsOnly: SERVICE_NAILS_ONLY_IRRELEVANT_HERE,
      },
      branchOffersNails: true,
      selection: { stylistId: stylist.id },
      stylists: [stylist],
      now,
    }).some((slot) => slot.getTime() === time.getTime()),
  )?.id;
}

export function BookingStep2Form(props: BookingStep2FormProps) {
  const { branchId, serviceId, serviceName, priceKobo, depositPercent, stylists, days } = props;

  const [dayIndex, setDayIndex] = useState(0);
  const [stylistSelection, setStylistSelection] = useState<"any" | string>("any");
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);

  const day = days[dayIndex];
  const now = useMemo(() => new Date(), []);

  const availableTimes = useMemo(() => {
    if (!day.opensAt || !day.closesAt) return [];
    return getAvailableSlots({
      openingHours: { opensAt: day.opensAt, closesAt: day.closesAt },
      service: {
        minDurationMinutes: props.minDurationMinutes,
        maxDurationMinutes: props.maxDurationMinutes,
        prepMinutes: props.prepMinutes,
        nailsOnly: SERVICE_NAILS_ONLY_IRRELEVANT_HERE,
      },
      branchOffersNails: true,
      selection: stylistSelection === "any" ? "any" : { stylistId: stylistSelection },
      stylists: day.stylists,
      now,
    });
  }, [day, stylistSelection, now, props.minDurationMinutes, props.maxDurationMinutes, props.prepMinutes]);

  function selectDay(index: number) {
    setDayIndex(index);
    setSelectedTime(null);
  }

  function selectStylist(selection: "any" | string) {
    setStylistSelection(selection);
    setSelectedTime(null);
  }

  const depositKobo = calculateDepositKobo({ priceKobo, depositPercent, source: "ONLINE" });
  const isRanged = props.minDurationMinutes !== props.maxDurationMinutes;

  let continueHref: string | undefined;
  if (selectedTime && day.opensAt && day.closesAt) {
    const resolvedStylistId =
      stylistSelection === "any"
        ? resolveStylistForTime(day.stylists, props, { opensAt: day.opensAt, closesAt: day.closesAt }, now, selectedTime)
        : stylistSelection;
    if (resolvedStylistId) {
      const params = new URLSearchParams({
        branchId,
        serviceId,
        stylistId: resolvedStylistId,
        stylistRequested: String(stylistSelection !== "any"),
        startsAt: selectedTime.toISOString(),
      });
      continueHref = `/book/review?${params.toString()}`;
    }
  }

  return (
    <CustomerShell>
      <header className="flex flex-col gap-4 px-5 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <Link
            href="/book"
            aria-label="Back"
            className="-ml-3 flex h-11 w-11 items-center justify-center text-text"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </Link>
          <div className="text-[13px] text-text-muted">Step 2 of 3</div>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <div className="h-1 rounded-full bg-primary" />
          <div className="h-1 rounded-full bg-primary" />
          <div className="h-1 rounded-full bg-border" />
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          Pick a stylist and time
        </h1>
      </header>

      <div className="flex flex-col gap-2 px-5">
        <div className="text-[13px] font-semibold text-text-muted">Stylist</div>
        <div className="flex flex-wrap gap-2">
          <Chip selected={stylistSelection === "any"} onClick={() => selectStylist("any")}>
            Any available
          </Chip>
          {stylists.map((stylist) => (
            <Chip
              key={stylist.id}
              selected={stylistSelection === stylist.id}
              onClick={() => selectStylist(stylist.id)}
            >
              {stylist.name}
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 px-5 pt-5">
        <div className="text-[13px] font-semibold text-text-muted">Date</div>
        <div className="grid grid-cols-6 gap-1.5">
          {days.map((d, index) => {
            const selected = index === dayIndex;
            return (
              <button
                key={d.dateLabel}
                type="button"
                aria-pressed={selected}
                onClick={() => selectDay(index)}
                className={`flex min-h-[60px] flex-col items-center justify-center gap-0.5 rounded-2xl border ${
                  selected
                    ? "border-2 border-primary bg-primary text-white"
                    : "border-border bg-surface"
                }`}
              >
                <span className={`text-[11px] ${selected ? "text-primary-tint" : "text-text-muted"}`}>
                  {d.label}
                </span>
                <span className="text-base font-semibold">{d.dayNumber}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 px-5 pt-5">
        <div className="text-[13px] font-semibold text-text-muted">
          Available times, {day.dateLabel}
        </div>
        {!day.opensAt || !day.closesAt ? (
          <p className="rounded-2xl border border-border bg-surface p-3.5 text-sm text-text-muted">
            Closed this day. Pick another date.
          </p>
        ) : availableTimes.length === 0 ? (
          <p className="rounded-2xl border border-border bg-surface p-3.5 text-sm text-text-muted">
            No times left. Pick another date.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {availableTimes.map((time) => {
              const selected = selectedTime?.getTime() === time.getTime();
              return (
                <button
                  key={time.toISOString()}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSelectedTime(time)}
                  className={`flex min-h-12 items-center justify-center rounded-2xl border text-[15px] ${
                    selected
                      ? "border-2 border-primary bg-primary-tint font-bold text-primary-dark"
                      : "border-border bg-surface font-medium"
                  }`}
                >
                  {formatLagosClockTime(time)}
                </button>
              );
            })}
          </div>
        )}

        {isRanged && day.opensAt && day.closesAt && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-border bg-surface p-3.5 text-[13px] leading-relaxed text-text-muted">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 flex-none text-primary">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            <span>
              {serviceName} takes {formatHours(props.minDurationMinutes)}–
              {formatHours(props.maxDurationMinutes)} hours, so the last start time is{" "}
              {formatLagosClockTime(
                new Date(day.closesAt.getTime() - props.maxDurationMinutes * 60_000),
              )}
              .
            </span>
          </div>
        )}
      </div>

      <footer className="flex flex-col gap-2.5 border-t border-border bg-surface px-5 py-4">
        <div className="flex justify-between text-[13px] text-text-muted">
          <span>
            {serviceName} · {day.dateLabel}
            {selectedTime ? `, ${formatLagosClockTime(selectedTime)}` : ""}
          </span>
          <span>{formatNaira(depositKobo)}</span>
        </div>
        {continueHref ? (
          <Button href={continueHref} size="lg">
            Continue
          </Button>
        ) : (
          <Button size="lg" disabled>
            Continue
          </Button>
        )}
      </footer>
    </CustomerShell>
  );
}

function formatHours(minutes: number): string {
  return minutes % 60 === 0 ? `${minutes / 60}` : `${(minutes / 60).toFixed(1)}`;
}
