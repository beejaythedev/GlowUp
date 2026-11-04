import { describe, expect, it } from "vitest";
import { formatTimeUntil, highlightMatch, matchesQuery, searchBookings } from "./checkInSearch";

const ngozi = { id: "1", customerName: "Ngozi Eze", customerPhone: "08039997710", serviceName: "Wig installation" };
const amaka = { id: "2", customerName: "Amaka Chukwu", customerPhone: "08039998888", serviceName: "Knotless braids" };

describe("matchesQuery", () => {
  it("matches an empty query against everything", () => {
    expect(matchesQuery(ngozi, "")).toBe(true);
  });

  it("matches part of the customer's name, case-insensitively", () => {
    expect(matchesQuery(ngozi, "ngozi")).toBe(true);
    expect(matchesQuery(ngozi, "NGOZI")).toBe(true);
    expect(matchesQuery(amaka, "ngozi")).toBe(false);
  });

  it("matches a phone number, ignoring spaces", () => {
    expect(matchesQuery(ngozi, "0803 999 7710")).toBe(true);
  });

  it("matches the service name", () => {
    expect(matchesQuery(ngozi, "wig")).toBe(true);
    expect(matchesQuery(amaka, "braids")).toBe(true);
  });
});

describe("searchBookings", () => {
  it("returns only the matching bookings", () => {
    expect(searchBookings([ngozi, amaka], "ngozi")).toEqual([ngozi]);
  });

  it("returns everything for an empty query", () => {
    expect(searchBookings([ngozi, amaka], "")).toEqual([ngozi, amaka]);
  });
});

describe("highlightMatch", () => {
  it("splits text around the matched substring", () => {
    expect(highlightMatch("Ngozi Eze", "Ngozi")).toEqual([
      { text: "Ngozi", matched: true },
      { text: " Eze", matched: false },
    ]);
  });

  it("returns the whole text unmatched when there's no hit", () => {
    expect(highlightMatch("Ngozi Eze", "xyz")).toEqual([{ text: "Ngozi Eze", matched: false }]);
  });

  it("returns the whole text unmatched for an empty query", () => {
    expect(highlightMatch("Ngozi Eze", "")).toEqual([{ text: "Ngozi Eze", matched: false }]);
  });
});

describe("formatTimeUntil", () => {
  const now = new Date("2026-11-02T10:00:00Z");

  it("formats minutes in the future", () => {
    expect(formatTimeUntil(new Date("2026-11-02T10:10:00Z"), now)).toBe("in 10 min");
  });

  it("formats hours in the future", () => {
    expect(formatTimeUntil(new Date("2026-11-02T14:00:00Z"), now)).toBe("in 4 hrs");
  });

  it("formats a single hour without pluralising", () => {
    expect(formatTimeUntil(new Date("2026-11-02T11:00:00Z"), now)).toBe("in 1 hr");
  });

  it("formats minutes in the past", () => {
    expect(formatTimeUntil(new Date("2026-11-02T09:45:00Z"), now)).toBe("15 min ago");
  });

  it("says 'now' for a time within half a minute of now", () => {
    expect(formatTimeUntil(new Date("2026-11-02T10:00:15Z"), now)).toBe("now");
  });
});
