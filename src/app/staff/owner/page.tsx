import type { Metadata } from "next";
import { db } from "@/lib/db";
import { lagosWeekRange } from "@/lib/lagosTime";
import { requireStaffSection } from "@/server/auth/requireStaffSection";
import {
  buildUnpaidPhoneDepositAttentionItem,
  buildWaitingAttentionItems,
  summarizeBranchWeek,
  summarizeCompanyWeek,
  type AttentionItem,
} from "@/server/ownerOverview";
import { fetchCompanyWeekBookings, fetchUnpaidPhoneDepositBookings } from "./ownerData";
import { OwnerOverviewView } from "./OwnerOverviewView";

export const metadata: Metadata = {
  title: "Overview — GlowUp Salons",
};

// Reads live bookings/check-in state on every request (matches reception, M5-1).
export const instant = false;

export default async function OwnerOverviewPage() {
  const staff = await requireStaffSection("owner");

  const now = new Date();
  const week = lagosWeekRange(now);

  const branchList = await db.branch.findMany({ orderBy: { createdAt: "asc" } });
  const weekBookings = await fetchCompanyWeekBookings(week.start, week.end);

  const branches = branchList.map((branch) =>
    summarizeBranchWeek(
      branch.id,
      branch.name,
      weekBookings.filter((b) => b.branchId === branch.id),
      now,
    ),
  );
  const company = summarizeCompanyWeek(branches, weekBookings);

  const unpaidPhoneBookings = await fetchUnpaidPhoneDepositBookings(now);
  const attentionItems: AttentionItem[] = [
    ...buildWaitingAttentionItems(branches),
    buildUnpaidPhoneDepositAttentionItem(unpaidPhoneBookings),
  ].filter((item): item is AttentionItem => item !== null);

  return (
    <OwnerOverviewView
      staffName={staff.name}
      weekLabel={`${week.startLabel} – ${week.endLabel}`}
      branches={branches}
      company={company}
      attentionItems={attentionItems}
    />
  );
}
