import type { StaffRole, StaffStatus } from "@/generated/prisma/enums";

const ROLE_LABEL: Record<StaffRole, string> = {
  STYLIST: "Stylist",
  RECEPTIONIST: "Receptionist",
  BRANCH_MANAGER: "Branch manager",
  OWNER: "Owner",
};

export function formatRoleLabel(role: StaffRole): string {
  return ROLE_LABEL[role];
}

const STATUS_LABEL: Record<StaffStatus, string> = {
  ACTIVE: "Active",
  INVITED: "Invite sent",
  REMOVED: "Access removed",
};

export function formatStaffStatusLabel(status: StaffStatus): string {
  return STATUS_LABEL[status];
}

/** Every role except the owner is scoped to one branch (docs/PRD.md — the owner alone sees all four). */
export function roleRequiresBranch(role: StaffRole): boolean {
  return role !== "OWNER";
}

/**
 * An owner may not remove, restore or change the role/branch of their own
 * account from this screen — doing so could lock the business out of owner
 * access entirely, with nobody left who can undo it.
 */
export function canManageStaffMember(targetStaffId: string, actingStaffId: string): boolean {
  return targetStaffId !== actingStaffId;
}
