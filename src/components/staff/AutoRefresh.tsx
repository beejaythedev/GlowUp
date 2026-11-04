"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-fetches the current server component's data on an interval — no visual output. */
export function AutoRefresh({ intervalMs }: { intervalMs: number }) {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(interval);
  }, [router, intervalMs]);

  return null;
}
