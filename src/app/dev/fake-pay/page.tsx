"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Stands in for Paystack's hosted checkout when no real API keys are
 * configured (`FakePaymentProvider`, M8-1) — lets local dev exercise the
 * exact same webhook → signature check → verify → confirmDeposit path a
 * real payment would, without a network call to Paystack.
 */
export default function FakePayPage() {
  const params = useSearchParams();
  const reference = params.get("reference") ?? "";
  const amountKobo = Number(params.get("amountKobo") ?? "0");
  const callbackUrl = params.get("callbackUrl") ?? "/";
  const [pending, setPending] = useState<"success" | "fail" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function paySuccessfully() {
    setPending("success");
    setError(null);
    try {
      const { FakePaymentProvider } = await import("@/server/payments/fake");
      const body = JSON.stringify({ event: "charge.success", data: { reference, amount: amountKobo } });
      const response = await fetch("/api/paystack/webhook", {
        method: "POST",
        headers: { "x-paystack-signature": FakePaymentProvider.sign(body) },
        body,
      });
      if (!response.ok) {
        setError("The fake webhook call failed — check the dev server console.");
        setPending(null);
        return;
      }
      window.location.href = callbackUrl;
    } catch {
      setError("Something went wrong simulating the payment.");
      setPending(null);
    }
  }

  function abandon() {
    setPending("fail");
    window.location.href = callbackUrl;
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-8">
      <h1 className="text-xl font-bold">Fake Paystack checkout (dev only)</h1>
      <p className="text-sm text-text-muted">
        No real Paystack keys are configured, so this stands in for their hosted page.
      </p>
      <div className="rounded-2xl border border-border p-4 text-sm">
        <div>Reference: {reference}</div>
        <div>Amount: ₦{(amountKobo / 100).toLocaleString()}</div>
      </div>
      {error && <p className="text-sm font-semibold text-danger-text">{error}</p>}
      <button
        type="button"
        onClick={paySuccessfully}
        disabled={pending !== null}
        className="min-h-12 rounded-full bg-primary px-6 font-bold text-white disabled:opacity-50"
      >
        {pending === "success" ? "Paying…" : "Simulate successful payment"}
      </button>
      <button
        type="button"
        onClick={abandon}
        disabled={pending !== null}
        className="min-h-12 rounded-full border border-border-strong px-6 font-bold text-text disabled:opacity-50"
      >
        Simulate abandoning the payment
      </button>
    </div>
  );
}
