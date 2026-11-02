import type { StaffRole } from "@/generated/prisma/enums";

/**
 * Where a staff member lands after signing in (docs/ARCHITECTURE.md's planned
 * route layout). The destinations themselves are placeholders until M5–M7
 * build the real reception/stylist/manager/owner screens at these same paths.
 */
export function roleHomePath(role: StaffRole): string {
  switch (role) {
    case "RECEPTIONIST":
      return "/staff/reception";
    case "STYLIST":
      return "/staff/stylist";
    case "BRANCH_MANAGER":
      return "/staff/manager";
    case "OWNER":
      return "/staff/owner";
    default: {
      const exhaustive: never = role;
      throw new Error(`Unhandled staff role: ${exhaustive}`);
    }
  }
}
