import type { ButtonHTMLAttributes } from "react";

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

export function Chip({
  selected = false,
  className = "",
  children,
  type = "button",
  ...props
}: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        selected
          ? "border-2 border-primary bg-primary-tint text-primary-dark"
          : "border border-border text-text hover:border-border-strong"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
