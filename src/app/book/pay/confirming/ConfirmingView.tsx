"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CustomerShell } from "@/components/layout/CustomerShell";
import { Button } from "@/components/ui/Button";

const POLL_INTERVAL_MS = 1500;
const GIVE_UP_AFTER_MS = 20_000;

export function ConfirmingView({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();

    async function poll() {
      if (cancelled) return;
      try {
        const response = await fetch(`/api/bookings/${bookingId}/status`);
        if (response.ok) {
          const data = await response.json();
          if (data.depositStatus === "PAID") {
            router.push(`/book/confirmed?bookingId=${bookingId}`);
            return;
          }
        }
      } catch {
        // Keep polling — a single failed request shouldn't give up early.
      }
      if (Date.now() - startedAt > GIVE_UP_AFTER_MS) {
        setTimedOut(true);
        return;
      }
      setTimeout(poll, POLL_INTERVAL_MS);
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [bookingId, router]);

  return (
    <CustomerShell>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        {timedOut ? (
          <>
            <h1 className="text-xl font-bold">Still confirming your payment</h1>
            <p className="text-sm text-text-muted">
              This is taking longer than usual. If you completed payment, it should confirm shortly —
              refresh this page to check again.
            </p>
            <Button onClick={() => window.location.reload()}>Refresh</Button>
          </>
        ) : (
          <>
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-tint border-t-primary" />
            <h1 className="text-xl font-bold">Confirming your payment…</h1>
            <p className="text-sm text-text-muted">This usually only takes a few seconds.</p>
          </>
        )}
      </div>
    </CustomerShell>
  );
}
