import { describe, expect, it } from "vitest";
import { buildDayReportCsv, splitBySource, summarizeManagerMoney, type ManagerBooking } from "./managerToday";

function booking(overrides: Partial<ManagerBooking> = {}): ManagerBooking {
  return {
    id: "b1",
    startsAt: new Date("2026-10-31T08:00:00Z"),
    endsAt: new Date("2026-10-31T09:00:00Z"),
    customerName: "Bisi Adeyemi",
    serviceName: "Wash and set",
    stylistName: "Blessing",
    status: "DONE",
    source: "ONLINE",
    priceKobo: 8_000_00,
    depositAmountKobo: 1_600_00,
    depositStatus: "PAID",
    checkedInAt: new Date("2026-10-31T07:58:00Z"),
    ...overrides,
  };
}

describe("splitBySource", () => {
  it("counts walk-ins separately from online and phone bookings", () => {
    const bookings = [
      booking({ id: "a", source: "ONLINE" }),
      booking({ id: "b", source: "PHONE" }),
      booking({ id: "c", source: "WALK_IN" }),
      booking({ id: "d", source: "WALK_IN" }),
    ];
    expect(splitBySource(bookings)).toEqual({ advanceCount: 2, walkInCount: 2 });
  });

  it("excludes cancelled bookings", () => {
    const bookings = [booking({ id: "a", status: "CANCELLED" }), booking({ id: "b" })];
    expect(splitBySource(bookings)).toEqual({ advanceCount: 1, walkInCount: 0 });
  });
});

describe("summarizeManagerMoney", () => {
  it("sums deposits received, including kept ones, and computes expected at the till", () => {
    const bookings = [
      booking({ id: "done", status: "DONE", priceKobo: 8_000_00, depositAmountKobo: 1_600_00, depositStatus: "PAID" }),
      booking({ id: "noshow", status: "NO_SHOW", priceKobo: 8_000_00, depositAmountKobo: 1_600_00, depositStatus: "KEPT" }),
      booking({ id: "walkin", status: "DONE", source: "WALK_IN", priceKobo: 6_000_00, depositAmountKobo: 0, depositStatus: "NONE" }),
      booking({ id: "booked", status: "BOOKED", priceKobo: 12_000_00, depositAmountKobo: 2_400_00, depositStatus: "PAID" }),
    ];
    const summary = summarizeManagerMoney(bookings);
    expect(summary.depositsReceivedKobo).toBe(1_600_00 + 1_600_00 + 2_400_00);
    expect(summary.depositsReceivedCount).toBe(3);
    expect(summary.keptFromNoShowsKobo).toBe(1_600_00);
    expect(summary.refundedKobo).toBe(0);
    // Expected at till = balance due for everything except the no-show (kept the deposit, never coming):
    // done 8000-1600 + walkin 6000-0 + booked 12000-2400 = 6400 + 6000 + 9600 = 22000 (in kobo: *100)
    expect(summary.expectedAtTillKobo).toBe(6_400_00 + 6_000_00 + 9_600_00);
  });

  it("counts a refunded deposit separately from paid/kept", () => {
    const bookings = [booking({ depositStatus: "REFUNDED", depositAmountKobo: 1_600_00 })];
    const summary = summarizeManagerMoney(bookings);
    expect(summary.refundedKobo).toBe(1_600_00);
    expect(summary.depositsReceivedKobo).toBe(1_600_00);
  });

  it("is all zero with no bookings", () => {
    expect(summarizeManagerMoney([])).toEqual({
      depositsReceivedKobo: 0,
      depositsReceivedCount: 0,
      keptFromNoShowsKobo: 0,
      refundedKobo: 0,
      expectedAtTillKobo: 0,
    });
  });
});

describe("buildDayReportCsv", () => {
  const formatClockTime = (d: Date) => d.toISOString();

  it("includes a header row and one row per booking", () => {
    const csv = buildDayReportCsv([booking()], formatClockTime);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("Time,Customer,Service,Stylist,Status,Deposit");
    expect(lines[1]).toContain("Bisi Adeyemi");
    expect(lines[1]).toContain("Done");
  });

  it("labels a walk-in's deposit column instead of showing ₦0", () => {
    const csv = buildDayReportCsv([booking({ source: "WALK_IN", depositAmountKobo: 0, depositStatus: "NONE" })], formatClockTime);
    expect(csv.split("\r\n")[1]).toContain("Walk-in");
  });

  it("marks a kept deposit in the deposit column", () => {
    const csv = buildDayReportCsv([booking({ status: "NO_SHOW", depositStatus: "KEPT" })], formatClockTime);
    expect(csv.split("\r\n")[1]).toContain("kept");
  });

  it("quotes a field containing a comma", () => {
    const csv = buildDayReportCsv([booking({ customerName: "Adeyemi, Bisi" })], formatClockTime);
    expect(csv.split("\r\n")[1]).toContain('"Adeyemi, Bisi"');
  });
});
