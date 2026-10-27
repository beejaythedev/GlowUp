import { CustomerShell } from "@/components/layout/CustomerShell";

export interface ConfirmedScreenProps {
  customerFirstName: string;
  depositLabel: string;
  maskedPhone: string;
  serviceName: string;
  whenLabel: string;
  branchName: string;
  branchAddress: string;
  payAtSalonLabel: string;
  bookingReference: string;
  arriveByLabel: string;
}

export function ConfirmedScreen(props: ConfirmedScreenProps) {
  const {
    customerFirstName, depositLabel, maskedPhone, serviceName, whenLabel,
    branchName, branchAddress, payAtSalonLabel, bookingReference, arriveByLabel,
  } = props;

  const directionsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branchAddress)}`;

  return (
    <CustomerShell>
      <header className="flex items-center px-5 pt-5">
        <div className="text-xl font-extrabold tracking-tight text-primary">GlowUp</div>
      </header>

      <div className="flex flex-col items-center gap-3.5 px-5 pt-8 text-center">
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-success-tint">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-success-text" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">You&apos;re booked, {customerFirstName}</h1>
        <p className="max-w-[300px] text-sm leading-relaxed text-text-muted">
          Your {depositLabel} deposit was received. We&apos;ve sent the details by SMS to{" "}
          {maskedPhone}.
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-5 pt-6">
        <div className="flex flex-col gap-2.5 rounded-2xl border border-border bg-surface p-3.5 text-sm">
          <SummaryRow label="Service" value={serviceName} />
          <SummaryRow label="When" value={whenLabel} />
          <SummaryRow label="Branch" value={branchName} />
          <SummaryRow label="Address" value={branchAddress} align="right" />
          <div className="h-px bg-border" />
          <SummaryRow label="Left to pay at the salon" value={payAtSalonLabel} bold />
          <SummaryRow label="Booking reference" value={bookingReference} />
        </div>

        <div className="flex items-start gap-2.5 rounded-2xl bg-primary-tint p-3.5 text-[13px] leading-relaxed text-primary-dark">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 flex-none">
            <path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.9 1.9 0 003.4 0" />
          </svg>
          <span>Please arrive by {arriveByLabel} so we can start on time.</span>
        </div>
      </div>

      <footer className="grid grid-cols-2 gap-2.5 px-5 py-6">
        <a
          href={directionsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-border-strong bg-surface text-sm font-semibold text-text"
        >
          Directions
        </a>
        <div className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-border-strong bg-surface text-sm font-semibold text-text-muted">
          Call branch
        </div>
      </footer>
    </CustomerShell>
  );
}

function SummaryRow({
  label,
  value,
  bold = false,
  align = "left",
}: {
  label: string;
  value: string;
  bold?: boolean;
  align?: "left" | "right";
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-text-muted">{label}</span>
      <span className={`font-semibold ${bold ? "font-bold" : ""} ${align === "right" ? "text-right" : ""}`}>
        {value}
      </span>
    </div>
  );
}
