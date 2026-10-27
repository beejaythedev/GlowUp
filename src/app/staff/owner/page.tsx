import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { StaffSectionPlaceholder } from "@/components/staff/StaffSectionPlaceholder";
import { getCurrentStaff } from "@/server/auth/currentStaff";

export const metadata: Metadata = {
  title: "Owner overview — GlowUp Salons",
};

// Reads the session cookie on every request.
export const instant = false;

export default async function OwnerOverviewPage() {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/staff/sign-in");

  return (
    <StaffSectionPlaceholder
      staffName={staff.name}
      roleLabel={staff.role}
      sectionTitle="Owner overview"
      builtInMilestone="M7"
    />
  );
}
