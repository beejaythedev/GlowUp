import type { Metadata } from "next";
import { StaffSectionPlaceholder } from "@/components/staff/StaffSectionPlaceholder";
import { requireStaffSection } from "@/server/auth/requireStaffSection";

export const metadata: Metadata = {
  title: "Reception — GlowUp Salons",
};

// Reads the session cookie on every request.
export const instant = false;

export default async function ReceptionPage() {
  const staff = await requireStaffSection("reception");

  return (
    <StaffSectionPlaceholder
      staffName={staff.name}
      roleLabel={staff.role}
      sectionTitle="Today's schedule"
      builtInMilestone="M5"
    />
  );
}
