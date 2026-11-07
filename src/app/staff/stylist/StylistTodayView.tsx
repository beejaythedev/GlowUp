"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signOut } from "@/app/staff/actions";
import { AutoRefresh } from "@/components/staff/AutoRefresh";
import { formatLagosClockTime } from "@/lib/lagosTime";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  getEarlierBookings,
  getFooterNote,
  getHeadline,
  getNowChipLabel,
  getPrepWindow,
  type CurrentCard,
  type StylistBooking,
} from "@/server/stylistToday";
import { performStylistAction, type StylistActionState } from "./actions";

export interface StylistTodayViewProps {
  staffName: string;
  dateLabel: string;
  nowLabel: string;
  now: Date;
  bookings: StylistBooking[];
  card: CurrentCard;
}

const REFRESH_INTERVAL_MS = 30_000;

const initialState: StylistActionState = {};

export function StylistTodayView(props: StylistTodayViewProps) {
  const { staffName, dateLabel, nowLabel, now, bookings, card } = props;
  const [state, formAction, pending] = useActionState(performStylistAction, initialState);

  const earlier = getEarlierBookings(bookings, card.booking?.id ?? null);
  const footerNote = getFooterNote(card, bookings);
  const prepWindow = card.booking ? getPrepWindow(card.booking, now) : null;
  const headline = getHeadline(card, bookings.length > 0);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-bg text-text">
      <AutoRefresh intervalMs={REFRESH_INTERVAL_MS} />

      <header className="flex flex-col gap-4 rounded-b-[28px] bg-brand-navy px-5 pb-[22px] pt-5 text-white">
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
          <div className="text-sm text-nav-muted">
            Hi, {staffName.split(" ")[0]} · {nowLabel}
          </div>
          <h1 className="text-[26px] font-extrabold leading-tight tracking-tight">{headline}</h1>
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-[22px] bg-white/10 p-1">
          <span className="flex min-h-10 items-center justify-center rounded-[18px] bg-white text-sm font-bold text-brand-navy">
            Today, {dateLabel}
          </span>
          <Link
            href="/staff/stylist/tomorrow"
            className="flex min-h-10 items-center justify-center rounded-[18px] text-sm font-semibold text-nav-muted"
          >
            Tomorrow
          </Link>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-3 px-5 pt-[18px]">
        {state.error && (
          <p role="alert" className="text-sm font-semibold text-danger-text">
            {state.error}
          </p>
        )}

        {card.booking && (
          <div
            className={`flex flex-col gap-3.5 rounded-[20px] border-2 bg-surface p-[18px] ${
              card.kind === "next" ? "border-border" : "border-primary"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-primary">{card.kind === "next" ? "NEXT" : "NOW"}</span>
              <NowChip booking={card.booking} now={now} />
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-[22px] font-extrabold tracking-tight">{card.booking.customerName}</div>
              <div className="text-[15px] text-text-muted">
                {card.booking.serviceName} · {formatRange(card.booking.startsAt, card.booking.endsAt)}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Tag tone={card.booking.depositStatus === "PAID" ? "success" : "warning"}>
                {card.booking.depositStatus === "PAID" ? "Deposit paid" : "Deposit not paid yet"}
              </Tag>
              {card.booking.isFirstVisit && <Tag tone="primary">First visit</Tag>}
            </div>

            {card.kind === "waiting" || card.kind === "inService" ? (
              <form action={formAction} className="flex flex-col gap-1.5">
                <input type="hidden" name="bookingId" value={card.booking.id} />
                <input type="hidden" name="action" value={card.kind === "waiting" ? "START" : "FINISH"} />
                <button
                  type="submit"
                  disabled={pending}
                  className="flex min-h-[60px] items-center justify-center gap-2.5 rounded-[30px] bg-primary text-[17px] font-extrabold text-white disabled:opacity-50"
                >
                  {card.kind === "waiting" ? "Start service" : "Finish service"}
                </button>
                <div className="text-center text-xs text-text-muted">
                  {card.kind === "waiting"
                    ? "The button changes to Finish service once you start."
                    : "The schedule updates as soon as you tap this."}
                </div>
              </form>
            ) : (
              <div className="text-center text-xs text-text-muted">
                Waiting for reception to check {card.booking.customerName.split(" ")[0]} in.
              </div>
            )}
          </div>
        )}

        {(earlier.length > 0 || prepWindow) && (
          <>
            <div className="mt-1 text-[13px] font-bold text-text-muted">Earlier today</div>
            <div className="flex flex-col gap-2">
              {earlier.map((booking) => (
                <EarlierCard key={booking.id} booking={booking} />
              ))}
              {prepWindow && (
                <div className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-surface px-3.5 py-3">
                  <span className="text-sm text-text-muted">Prep after {card.booking!.serviceName.toLowerCase()}</span>
                  <span className="text-sm font-bold">{formatRange(prepWindow.startsAt, prepWindow.endsAt)}</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {footerNote && (
        <footer className="flex items-center gap-2.5 px-5 py-6 text-[13px] text-text-muted">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-none text-primary">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          <span>{footerNote}</span>
        </footer>
      )}
    </div>
  );
}

function NowChip({ booking, now }: { booking: StylistBooking; now: Date }) {
  const label = getNowChipLabel(booking, now);
  if (booking.status === "IN_SERVICE") return <StatusBadge status="inService">{label}</StatusBadge>;
  if (booking.status === "CHECKED_IN") {
    const status = now < booking.startsAt ? "checkedInEarly" : "waiting";
    return <StatusBadge status={status}>{label}</StatusBadge>;
  }
  return <StatusBadge status="booked">{label}</StatusBadge>;
}

function EarlierCard({ booking }: { booking: StylistBooking }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-border bg-surface px-3.5 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[15px] font-bold">
          {booking.serviceName} · {booking.customerName.split(" ")[0]}
        </span>
        <StatusBadge status={booking.status === "DONE" ? "done" : "noShow"}>
          {booking.status === "DONE" ? "Done" : "No-show"}
        </StatusBadge>
      </div>
      <div className="text-[13px] text-text-muted">{formatRange(booking.startsAt, booking.endsAt)}</div>
    </div>
  );
}

function Tag({ tone, children }: { tone: "success" | "warning" | "primary"; children: string }) {
  const toneClasses = {
    success: "bg-success-tint text-success-text",
    warning: "bg-warning-tint text-warning-text",
    primary: "bg-primary-tint text-primary-dark",
  }[tone];
  return <span className={`rounded-[10px] px-2 py-1 text-[11px] font-bold ${toneClasses}`}>{children}</span>;
}

function formatRange(startsAt: Date, endsAt: Date): string {
  return `${formatLagosClockTime(startsAt)} – ${formatLagosClockTime(endsAt)}`;
}
