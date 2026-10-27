"use client";

import { useMemo, useState } from "react";
import { CustomerShell } from "@/components/layout/CustomerShell";
import { Button } from "@/components/ui/Button";
import { formatDurationLabel } from "@/lib/duration";
import { formatNaira } from "@/lib/money";

export interface BranchOption {
  id: string;
  name: string;
  offersNails: boolean;
  hoursLabel: string;
}

export interface ServiceOption {
  id: string;
  name: string;
  priceKobo: number;
  minDurationMinutes: number;
  maxDurationMinutes: number;
  nailsOnly: boolean;
  depositKobo: number;
}

export interface BookingStep1FormProps {
  branches: BranchOption[];
  services: ServiceOption[];
}

export function BookingStep1Form({ branches, services }: BookingStep1FormProps) {
  const [branchId, setBranchId] = useState(branches[0]?.id);
  const [serviceId, setServiceId] = useState<string | undefined>(undefined);
  const [pickingBranch, setPickingBranch] = useState(false);

  const branch = branches.find((b) => b.id === branchId);
  const availableServices = useMemo(
    () => services.filter((service) => !service.nailsOnly || branch?.offersNails),
    [services, branch],
  );
  const selectedService = availableServices.find((s) => s.id === serviceId);

  function selectBranch(id: string) {
    setBranchId(id);
    setServiceId(undefined); // a service that's nails-only may no longer be offered
    setPickingBranch(false);
  }

  return (
    <CustomerShell>
      <header className="flex flex-col gap-4 px-5 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div className="text-xl font-bold tracking-tight text-primary">
            GlowUp
          </div>
          <div className="text-sm text-text-muted">Step 1 of 3</div>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <div className="h-1 rounded-full bg-primary" />
          <div className="h-1 rounded-full bg-border" />
          <div className="h-1 rounded-full bg-border" />
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          Book an appointment
        </h1>
      </header>

      <div className="flex flex-col gap-2 px-5">
        <div className="text-[13px] font-semibold text-text-muted">Branch</div>
        <button
          type="button"
          onClick={() => setPickingBranch((open) => !open)}
          aria-expanded={pickingBranch}
          className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-3.5 py-2.5"
        >
          <span className="flex flex-col gap-0.5 text-left">
            <span className="text-[15px] font-semibold">{branch?.name}</span>
            <span className="text-xs text-text-muted">{branch?.hoursLabel}</span>
          </span>
          <span className="text-sm font-semibold text-primary">
            {pickingBranch ? "Close" : "Change"}
          </span>
        </button>
        {pickingBranch && (
          <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-2">
            {branches.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={option.id === branchId}
                onClick={() => selectBranch(option.id)}
                className={`flex min-h-11 flex-col gap-0.5 rounded-xl px-3 py-2 text-left ${
                  option.id === branchId
                    ? "bg-primary-tint text-primary-dark"
                    : "hover:bg-bg"
                }`}
              >
                <span className="text-[15px] font-semibold">{option.name}</span>
                <span className="text-xs text-text-muted">{option.hoursLabel}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 px-5 pt-5">
        <div className="text-[13px] font-semibold text-text-muted">
          Choose a service
        </div>
        <div className="flex flex-col gap-2">
          {availableServices.map((service) => {
            const selected = service.id === serviceId;
            return (
              <button
                key={service.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setServiceId(service.id)}
                className={`flex min-h-[54px] items-center justify-between gap-3 rounded-2xl border px-3.5 py-2 ${
                  selected
                    ? "border-2 border-primary bg-primary-tint text-primary-dark"
                    : "border-border bg-surface"
                }`}
              >
                <span className="flex flex-col gap-0.5 text-left">
                  <span className="text-[15px] font-semibold">{service.name}</span>
                  <span className="text-xs">
                    {formatDurationLabel(service.minDurationMinutes, service.maxDurationMinutes)}{" "}
                    · {formatNaira(service.depositKobo)} deposit
                  </span>
                </span>
                <span className="text-[15px] font-bold">
                  {formatNaira(service.priceKobo)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <footer className="flex flex-col gap-2.5 border-t border-border bg-surface px-5 py-4">
        <div className="flex justify-between text-[13px] text-text-muted">
          <span>{selectedService?.name ?? "Choose a service to continue"}</span>
          {selectedService && (
            <span>{formatNaira(selectedService.depositKobo)} deposit today</span>
          )}
        </div>
        {selectedService && branch ? (
          <Button
            href={`/book/time?branchId=${branch.id}&serviceId=${selectedService.id}`}
            size="lg"
          >
            Continue
          </Button>
        ) : (
          <Button size="lg" disabled>
            Continue
          </Button>
        )}
      </footer>
    </CustomerShell>
  );
}
