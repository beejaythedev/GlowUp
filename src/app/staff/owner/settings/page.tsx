import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireStaffSection } from "@/server/auth/requireStaffSection";
import { countOfferedBranches } from "@/server/ownerSettings";
import { OwnerSettingsView } from "./OwnerSettingsView";

export const metadata: Metadata = {
  title: "Settings — GlowUp Salons",
};

// Reads live settings/services on every request.
export const instant = false;

export default async function OwnerSettingsPage() {
  const owner = await requireStaffSection("owner");

  const [services, branches, settings] = await Promise.all([
    db.service.findMany({ orderBy: { createdAt: "asc" } }),
    db.branch.findMany(),
    db.settings.findFirst(),
  ]);

  return (
    <OwnerSettingsView
      ownerName={owner.name}
      services={services.map((service) => ({
        id: service.id,
        name: service.name,
        minDurationMinutes: service.minDurationMinutes,
        maxDurationMinutes: service.maxDurationMinutes,
        priceKobo: service.priceKobo,
        prepMinutes: service.prepMinutes,
        nailsOnly: service.nailsOnly,
        offeredCount: countOfferedBranches(service, branches),
      }))}
      totalBranches={branches.length}
      settings={{
        depositPercent: settings?.depositPercent ?? 20,
        freeCancellationHours: settings?.freeCancellationHours ?? 24,
        arriveEarlyMinutes: settings?.arriveEarlyMinutes ?? 10,
        checkInPromptAfterMinutes: settings?.checkInPromptAfterMinutes ?? 15,
      }}
    />
  );
}
