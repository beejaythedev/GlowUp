import type { ReactNode } from "react";

/**
 * The mobile-first frame every customer (and staff sign-in) screen sits in.
 * On a phone it fills the viewport; from `sm` up it stops growing past a
 * comfortable reading width and sits as a centred card instead of stretching
 * mobile-sized content across a wide desktop screen.
 */
export function CustomerShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg sm:bg-border/40 sm:py-8">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-bg text-text sm:min-h-0 sm:max-w-xl sm:overflow-hidden sm:rounded-card sm:shadow-lg">
        {children}
      </div>
    </div>
  );
}
