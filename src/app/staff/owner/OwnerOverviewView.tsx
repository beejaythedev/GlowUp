import Link from "next/link";
import { signOut } from "@/app/staff/actions";
import { formatNaira } from "@/lib/money";
import type { AttentionItem, BranchWeekStats, CompanySummary } from "@/server/ownerOverview";
import { getBranchStatus } from "@/server/ownerOverview";

export interface OwnerOverviewViewProps {
  staffName: string;
  weekLabel: string;
  branches: BranchWeekStats[];
  company: CompanySummary;
  attentionItems: AttentionItem[];
}

export function OwnerOverviewView(props: OwnerOverviewViewProps) {
  const { staffName, weekLabel, branches, company, attentionItems } = props;
  const maxBookings = Math.max(1, ...branches.map((b) => b.bookingsThisWeek));

  return (
    <div className="min-h-screen bg-bg text-text">
      <nav className="flex flex-wrap items-center justify-between gap-3 bg-brand-navy px-6 py-3 text-white">
        <div className="flex flex-wrap items-center gap-3.5">
          <span className="text-xl font-extrabold tracking-tight">GlowUp</span>
          <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-brand-navy">Owner</span>
          <span className="text-sm font-bold text-white">Overview</span>
          <Link href="/staff/owner/staff" className="text-sm text-nav-muted hover:text-white">
            Staff and access
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm">{staffName}</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-extrabold text-brand-navy">
            {staffName.charAt(0).toUpperCase()}
          </span>
          <form action={signOut}>
            <button type="submit" className="text-[13px] text-nav-muted hover:text-white">
              Sign out
            </button>
          </form>
        </div>
      </nav>

      <main className="mx-auto flex max-w-[1360px] flex-col gap-5 p-6">
        <header className="flex flex-col gap-1.5">
          <h1 className="text-[28px] font-extrabold tracking-tight">Good morning, {staffName.split(" ")[0]}</h1>
          <p className="text-sm text-text-muted">All four branches · this week, {weekLabel}</p>
        </header>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
          <Tile label="Bookings this week" value={String(company.bookingsThisWeek)} sub="Across 4 branches" tone="navy" />
          <Tile label="Booked online" value={`${company.onlineSharePercent}%`} sub="Target: at least 40%" />
          <Tile label="No-show rate" value={`${company.noShowRatePercent}%`} sub="Target under 10%" />
          <Tile label="Deposits received" value={formatNaira(company.depositsReceivedKobo)} sub="This week" />
        </div>

        <div className="flex flex-wrap items-start gap-5">
          <section className="min-w-0 flex-[999_1_560px] rounded-card border border-border bg-surface p-1.5 pb-1.5">
            <div className="px-3.5 py-2.5">
              <h2 className="text-[17px] font-extrabold">Branches compared</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-text-muted">
                    <th className="px-3.5 py-3">Branch</th>
                    <th className="px-3.5 py-3">Bookings (week)</th>
                    <th className="px-3.5 py-3">Waiting now</th>
                    <th className="px-3.5 py-3">Longest wait</th>
                    <th className="px-3.5 py-3">No-shows</th>
                    <th className="px-3.5 py-3">Deposits</th>
                    <th className="px-3.5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map((branch) => (
                    <BranchRow key={branch.branchId} branch={branch} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 px-3.5 py-4">
              <h3 className="text-sm font-bold text-text-muted">Bookings this week by branch</h3>
              <div className="grid grid-cols-[90px_minmax(0,1fr)_36px] items-center gap-x-3 gap-y-2.5 text-[13px]">
                {branches.map((branch) => (
                  <BarRow key={branch.branchId} branch={branch} maxBookings={maxBookings} />
                ))}
              </div>
            </div>
          </section>

          <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
            <div className="flex flex-col gap-3.5 rounded-card border border-border bg-surface p-5">
              <h2 className="text-[17px] font-extrabold">Needs your attention</h2>
              {attentionItems.length === 0 ? (
                <p className="text-sm text-text-muted">Nothing needs your attention right now.</p>
              ) : (
                attentionItems.map((item, index) => <AttentionRow key={index} item={item} />)
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Tile({ label, value, sub, tone = "default" }: { label: string; value: string; sub: string; tone?: "default" | "navy" }) {
  const toneClasses = tone === "navy" ? "bg-brand-navy text-white" : "border border-border bg-surface";
  return (
    <div className={`flex flex-col gap-1 rounded-card px-4 py-4 ${toneClasses}`}>
      <span className={`text-[13px] ${tone === "default" ? "text-text-muted" : "text-nav-muted"}`}>{label}</span>
      <span className="text-[30px] font-extrabold tracking-tight">{value}</span>
      <span className={`text-xs ${tone === "default" ? "text-text-muted" : "text-nav-muted"}`}>{sub}</span>
    </div>
  );
}

function BranchRow({ branch }: { branch: BranchWeekStats }) {
  const status = getBranchStatus(branch);
  const overGoal = status === "waitOver15";
  return (
    <tr className={`border-b border-border ${overGoal ? "bg-warning-tint/40" : ""}`}>
      <td className="px-3.5 py-3 font-bold">{branch.branchName}</td>
      <td className="px-3.5 py-3">{branch.bookingsThisWeek}</td>
      <td className={`px-3.5 py-3 ${overGoal ? "font-bold text-warning-text" : ""}`}>{branch.waitingNowCount}</td>
      <td className={`px-3.5 py-3 ${overGoal ? "font-bold text-warning-text" : ""}`}>
        {branch.longestWaitMinutes !== null ? `${branch.longestWaitMinutes} min` : "–"}
      </td>
      <td className="px-3.5 py-3">{branch.noShowCount}</td>
      <td className="px-3.5 py-3">{formatNaira(branch.depositsReceivedKobo)}</td>
      <td className="px-3.5 py-3">
        <span
          className={`rounded-[10px] px-2.5 py-1 text-xs font-bold ${
            overGoal ? "bg-warning-tint text-warning-text" : "bg-success-tint text-success-text"
          }`}
        >
          {overGoal ? "Wait over 15 min" : "On track"}
        </span>
      </td>
    </tr>
  );
}

function BarRow({ branch, maxBookings }: { branch: BranchWeekStats; maxBookings: number }) {
  const widthPercent = Math.round((branch.bookingsThisWeek / maxBookings) * 100);
  return (
    <>
      <span>{branch.branchName.replace("GlowUp ", "")}</span>
      <div className="h-3.5 rounded-full bg-disabled-bg">
        <div className="h-3.5 rounded-full bg-primary" style={{ width: `${widthPercent}%` }} />
      </div>
      <span className="text-right font-bold">{branch.bookingsThisWeek}</span>
    </>
  );
}

function AttentionRow({ item }: { item: AttentionItem }) {
  const isWarning = item.kind === "waiting";
  return (
    <div className="flex items-start gap-3">
      <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-xl ${isWarning ? "bg-warning-tint" : "bg-primary-tint"}`}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={isWarning ? "text-warning-text" : "text-primary-dark"}
        >
          {isWarning ? (
            <>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </>
          ) : (
            <>
              <rect x="3" y="6" width="18" height="13" rx="2" />
              <path d="M3 10h18" />
            </>
          )}
        </svg>
      </span>
      <p className="text-sm leading-relaxed">{item.message}</p>
    </div>
  );
}
