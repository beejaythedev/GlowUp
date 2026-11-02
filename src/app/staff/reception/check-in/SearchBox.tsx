"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const DEBOUNCE_MS = 200;

/** Updates the `q` search param as the receptionist types, debounced so every keystroke doesn't refetch. */
export function SearchBox({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  function handleChange(next: string) {
    setValue(next);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (next) params.set("q", next);
      router.replace(`/staff/reception/check-in${params.size ? `?${params}` : ""}`, { scroll: false });
    }, DEBOUNCE_MS);
  }

  return (
    <label className="flex min-h-[60px] items-center gap-3 rounded-full border-2 border-primary bg-surface px-5">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" className="flex-none text-primary">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
      <span className="sr-only">Search today&apos;s bookings by name, phone or service</span>
      <input
        type="search"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Name, phone number or service"
        autoFocus
        className="min-w-0 flex-1 border-0 bg-transparent text-lg font-semibold text-text outline-none"
      />
    </label>
  );
}
