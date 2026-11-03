import Link from "next/link";
import { AutoRefresh } from "@/components/staff/AutoRefresh";
import { signOut } from "@/app/staff/actions";
import type { DisplayStatus } from "@/server/status";
import type {
  DaySummary,
  ScheduleBlock,
  SchedulePrepBlock,
  ScheduleHourMark,
} from "@/server/schedule";
import { BookingPanel, type SelectedBooking } from "./BookingPanel";
import { CheckInPromptModal, type OverduePrompt } from "./CheckInPromptModal";

export type { SelectedBooking };

export interface StylistColumn {
  stylistId: string;
  stylistName: string;
  statusLine: string;
  blocks: (ScheduleBlock & { timeLabel: string })[];
  prepBlocks: SchedulePrepBlock[];
}

export interface ReceptionScheduleViewProps {
  staffName: string;
  branchName: string;
  dateLabel: string;
  nowLabel: string;
  summary: DaySummary;
  columns: StylistColumn[];
  gridHeightPx: number;
  hourMarks: ScheduleHourMark[];
  nowLineTopPx: number | null;
  isOpenToday: boolean;
  selectedBookingId: string | null;
  selectedBooking: SelectedBooking | null;
  overduePrompts: OverduePrompt[];
}

const REFRESH_INTERVAL_MS = 30_000;

const blockStyles: Record<DisplayStatus, string> = {
  booked: "bg-primary-tint text-primary-dark border border-primary/20",
  checkedInEarly: "bg-success-tint text-success-text border border-success-text/20",
  waiting: "bg-warning-tint text-warning-text border border-warning-border",
  inService: "bg-primary text-white",
  done: "bg-disabled-bg text-disabled-text",
  noShow: "bg-surface text-danger-text border border-dashed border-danger-border",
  cancelled: "hidden",
};

