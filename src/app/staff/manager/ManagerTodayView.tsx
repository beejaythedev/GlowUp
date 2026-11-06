import { signOut } from "@/app/staff/actions";
import { AutoRefresh } from "@/components/staff/AutoRefresh";
import { StatusBadge, type StatusBadgeStatus } from "@/components/ui/StatusBadge";
import { formatLagosClockTime } from "@/lib/lagosTime";
import { formatNaira } from "@/lib/money";
import type { DaySummary } from "@/server/schedule";
import type { ManagerBooking, ManagerMoneySummary } from "@/server/managerToday";
import { getDisplayStatus, getWaitMinutes, type DisplayStatus } from "@/server/status";

export interface ManagerTodayViewProps {
  staffName: string;
  branchName: string;
  dateLabel: string;
  nowLabel: string;
  now: Date;
  bookings: ManagerBooking[];
  daySummary: DaySummary;
  advanceCount: number;
  walkInCount: number;
  money: ManagerMoneySummary;
}

const REFRESH_INTERVAL_MS = 30_000;

const statusBadgeFor: Record<DisplayStatus, StatusBadgeStatus | null> = {
  booked: "booked",
  checkedInEarly: "checkedInEarly",
  waiting: "waiting",
  inService: "inService",
  done: "done",
  noShow: "noShow",
  cancelled: null,
};

