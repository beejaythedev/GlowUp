import type { ReactNode } from "react";

/**
 * Visual styles for every status shown to users (docs/DESIGN.md, Booking statuses).
 * "checkedInEarly" and "waiting" are both derived display states for CHECKED_IN
 * (docs/PRD.md) — the badge only renders the style, callers pass the label text.
 */
export type StatusBadgeStatus =
  | "booked"
  | "checkedInEarly"
  | "waiting"
  | "inService"
  | "done"
  | "noShow"
  | "requested";

const statusStyles: Record<StatusBadgeStatus, string> = {
  booked: "bg-primary-tint text-primary-dark",
  checkedInEarly: "bg-success-tint text-success-text",
  waiting: "border border-warning-border bg-warning-tint text-warning-text",
  inService: "bg-primary text-white",
  done: "bg-disabled-bg text-disabled-text",
  noShow: "border border-dashed border-danger-border bg-surface text-danger-text",
  requested: "border border-border bg-surface text-primary-dark",
};

export interface StatusBadgeProps {
  status: StatusBadgeStatus;
  children: ReactNode;
  className?: string;
}

export function StatusBadge({
  status,
  children,
  className = "",
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${statusStyles[status]} ${className}`}
    >
      {children}
    </span>
  );
}
