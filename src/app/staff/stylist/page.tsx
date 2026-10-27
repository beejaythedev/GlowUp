import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { StaffSectionPlaceholder } from "@/components/staff/StaffSectionPlaceholder";
import { getCurrentStaff } from "@/server/auth/currentStaff";

export const metadata: Metadata = {
  title: "Today — GlowUp Salons",
};

// Reads the session cookie on every request.
export const instant = false;

export default async function StylistTodayPage() {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/staff/sign-in");

  return (
    <StaffSectionPlaceholder
      staffName={staff.name}
      roleLabel={staff.role}
      sectionTitle="Today's appointments"
      builtInMilestone="M6"
    />
  );
}
