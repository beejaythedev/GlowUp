import type { ReactNode } from "react";

export function CustomerShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-bg text-text">
      {children}
    </div>
  );
}