export function ReceptionScheduleView(props: ReceptionScheduleViewProps) {
  const {
    staffName, branchName, dateLabel, nowLabel, summary,
    columns, gridHeightPx, hourMarks, nowLineTopPx, isOpenToday,
    selectedBookingId, selectedBooking, overduePrompts,
  } = props;

  return (
    <div className="min-h-screen bg-bg text-text">
      <AutoRefresh intervalMs={REFRESH_INTERVAL_MS} />
      <CheckInPromptModal prompts={overduePrompts} />

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
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[28px] font-extrabold tracking-tight">Today&apos;s schedule</h1>
            <p className="text-sm text-text-muted">
              {dateLabel} · Now {nowLabel}
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link
              href="/staff/reception/check-in"
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-border-strong bg-surface px-5 text-sm font-bold text-text"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              Check in a customer
            </Link>
            <Link
              href="/staff/reception/new"
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-white"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              New booking
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryTile label="Bookings today" value={String(summary.bookingsToday)} />
          <SummaryTile
            label="Checked in, waiting"
            value={
              summary.checkedInWaitingCount > 0
                ? `${summary.checkedInWaitingCount} · ${summary.longestWaitMinutes} min`
                : String(summary.checkedInWaitingCount)
            }
            tone={summary.checkedInWaitingCount > 0 ? "warning" : "neutral"}
          />
          <SummaryTile label="In service" value={String(summary.inServiceCount)} />
          <SummaryTile label="No-shows" value={String(summary.noShowCount)} />
        </div>

        <div className="flex flex-wrap items-start gap-5">
          <section
            aria-label="Stylist schedule"
            className="min-w-0 flex-[999_1_560px] overflow-x-auto rounded-card border border-border bg-surface"
          >
            {!isOpenToday || columns.length === 0 ? (
              <p className="p-6 text-sm text-text-muted">
                {!isOpenToday ? "The branch is closed today." : "No stylists at this branch yet."}
              </p>
            ) : (
              <div style={{ minWidth: `${64 + columns.length * 180}px` }}>
                <div
                  className="grid border-b border-border"
                  style={{ gridTemplateColumns: `64px repeat(${columns.length}, minmax(0, 1fr))` }}
                >
                  <div />
                  {columns.map((column) => (
                    <div key={column.stylistId} className="border-l border-border p-3">
                      <div className="text-sm font-bold">{column.stylistName}</div>
                      <div className="text-xs text-text-muted">{column.statusLine}</div>
                    </div>
                  ))}
                </div>

                <div
                  className="relative grid"
                  style={{
                    gridTemplateColumns: `64px repeat(${columns.length}, minmax(0, 1fr))`,
                    height: `${gridHeightPx}px`,
                    backgroundImage:
                      "repeating-linear-gradient(to bottom, var(--color-border) 0, var(--color-border) 1px, transparent 1px, transparent 100px)",
                  }}
                >
                  <div className="relative text-xs text-text-muted">
                    {hourMarks.map((mark) => (
                      <span
                        key={mark.label + mark.topPx}
                        className="absolute right-2.5"
                        style={{ top: `${mark.topPx - 6}px` }}
                      >
                        {mark.label}
                      </span>
                    ))}
                  </div>

                  {columns.map((column) => (
                    <div key={column.stylistId} className="relative border-l border-border">
                      {column.blocks.map((block) => (
                        <Link
                          key={block.bookingId}
                          href={`/staff/reception?bookingId=${block.bookingId}`}
                          scroll={false}
                          aria-current={block.bookingId === selectedBookingId}
                          className={`absolute left-1.5 right-1.5 flex flex-col gap-0.5 overflow-hidden rounded-xl p-2.5 text-xs ${blockStyles[block.displayStatus]} ${
                            block.bookingId === selectedBookingId ? "ring-2 ring-text ring-offset-1" : ""
                          }`}
                          style={{ top: `${block.topPx}px`, height: `${block.heightPx}px` }}
                        >
                          <span className="opacity-85">{block.timeLabel}</span>
                          <span className="font-bold">
                            {block.customerName}
                            {block.isWalkIn ? <span className="font-medium"> (walk-in)</span> : null}
                          </span>
                          <span>{block.serviceName}</span>
                        </Link>
                      ))}
                      {column.prepBlocks.map((prep, index) => (
                        <div
                          key={index}
                          className="schedule-prep absolute left-1.5 right-1.5 flex items-center overflow-hidden rounded-md pl-2 text-[11px] text-text-muted"
                          style={{ top: `${prep.topPx}px`, height: `${prep.heightPx}px` }}
                        >
                          {prep.heightPx >= 18 ? "Prep" : null}
                        </div>
                      ))}
                    </div>
                  ))}

                  {nowLineTopPx !== null && (
                    <>
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute right-0 left-14 h-0.5 bg-now-line"
                        style={{ top: `${nowLineTopPx}px` }}
                      />
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute left-[50px] h-3 w-3 rounded-full bg-now-line"
                        style={{ top: `${nowLineTopPx - 6}px` }}
                      />
                    </>
                  )}
                </div>
              </div>
            )}
          </section>

          <aside className="flex w-full min-w-0 flex-1 flex-col gap-4 sm:w-[300px] sm:flex-none">
            {selectedBooking ? (
              <BookingPanel key={selectedBooking.bookingId} booking={selectedBooking} />
            ) : (
              <div className="rounded-card border border-dashed border-border-strong bg-surface p-5 text-sm text-text-muted">
                Select a booking from the schedule to see its details.
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 rounded-card border border-border bg-surface p-5 text-[13px]">
              <LegendSwatch className="border border-primary/20 bg-primary-tint" label="Booked" />
              <LegendSwatch className="border border-warning-border bg-warning-tint" label="Checked in, waiting" />
              <LegendSwatch className="bg-primary" label="In service" />
              <LegendSwatch className="bg-disabled-bg" label="Done" />
              <LegendSwatch className="border border-dashed border-danger-border" label="No-show" />
              <LegendSwatch className="schedule-prep" label="Prep time" />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "warning";
}) {
  const toneClasses =
    tone === "warning"
      ? "border-warning-border bg-warning-tint text-warning-text"
      : "border-border bg-surface text-text";
  return (
    <div className={`rounded-card border px-4 py-3.5 ${toneClasses}`}>
      <div className={`text-[13px] ${tone === "warning" ? "text-warning-text" : "text-text-muted"}`}>
        {label}
      </div>
      <div className="text-2xl font-extrabold">{value}</div>
    </div>
  );
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`h-3.5 w-3.5 flex-none rounded ${className}`} />
      {label}
    </span>
  );
}
