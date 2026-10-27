import Link from "next/link";
import type { Metadata } from "next";
import { CustomerShell } from "@/components/layout/CustomerShell";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Welcome — GlowUp Salons",
};

function CalendarIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3l8 4v5c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V7z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.9 1.9 0 003.4 0" />
    </svg>
  );
}

const features = [
  {
    icon: <CalendarIcon />,
    iconBg: "bg-primary-tint",
    iconColor: "text-primary",
    title: "Live availability",
    description: "Only real open slots, never double-booked",
  },
  {
    icon: <ShieldCheckIcon />,
    iconBg: "bg-success-tint",
    iconColor: "text-success-text",
    title: "Small, safe deposit",
    description: "20% to hold your slot, refundable up to 24 hrs",
  },
  {
    icon: <BellIcon />,
    iconBg: "bg-accent/15",
    iconColor: "text-accent",
    title: "Reminders by SMS",
    description: "So you never miss your appointment",
  },
];

export default function WelcomePage() {
  return (
    <CustomerShell>
      <div className="relative overflow-hidden rounded-b-[32px] bg-brand-navy px-6 pt-7 pb-10">
        <div
          aria-hidden="true"
          className="absolute -top-10 -right-[60px] h-[220px] w-[220px] rounded-full bg-primary"
        />
        <div
          aria-hidden="true"
          className="absolute top-[120px] right-[70px] h-[90px] w-[90px] rounded-full bg-accent"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-[70px] -left-10 h-[160px] w-[160px] rounded-full border-2 border-[#2A4470]"
        />
        <div className="relative text-[22px] font-extrabold tracking-tight text-white">
          GlowUp
        </div>
        <div className="relative mt-[136px] flex flex-col gap-3.5">
          <h1 className="text-4xl leading-tight font-extrabold tracking-tight text-white">
            Book your next glow in two minutes.
          </h1>
          <p className="text-[15px] leading-relaxed text-nav-muted">
            No calls, no waiting on hold. Pick your service, stylist and time
            at any of our four branches.
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-[18px] px-6 pt-7">
        {features.map((feature) => (
          <div key={feature.title} className="flex items-center gap-3.5">
            <div
              className={`flex h-11 w-11 flex-none items-center justify-center rounded-2xl ${feature.iconBg} ${feature.iconColor}`}
            >
              {feature.icon}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] font-bold">{feature.title}</span>
              <span className="text-[13px] text-text-muted">
                {feature.description}
              </span>
            </div>
          </div>
        ))}
      </div>

      <footer className="flex flex-col gap-3.5 px-6 pt-4 pb-7">
        <Button href="/book" size="lg" className="gap-2.5">
          Book an appointment
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Button>
        <div className="text-center text-sm text-text-muted">
          GlowUp staff?{" "}
          <Link href="/staff/sign-in" className="font-bold text-primary">
            Sign in
          </Link>
        </div>
      </footer>
    </CustomerShell>
  );
}
