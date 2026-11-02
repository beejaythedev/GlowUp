import { describe, expect, it } from "vitest";
import { roleHomePath } from "./roleHome";

describe("roleHomePath", () => {
  it.each([
    ["RECEPTIONIST", "/staff/reception"],
    ["STYLIST", "/staff/stylist"],
    ["BRANCH_MANAGER", "/staff/manager"],
    ["OWNER", "/staff/owner"],
  ] as const)("maps %s to %s", (role, path) => {
    expect(roleHomePath(role)).toBe(path);
  });
});
