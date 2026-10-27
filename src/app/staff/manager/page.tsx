import type { Metadata } from "next";
import { StaffSectionPlaceholder } from "@/components/staff/StaffSectionPlaceholder";
import { requireStaffSection } from "@/server/auth/requireStaffSection";

export const metadata: Metadata = {
  title: "Manager — GlowUp Salons",
};

// Reads the session cookie on every request.
export const instant = false;

export default async function ManagerTodayPage() {
  const staff = await requireStaffSection("manager");

  return (
    <StaffSectionPlaceholder
      staffName={staff.name}
      roleLabel={staff.role}
      sectionTitle="Branch today"
      builtInMilestone="M7"
    />
  );
}
