import type { ReactNode } from "react";

export interface StaffShellProps {
  roleLabel: string;
  branchName?: string;
  staffName: string;
  signOutHref: string;
  children: ReactNode;
}

export function StaffShell({
  roleLabel,
  branchName,
  staffName,
  signOutHref,
  children,
}: StaffShellProps) {
  const initial = staffName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-bg text-text">
      <nav className="flex flex-wrap items-center justify-between gap-3 bg-brand-navy px-6 py-3 text-white">
        <div className="flex flex-wrap items-center gap-3.5">
          <span className="text-xl font-extrabold tracking-tight">GlowUp</span>
          <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-bold">
            {roleLabel}
          </span>
          {branchName && (
            <span className="text-sm text-nav-muted">{branchName}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-extrabold text-brand-navy">
            {initial}
          </span>
          <span className="text-sm">{staffName}</span>
          <a
            href={signOutHref}
            className="min-h-11 content-center text-sm text-nav-muted hover:text-white"
          >
            Sign out
          </a>
        </div>
      </nav>
      <main className="mx-auto max-w-[1360px] px-6 py-6">{children}</main>
    </div>
  );
}
