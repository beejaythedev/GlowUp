import { redirect } from "next/navigation";
import type { Staff } from "@/generated/prisma/client";
import { canAccessStaffSection, type StaffSection } from "@/server/permissions";
import { getCurrentStaff } from "./currentStaff";
import { roleHomePath } from "./roleHome";

/**
 * Guards a `/staff/<section>` page: redirects to sign-in if nobody's signed
 * in, or to the signed-in staff member's own section if they're signed in
 * but this isn't it (docs/CLAUDE.md rule 3 — permissions enforced server-side,
 * not by hiding navigation).
 */
export async function requireStaffSection(section: StaffSection): Promise<Staff> {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/staff/sign-in");
  if (!canAccessStaffSection(staff, section)) redirect(roleHomePath(staff.role));
  return staff;
}
