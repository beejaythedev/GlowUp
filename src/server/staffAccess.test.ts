import { describe, expect, it } from "vitest";
import { canManageStaffMember, formatRoleLabel, formatStaffStatusLabel, roleRequiresBranch } from "./staffAccess";

describe("formatRoleLabel", () => {
  it("labels every role", () => {
    expect(formatRoleLabel("STYLIST")).toBe("Stylist");
    expect(formatRoleLabel("RECEPTIONIST")).toBe("Receptionist");
    expect(formatRoleLabel("BRANCH_MANAGER")).toBe("Branch manager");
    expect(formatRoleLabel("OWNER")).toBe("Owner");
  });
});

describe("formatStaffStatusLabel", () => {
  it("labels every status", () => {
    expect(formatStaffStatusLabel("ACTIVE")).toBe("Active");
    expect(formatStaffStatusLabel("INVITED")).toBe("Invite sent");
    expect(formatStaffStatusLabel("REMOVED")).toBe("Access removed");
  });
});

describe("roleRequiresBranch", () => {
  it("is true for every role except owner", () => {
    expect(roleRequiresBranch("STYLIST")).toBe(true);
    expect(roleRequiresBranch("RECEPTIONIST")).toBe(true);
    expect(roleRequiresBranch("BRANCH_MANAGER")).toBe(true);
    expect(roleRequiresBranch("OWNER")).toBe(false);
  });
});

describe("canManageStaffMember", () => {
  it("disallows acting on your own account", () => {
    expect(canManageStaffMember("staff_1", "staff_1")).toBe(false);
  });

  it("allows acting on someone else's account", () => {
    expect(canManageStaffMember("staff_1", "staff_2")).toBe(true);
  });
});
