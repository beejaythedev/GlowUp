import { describe, expect, it } from "vitest";
import { canAccessStaffSection, canViewBooking, canViewBranch } from "./permissions";

const stylistA = { id: "stylist_a", role: "STYLIST" as const, branchId: "lekki" };
const stylistB = { id: "stylist_b", role: "STYLIST" as const, branchId: "lekki" };
const receptionistLekki = { id: "r1", role: "RECEPTIONIST" as const, branchId: "lekki" };
const managerLekki = { id: "m1", role: "BRANCH_MANAGER" as const, branchId: "lekki" };
const managerIkeja = { id: "m2", role: "BRANCH_MANAGER" as const, branchId: "ikeja" };
const owner = { id: "o1", role: "OWNER" as const, branchId: null };

describe("canViewBooking", () => {
  it("a stylist can view their own booking", () => {
    const booking = { stylistId: stylistA.id, branchId: "lekki" };
    expect(canViewBooking(stylistA, booking)).toBe(true);
  });

  it("a stylist cannot view another stylist's booking", () => {
    const booking = { stylistId: stylistB.id, branchId: "lekki" };
    expect(canViewBooking(stylistA, booking)).toBe(false);
  });

  it("a receptionist can view any booking in their own branch", () => {
    const booking = { stylistId: stylistA.id, branchId: "lekki" };
    expect(canViewBooking(receptionistLekki, booking)).toBe(true);
  });

  it("a branch manager cannot view a booking from another branch", () => {
    const booking = { stylistId: stylistA.id, branchId: "ikeja" };
    expect(canViewBooking(managerLekki, booking)).toBe(false);
  });

  it("the owner can view any booking anywhere", () => {
    const booking = { stylistId: stylistA.id, branchId: "surulere" };
    expect(canViewBooking(owner, booking)).toBe(true);
  });
});

describe("canViewBranch", () => {
  it("a branch manager can view their own branch", () => {
    expect(canViewBranch(managerLekki, "lekki")).toBe(true);
  });

  it("a branch manager cannot view another branch", () => {
    expect(canViewBranch(managerIkeja, "lekki")).toBe(false);
  });

  it("the owner can view any branch", () => {
    expect(canViewBranch(owner, "yaba")).toBe(true);
  });
});

describe("canAccessStaffSection", () => {
  it("a stylist can access the stylist section only", () => {
    expect(canAccessStaffSection(stylistA, "stylist")).toBe(true);
    expect(canAccessStaffSection(stylistA, "reception")).toBe(false);
    expect(canAccessStaffSection(stylistA, "manager")).toBe(false);
    expect(canAccessStaffSection(stylistA, "owner")).toBe(false);
  });

  it("a receptionist can access the reception section only", () => {
    expect(canAccessStaffSection(receptionistLekki, "reception")).toBe(true);
    expect(canAccessStaffSection(receptionistLekki, "stylist")).toBe(false);
  });

  it("a branch manager can access the manager section only", () => {
    expect(canAccessStaffSection(managerLekki, "manager")).toBe(true);
    expect(canAccessStaffSection(managerLekki, "owner")).toBe(false);
  });

  it("the owner can access every section", () => {
    expect(canAccessStaffSection(owner, "reception")).toBe(true);
    expect(canAccessStaffSection(owner, "stylist")).toBe(true);
    expect(canAccessStaffSection(owner, "manager")).toBe(true);
    expect(canAccessStaffSection(owner, "owner")).toBe(true);
  });
});
