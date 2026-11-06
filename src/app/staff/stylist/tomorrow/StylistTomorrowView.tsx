"use client";

import Link from "next/link";
import { signOut } from "@/app/staff/actions";
import { formatLagosClockTime } from "@/lib/lagosTime";
import { formatDurationLabel, getTomorrowHeadline, summarizeTomorrow } from "@/server/stylistTomorrow";
import type { StylistBooking } from "@/server/stylistToday";

export interface StylistTomorrowViewProps {
  staffName: string;
  dateLabel: string;
  bookings: StylistBooking[];
}

export function StylistTomorrowView({ staffName, dateLabel, bookings }: StylistTomorrowViewProps) {
  const active = bookings
    .filter((b) => b.status !== "CANCELLED")
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const summary = summarizeTomorrow(bookings, formatLagosClockTime);
  const headline = getTomorrowHeadline(summary.clientCount);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-bg text-text">
      <header className="flex flex-col gap-4 rounded-b-[28px] bg-brand-navy px-5 pb-6 pt-5 text-white">
        <div className="flex items-center justify-between">
          <span className="text-lg font-extrabold tracking-tight">GlowUp</span>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-extrabold text-brand-navy">
              {staffName.charAt(0).toUpperCase()}
            </span>
            <form action={signOut}>
              <button type="submit" className="text-xs text-nav-muted hover:text-white">
                Sign out
              </button>
            </form>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-sm text-nav-muted">Hi, {staffName.split(" ")[0]}</div>
          <h1 className="text-[26px] font-extrabold leading-tight tracking-tight">{headline}</h1>
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-[22px] bg-white/10 p-1">
          <Link
            href="/staff/stylist"
            className="flex min-h-10 items-center justify-center rounded-[18px] text-sm font-semibold text-nav-muted"
          >
            Today
          </Link>
          <span className="flex min-h-10 items-center justify-center rounded-[18px] bg-white text-sm font-bold text-brand-navy">
            Tomorrow, {dateLabel}
          </span>
        </div>
      </header>

      {summary.clientCount > 0 && (
        <div className="grid grid-cols-3 gap-2 px-5 pt-[18px]">
          <SummaryTile value={String(summary.clientCount)} label="clients" />
          <SummaryTile value={summary.firstStartLabel!} label="first start" />
          <SummaryTile value={summary.finishLabel!} label="finish" />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2.5 px-5 pt-4">
        {active.length === 0 ? (
          <p className="pt-6 text-center text-sm text-text-muted">
            Nothing on the books yet — check back closer to tomorrow.
          </p>
        ) : (
          active.map((booking) => <TomorrowRow key={booking.id} booking={booking} />)
        )}
      </div>

      <footer className="flex items-center gap-2.5 px-5 py-6 text-[13px] text-text-muted">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-none text-primary">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
        <span>We&apos;ll text you if anything changes overnight.</span>
      </footer>
    </div>
  );
}

function SummaryTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-3 py-2.5">
      <div className="text-xl font-extrabold">{value}</div>
      <div className="text-xs text-text-muted">{label}</div>
    </div>
  );
}

function TomorrowRow({ booking }: { booking: StylistBooking }) {
  return (
    <div className="flex gap-3">
      <div className="w-12 flex-none pt-3.5 text-[13px] font-bold">{formatLagosClockTime(booking.startsAt)}</div>
      <div className="flex flex-1 flex-col gap-1.5 rounded-2xl border border-border bg-surface px-3.5 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[15px] font-bold">{booking.serviceName}</span>
          <span className="text-xs text-text-muted">{formatDurationLabel(booking.startsAt, booking.endsAt)}</span>
        </div>
        <div className="text-[13px] text-text-muted">
          {booking.customerName.split(" ")[0]} · ends {formatLagosClockTime(booking.endsAt)}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span
            className={`rounded-[10px] px-2 py-1 text-[11px] font-bold ${
              booking.depositStatus === "PAID" ? "bg-success-tint text-success-text" : "bg-warning-tint text-warning-text"
            }`}
          >
            {booking.depositStatus === "PAID" ? "Deposit paid" : "Deposit not paid yet"}
          </span>
          {booking.isFirstVisit && (
            <span className="rounded-[10px] bg-primary-tint px-2 py-1 text-[11px] font-bold text-primary-dark">
              First visit
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
