import { describe, expect, it } from "vitest";
import { balanceDueKobo, calculateDepositKobo } from "./money";

describe("calculateDepositKobo", () => {
  it("is 20% of the price for an online booking", () => {
    // ₦25,000 knotless braids, 20% deposit → ₦5,000.
    expect(
      calculateDepositKobo({ priceKobo: 2_500_000, depositPercent: 20, source: "ONLINE" }),
    ).toBe(500_000);
  });

  it("is 20% of the price for a phone booking", () => {
    expect(
      calculateDepositKobo({ priceKobo: 800_000, depositPercent: 20, source: "PHONE" }),
    ).toBe(160_000);
  });

  it("is zero for a walk-in, regardless of price", () => {
    expect(
      calculateDepositKobo({ priceKobo: 800_000, depositPercent: 20, source: "WALK_IN" }),
    ).toBe(0);
  });

  it("rounds to the nearest whole naira", () => {
    // ₦500.50 at 10% = ₦50.05 → rounds to ₦50.
    expect(
      calculateDepositKobo({ priceKobo: 50_050, depositPercent: 10, source: "ONLINE" }),
    ).toBe(5_000);
  });
});

describe("balanceDueKobo", () => {
  it("subtracts the deposit from the price", () => {
    expect(balanceDueKobo(2_500_000, 500_000)).toBe(2_000_000);
  });

  it("is the full price when no deposit was paid (walk-in)", () => {
    expect(balanceDueKobo(800_000, 0)).toBe(800_000);
  });
});