export function ManagerTodayView(props: ManagerTodayViewProps) {
  const { staffName, branchName, dateLabel, nowLabel, now, bookings, daySummary, advanceCount, walkInCount, money } = props;
  const visibleBookings = bookings.filter((b) => b.status !== "CANCELLED");

  return (
    <div className="min-h-screen bg-bg text-text">
      <AutoRefresh intervalMs={REFRESH_INTERVAL_MS} />

      <nav className="flex flex-wrap items-center justify-between gap-3 bg-brand-navy px-6 py-3 text-white">
        <div className="flex flex-wrap items-center gap-3.5">
          <span className="text-xl font-extrabold tracking-tight">GlowUp</span>
          <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-bold">Manager</span>
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
          <h1 className="text-[28px] font-extrabold tracking-tight">Today at {branchName}</h1>
          <p className="text-sm text-text-muted">
            {dateLabel} · updated live · {nowLabel}
          </p>
        </header>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
          <Tile label="Bookings today" value={String(daySummary.bookingsToday)} sub={`${advanceCount} booked ahead · ${walkInCount} walk-in`} />
          <Tile
            label="Waiting now"
            value={String(daySummary.checkedInWaitingCount)}
            sub={daySummary.longestWaitMinutes !== null ? `Longest ${daySummary.longestWaitMinutes} min · goal under 15` : "Nobody waiting"}
            tone="warning"
          />
          <Tile label="No-shows" value={String(daySummary.noShowCount)} sub="Deposit kept" />
          <Tile label="Deposits received" value={formatNaira(money.depositsReceivedKobo)} sub={`From ${money.depositsReceivedCount} bookings`} tone="navy" />
        </div>

        <div className="flex flex-wrap items-start gap-5">
          <section className="min-w-0 flex-[999_1_560px] rounded-card border border-border bg-surface p-1.5 pb-1.5">
            <div className="flex items-center justify-between px-3.5 py-2.5">
              <h2 className="text-[17px] font-extrabold">Today&apos;s bookings</h2>
              <span className="text-[13px] text-text-muted">{visibleBookings.length} bookings</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-text-muted">
                    <th className="px-3.5 py-3">Time</th>
                    <th className="px-3.5 py-3">Customer</th>
                    <th className="px-3.5 py-3">Service</th>
                    <th className="px-3.5 py-3">Stylist</th>
                    <th className="px-3.5 py-3">Status</th>
                    <th className="px-3.5 py-3 text-right">Deposit</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleBookings.map((booking) => (
                    <BookingRow key={booking.id} booking={booking} now={now} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="min-w-0 flex-[1_1_300px] rounded-card border border-border bg-surface p-5">
            <h2 className="text-[17px] font-extrabold">Money today</h2>
            <div className="mt-3.5 flex flex-col gap-2.5 text-sm">
              <MoneyRow label="Deposits paid" value={formatNaira(money.depositsReceivedKobo)} />
              <MoneyRow label="of which kept from no-shows" value={formatNaira(money.keptFromNoShowsKobo)} muted />
              <MoneyRow label="Refunded (cancelled in time)" value={formatNaira(money.refundedKobo)} muted />
              <div className="h-px bg-border" />
              <MoneyRow label="Expected at the till" value={formatNaira(money.expectedAtTillKobo)} bold />
              <p className="text-xs leading-relaxed text-text-muted">
                Balances after deposits, plus full price for walk-ins. Compare with card and cash takings at closing.
              </p>
            </div>
            <a
              href="/staff/manager/day-report"
              className="mt-3.5 flex min-h-[46px] items-center justify-center rounded-full border border-border-strong text-sm font-bold text-text"
            >
              Download day report
            </a>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Tile({ label, value, sub, tone = "default" }: { label: string; value: string; sub: string; tone?: "default" | "warning" | "navy" }) {
  const toneClasses = {
    default: "border border-border bg-surface",
    warning: "border border-warning-border bg-warning-tint text-warning-text",
    navy: "bg-brand-navy text-white",
  }[tone];
  return (
    <div className={`flex flex-col gap-1 rounded-card px-4 py-4 ${toneClasses}`}>
      <span className={`text-[13px] ${tone === "default" ? "text-text-muted" : ""}`}>{label}</span>
      <span className="text-[30px] font-extrabold tracking-tight">{value}</span>
      <span className={`text-xs ${tone === "default" ? "text-text-muted" : "opacity-90"}`}>{sub}</span>
    </div>
  );
}

function MoneyRow({ label, value, muted = false, bold = false }: { label: string; value: string; muted?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-text-muted">{label}</span>
      <span className={bold ? "text-base font-extrabold" : muted ? "font-semibold" : "font-bold"}>{value}</span>
    </div>
  );
}

function BookingRow({ booking, now }: { booking: ManagerBooking; now: Date }) {
  const displayStatus = getDisplayStatus(booking, now);
  const badgeStatus = statusBadgeFor[displayStatus];
  const label = statusLabel(displayStatus, booking, now);

  return (
    <tr className="border-b border-border">
      <td className="px-3.5 py-3 font-bold">{formatLagosClockTime(booking.startsAt)}</td>
      <td className="px-3.5 py-3">{booking.customerName}</td>
      <td className="px-3.5 py-3">{booking.serviceName}</td>
      <td className="px-3.5 py-3">{booking.stylistName}</td>
      <td className="px-3.5 py-3">{badgeStatus && <StatusBadge status={badgeStatus}>{label}</StatusBadge>}</td>
      <td className="px-3.5 py-3 text-right">{depositLabel(booking)}</td>
    </tr>
  );
}

function statusLabel(displayStatus: DisplayStatus, booking: ManagerBooking, now: Date): string {
  if (displayStatus === "waiting" && booking.checkedInAt) {
    const minutes = getWaitMinutes({ checkedInAt: booking.checkedInAt, appointmentStart: booking.startsAt, comparedTo: now });
    return `Waiting ${minutes} min`;
  }
  const labels: Record<DisplayStatus, string> = {
    booked: "Booked",
    checkedInEarly: "Checked in",
    waiting: "Waiting",
    inService: "In service",
    done: "Done",
    noShow: "No-show",
    cancelled: "Cancelled",
  };
  return labels[displayStatus];
}

function depositLabel(booking: ManagerBooking): string {
  if (booking.source === "WALK_IN" && booking.depositAmountKobo === 0) return "Walk-in";
  const amount = formatNaira(booking.depositAmountKobo);
  return booking.depositStatus === "KEPT" ? `${amount} kept` : amount;
}
