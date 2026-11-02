import Link from "next/link";
import { signOut } from "@/app/staff/actions";
import { BookingPanel, type SelectedBooking } from "../BookingPanel";
import { highlightMatch } from "@/server/checkInSearch";
import { SearchBox } from "./SearchBox";

export interface SearchResult {
  bookingId: string;
  timeLabel: string;
  relativeLabel: string;
  customerName: string;
  serviceName: string;
  stylistName: string;
  maskedPhone: string;
  depositPaid: boolean;
}

export interface CheckInSearchViewProps {
  staffName: string;
  branchName: string;
  dateLabel: string;
  nowLabel: string;
  query: string;
  results: SearchResult[];
  selectedBookingId: string | null;
  selectedBooking: SelectedBooking | null;
}

export function CheckInSearchView(props: CheckInSearchViewProps) {
  const { staffName, branchName, dateLabel, nowLabel, query, results, selectedBookingId, selectedBooking } = props;

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

      <main className="mx-auto flex max-w-[1360px] flex-col gap-5 p-6">
        <header className="flex flex-col gap-1.5">
          <Link
            href="/staff/reception"
            className="inline-flex min-h-8 items-center gap-1.5 text-sm font-semibold text-text"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" />
            </svg>
            Back to schedule
          </Link>
          <h1 className="text-[28px] font-extrabold tracking-tight">Check in a customer</h1>
          <p className="text-sm text-text-muted">
            {dateLabel} · Now {nowLabel}
          </p>
        </header>

        <SearchBox initialQuery={query} />

        <div className="flex flex-wrap items-start gap-5">
          <section aria-label="Search results" className="min-w-0 flex-[999_1_520px] flex flex-col gap-2.5">
            {results.length === 0 ? (
              <p className="rounded-card border border-border bg-surface p-5 text-sm text-text-muted">
                No matching bookings not yet checked in today.
              </p>
            ) : (
              results.map((result) => (
                <ResultRow key={result.bookingId} result={result} query={query} selected={result.bookingId === selectedBookingId} />
              ))
            )}
            <p className="px-1.5 text-[13px] text-text-muted">
              Showing today&apos;s bookings only. Try a phone number if the booking was made by someone else.
            </p>
          </section>

          <aside className="w-full min-w-0 flex-1 sm:w-[320px] sm:flex-none">
            {selectedBooking ? (
              <BookingPanel key={selectedBooking.bookingId} booking={selectedBooking} />
            ) : (
              <div className="rounded-card border border-dashed border-border-strong bg-surface p-5 text-sm text-text-muted">
                Search or pick a result to check someone in.
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

function ResultRow({ result, query, selected }: { result: SearchResult; query: string; selected: boolean }) {
  const nameSegments = highlightMatch(result.customerName, query);

  return (
    <Link
      href={`/staff/reception/check-in?${new URLSearchParams({ ...(query ? { q: query } : {}), bookingId: result.bookingId })}`}
      scroll={false}
      className={`flex flex-wrap items-center gap-4 rounded-card border bg-surface p-4 ${
        selected ? "border-2 border-primary" : "border-border"
      }`}
    >
      <div className="flex w-16 flex-none flex-col">
        <span className="text-lg font-extrabold">{result.timeLabel}</span>
        <span className="text-xs text-text-muted">{result.relativeLabel}</span>
      </div>
      <div className="flex min-w-[220px] flex-1 flex-col gap-0.5">
        <span className="text-base font-bold">
          {nameSegments.map((segment, i) =>
            segment.matched ? <mark key={i} className="rounded bg-warning-border/60">{segment.text}</mark> : <span key={i}>{segment.text}</span>,
          )}
        </span>
        <span className="text-[13px] text-text-muted">
          {result.serviceName} · {result.stylistName} · {result.maskedPhone}
        </span>
      </div>
      <span className="rounded-[10px] bg-primary-tint px-2.5 py-1 text-xs font-bold text-primary-dark">
        Booked · deposit {result.depositPaid ? "paid" : "pending"}
      </span>
    </Link>
  );
}
