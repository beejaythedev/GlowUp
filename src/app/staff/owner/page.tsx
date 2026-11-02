import type { Metadata } from "next";
import { StaffSectionPlaceholder } from "@/components/staff/StaffSectionPlaceholder";
import { requireStaffSection } from "@/server/auth/requireStaffSection";

export const metadata: Metadata = {
  title: "Owner overview — GlowUp Salons",
};

// Reads the session cookie on every request.
export const instant = false;

export default async function OwnerOverviewPage() {
  const staff = await requireStaffSection("owner");

  return (
    <StaffSectionPlaceholder
      staffName={staff.name}
      roleLabel={staff.role}
      sectionTitle="Owner overview"
      builtInMilestone="M7"
    />
  );
}
