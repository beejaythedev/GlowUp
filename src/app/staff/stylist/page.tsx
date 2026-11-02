import type { Metadata } from "next";
import { StaffSectionPlaceholder } from "@/components/staff/StaffSectionPlaceholder";
import { requireStaffSection } from "@/server/auth/requireStaffSection";

export const metadata: Metadata = {
  title: "Today — GlowUp Salons",
};

// Reads the session cookie on every request.
export const instant = false;

export default async function StylistTodayPage() {
  const staff = await requireStaffSection("stylist");

  return (
    <StaffSectionPlaceholder
      staffName={staff.name}
      roleLabel={staff.role}
      sectionTitle="Today's appointments"
      builtInMilestone="M6"
    />
  );
}
