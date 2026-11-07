import { describe, expect, it } from "vitest";
import {
  countOfferedBranches,
  formatArriveEarlyLabel,
  formatOfferedAtLabel,
  formatPrepTimeLabel,
} from "./ownerSettings";

describe("formatPrepTimeLabel", () => {
  it("says None for zero", () => {
    expect(formatPrepTimeLabel(0)).toBe("None");
  });

  it("formats minutes otherwise", () => {
    expect(formatPrepTimeLabel(15)).toBe("15 min");
  });
});

describe("formatArriveEarlyLabel", () => {
  it("says on time for zero", () => {
    expect(formatArriveEarlyLabel(0)).toBe("On time");
  });

  it("formats minutes early otherwise", () => {
    expect(formatArriveEarlyLabel(10)).toBe("10 min early");
  });
});

describe("countOfferedBranches", () => {
  const branches = [{ offersNails: true }, { offersNails: true }, { offersNails: false }, { offersNails: false }];

  it("counts every branch for a regular service", () => {
    expect(countOfferedBranches({ nailsOnly: false }, branches)).toBe(4);
  });

  it("counts only the nail-service branches for a nails-only service", () => {
    expect(countOfferedBranches({ nailsOnly: true }, branches)).toBe(2);
  });
});

describe("formatOfferedAtLabel", () => {
  it("says All branches when every branch offers it", () => {
    expect(formatOfferedAtLabel(4, 4)).toBe("All branches");
  });

  it("pluralizes the branch count otherwise", () => {
    expect(formatOfferedAtLabel(2, 4)).toBe("2 branches");
  });

  it("uses singular for exactly one branch", () => {
    expect(formatOfferedAtLabel(1, 4)).toBe("1 branch");
  });
});
