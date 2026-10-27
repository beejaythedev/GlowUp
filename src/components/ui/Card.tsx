import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ className = "", children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-card border border-border bg-surface p-5 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
