import type { StaffRole } from "@/generated/prisma/enums";

export interface PermissionStaff {
  id: string;
  role: StaffRole;
  branchId: string | null;
}

export type StaffSection = "reception" | "stylist" | "manager" | "owner";

const SECTION_ROLE: Record<StaffSection, StaffRole> = {
  reception: "RECEPTIONIST",
  stylist: "STYLIST",
  manager: "BRANCH_MANAGER",
  owner: "OWNER",
};

/**
 * Which staff/<section> pages this staff member may open. The owner sees
 * everything (docs/CLAUDE.md rule 3); everyone else only their own role's
 * section.
 */
export function canAccessStaffSection(staff: PermissionStaff, section: StaffSection): boolean {
  if (staff.role === "OWNER") return true;
  return staff.role === SECTION_ROLE[section];
}

/**
 * Whether this staff member may see a given booking (docs/CLAUDE.md rule 3):
 * a stylist only their own bookings; a receptionist or branch manager only
 * their branch's bookings; the owner, everything.
 */
export function canViewBooking(
  staff: PermissionStaff,
  booking: { stylistId: string; branchId: string },
): boolean {
  switch (staff.role) {
    case "OWNER":
      return true;
    case "STYLIST":
      return staff.id === booking.stylistId;
    case "RECEPTIONIST":
    case "BRANCH_MANAGER":
      return staff.branchId === booking.branchId;
    default: {
      const exhaustive: never = staff.role;
      throw new Error(`Unhandled staff role: ${exhaustive}`);
    }
  }
}

/** Whether this staff member may see a given branch's data at all (schedules, reports, settings scoped to it). */
export function canViewBranch(staff: PermissionStaff, branchId: string): boolean {
  if (staff.role === "OWNER") return true;
  return staff.branchId === branchId;
}
