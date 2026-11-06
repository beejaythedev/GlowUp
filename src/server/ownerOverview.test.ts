import { describe, expect, it } from "vitest";
import {
  buildUnpaidPhoneDepositAttentionItem,
  buildWaitingAttentionItems,
  getBranchStatus,
  summarizeBranchWeek,
  summarizeCompanyWeek,
  type BranchWeekStats,
  type OwnerBooking,
} from "./ownerOverview";

const NOW = new Date("2026-10-28T10:00:00Z");

function booking(overrides: Partial<OwnerBooking> = {}): OwnerBooking {
  return {
    id: "b1",
    branchId: "lekki",
    startsAt: new Date("2026-10-28T09:00:00Z"),
    endsAt: new Date("2026-10-28T10:00:00Z"),
    status: "DONE",
    source: "ONLINE",
    depositAmountKobo: 1_600_00,
    depositStatus: "PAID",
    checkedInAt: new Date("2026-10-28T08:58:00Z"),
    ...overrides,
  };
}

function branchStats(overrides: Partial<BranchWeekStats> = {}): BranchWeekStats {
  return {
    branchId: "lekki",
    branchName: "GlowUp Lekki",
    bookingsThisWeek: 10,
    waitingNowCount: 0,
    longestWaitMinutes: null,
    noShowCount: 0,
    depositsReceivedKobo: 0,
    ...overrides,
  };
}

describe("summarizeBranchWeek", () => {
  it("counts active bookings and sums collected deposits", () => {
    const bookings = [
      booking({ id: "a", status: "DONE", depositStatus: "PAID", depositAmountKobo: 1_600_00 }),
      booking({ id: "b", status: "NO_SHOW", depositStatus: "KEPT", depositAmountKobo: 2_000_00 }),
      booking({ id: "c", status: "CANCELLED", depositStatus: "PAID", depositAmountKobo: 5_000_00 }),
    ];
    const stats = summarizeBranchWeek("lekki", "GlowUp Lekki", bookings, NOW);
    expect(stats.bookingsThisWeek).toBe(2); // cancelled excluded
    expect(stats.noShowCount).toBe(1);
    expect(stats.depositsReceivedKobo).toBe(1_600_00 + 2_000_00); // cancelled's deposit excluded too
  });

  it("finds the longest live wait among checked-in, waiting bookings", () => {
    const bookings = [
      booking({ id: "a", status: "CHECKED_IN", startsAt: new Date("2026-10-28T09:00:00Z"), checkedInAt: new Date("2026-10-28T09:05:00Z") }),
      booking({ id: "b", status: "CHECKED_IN", startsAt: new Date("2026-10-28T09:40:00Z"), checkedInAt: new Date("2026-10-28T09:41:00Z") }),
    ];
    const stats = summarizeBranchWeek("lekki", "GlowUp Lekki", bookings, NOW);
    expect(stats.waitingNowCount).toBe(2);
    expect(stats.longestWaitMinutes).toBe(55); // checked in 09:05 (after the 09:00 start), to 10:00
  });

  it("is null longest wait and zero waiting when nobody's waiting", () => {
    const stats = summarizeBranchWeek("lekki", "GlowUp Lekki", [booking({ status: "DONE" })], NOW);
    expect(stats.waitingNowCount).toBe(0);
    expect(stats.longestWaitMinutes).toBeNull();
  });
});

describe("getBranchStatus", () => {
  it("is on track with no wait", () => {
    expect(getBranchStatus(branchStats({ longestWaitMinutes: null }))).toBe("onTrack");
  });

  it("is on track at exactly the 15-minute goal", () => {
    expect(getBranchStatus(branchStats({ longestWaitMinutes: 15 }))).toBe("onTrack");
  });

  it("is over the goal past 15 minutes", () => {
    expect(getBranchStatus(branchStats({ longestWaitMinutes: 19 }))).toBe("waitOver15");
  });
});

describe("summarizeCompanyWeek", () => {
  it("rolls up branch totals and computes online share and no-show rate", () => {
    const branches = [
      branchStats({ branchId: "lekki", bookingsThisWeek: 2, noShowCount: 1, depositsReceivedKobo: 162_400_00 }),
      branchStats({ branchId: "ikeja", bookingsThisWeek: 1, noShowCount: 0, depositsReceivedKobo: 118_800_00 }),
    ];
    // Matches the branches' combined bookingsThisWeek (3), so the online share is meaningful.
    const bookings = [
      booking({ branchId: "lekki", source: "ONLINE" }),
      booking({ branchId: "lekki", source: "PHONE" }),
      booking({ branchId: "ikeja", source: "WALK_IN" }),
    ];
    const company = summarizeCompanyWeek(branches, bookings);
    expect(company.bookingsThisWeek).toBe(3);
    expect(company.onlineSharePercent).toBe(Math.round((1 / 3) * 100));
    expect(company.noShowRatePercent).toBe(Math.round((1 / 3) * 100));
    expect(company.depositsReceivedKobo).toBe(162_400_00 + 118_800_00);
  });

  it("is all zero with no branches", () => {
    expect(summarizeCompanyWeek([], [])).toEqual({
      bookingsThisWeek: 0,
      onlineSharePercent: 0,
      noShowRatePercent: 0,
      depositsReceivedKobo: 0,
    });
  });
});

describe("buildWaitingAttentionItems", () => {
  it("flags a branch whose longest wait is past the goal", () => {
    const branches = [
      branchStats({ branchName: "GlowUp Ikeja", waitingNowCount: 3, longestWaitMinutes: 19 }),
      branchStats({ branchName: "GlowUp Lekki", waitingNowCount: 1, longestWaitMinutes: 6 }),
    ];
    const items = buildWaitingAttentionItems(branches);
    expect(items).toEqual([
      { kind: "waiting", message: "GlowUp Ikeja: 3 customers waiting, the longest for 19 minutes." },
    ]);
  });

  it("is empty when every branch is on track", () => {
    expect(buildWaitingAttentionItems([branchStats({ longestWaitMinutes: 6 })])).toEqual([]);
  });
});

describe("buildUnpaidPhoneDepositAttentionItem", () => {
  it("is null with nothing unpaid", () => {
    expect(buildUnpaidPhoneDepositAttentionItem([])).toBeNull();
  });

  it("counts unpaid phone bookings", () => {
    const item = buildUnpaidPhoneDepositAttentionItem([booking({ id: "a" }), booking({ id: "b" }), booking({ id: "c" }), booking({ id: "d" })]);
    expect(item).toEqual({ kind: "unpaidPhoneDeposits", message: "4 phone bookings haven't paid their deposit yet." });
  });

  it("uses singular for exactly one", () => {
    const item = buildUnpaidPhoneDepositAttentionItem([booking()]);
    expect(item?.message).toBe("1 phone booking hasn't paid their deposit yet.");
  });
});
