import { describe, expect, it } from "vitest";
import {
  findOverdueBookings,
  getGridHeightPx,
  getHourMarks,
  getNowLineTopPx,
  getStylistStatusLine,
  isOverdueForCheckIn,
  layoutStylistBookings,
  summarizeDay,
  type ScheduleBooking,
} from "./schedule";

const OPENS_AT = new Date("2026-10-31T08:00:00Z"); // 9:00 am Lagos
const CLOSES_AT = new Date("2026-10-31T18:00:00Z"); // 7:00 pm Lagos
const PX_PER_HOUR = 100;

function booking(overrides: Partial<ScheduleBooking> = {}): ScheduleBooking {
  return {
    id: "b1",
    stylistId: "stylist_1",
    startsAt: new Date("2026-10-31T09:00:00Z"),
    endsAt: new Date("2026-10-31T10:00:00Z"),
    blockedUntil: new Date("2026-10-31T10:15:00Z"),
    status: "BOOKED",
    checkedInAt: null,
    source: "ONLINE",
    customerName: "Amaka",
    serviceName: "Knotless braids",
    stylistRequested: false,
    ...overrides,
  };
}

describe("getGridHeightPx", () => {
  it("is pxPerHour times the number of open hours", () => {
    expect(getGridHeightPx(OPENS_AT, CLOSES_AT, PX_PER_HOUR)).toBe(1000);
  });
});

describe("getHourMarks", () => {
  it("includes one mark per hour from open to close", () => {
    const marks = getHourMarks(OPENS_AT, CLOSES_AT, PX_PER_HOUR, (d) => d.toISOString());
    expect(marks).toHaveLength(11); // 9am..7pm inclusive
    expect(marks[0].topPx).toBe(0);
    expect(marks[1].topPx).toBe(100);
    expect(marks.at(-1)!.topPx).toBe(1000);
  });
});

describe("getNowLineTopPx", () => {
  it("positions the line proportionally within the window", () => {
    const now = new Date("2026-10-31T09:30:00Z"); // 10:30 am, 1.5h after open
    expect(getNowLineTopPx(OPENS_AT, CLOSES_AT, now, PX_PER_HOUR)).toBe(150);
  });

  it("is null before opening or after closing", () => {
    expect(getNowLineTopPx(OPENS_AT, CLOSES_AT, new Date("2026-10-31T07:00:00Z"), PX_PER_HOUR)).toBeNull();
    expect(getNowLineTopPx(OPENS_AT, CLOSES_AT, new Date("2026-10-31T19:00:00Z"), PX_PER_HOUR)).toBeNull();
  });
});

describe("layoutStylistBookings", () => {
  it("positions a booking block by minutes since opening", () => {
    const now = new Date("2026-10-31T07:00:00Z"); // before everything, plain BOOKED
    const { blocks } = layoutStylistBookings([booking()], OPENS_AT, PX_PER_HOUR, now);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ topPx: 100, heightPx: 100, displayStatus: "booked" });
  });

  it("carries the stylistRequested flag onto the block", () => {
    const now = new Date("2026-10-31T07:00:00Z");
    const { blocks } = layoutStylistBookings([booking({ stylistRequested: true })], OPENS_AT, PX_PER_HOUR, now);
    expect(blocks[0].stylistRequested).toBe(true);
  });

  it("adds a separate prep block after the appointment", () => {
    const now = new Date("2026-10-31T07:00:00Z");
    const { prepBlocks } = layoutStylistBookings([booking()], OPENS_AT, PX_PER_HOUR, now);
    expect(prepBlocks).toEqual([{ topPx: 200, heightPx: 25 }]);
  });

  it("skips cancelled bookings entirely", () => {
    const now = new Date("2026-10-31T07:00:00Z");
    const { blocks, prepBlocks } = layoutStylistBookings(
      [booking({ status: "CANCELLED" })],
      OPENS_AT,
      PX_PER_HOUR,
      now,
    );
    expect(blocks).toHaveLength(0);
    expect(prepBlocks).toHaveLength(0);
  });

  it("computes wait minutes for a checked-in, waiting booking", () => {
    const now = new Date("2026-10-31T09:06:00Z"); // 10:06am, 6 min after a 10:00 start
    const { blocks } = layoutStylistBookings(
      [
        booking({
          status: "CHECKED_IN",
          checkedInAt: new Date("2026-10-31T09:00:00Z"),
        }),
      ],
      OPENS_AT,
      PX_PER_HOUR,
      now,
    );
    expect(blocks[0].displayStatus).toBe("waiting");
    expect(blocks[0].waitMinutes).toBe(6);
  });

  it("gives a minimum height to very short blocks", () => {
    const now = new Date("2026-10-31T07:00:00Z");
    const short = booking({ endsAt: new Date("2026-10-31T09:05:00Z") }); // 5 minutes
    const { blocks } = layoutStylistBookings([short], OPENS_AT, PX_PER_HOUR, now);
    expect(blocks[0].heightPx).toBeGreaterThanOrEqual(24);
  });
});

describe("getStylistStatusLine", () => {
  const format = (d: Date) => d.toISOString();

  it("reports busy until the end of an in-service booking", () => {
    const now = new Date("2026-10-31T09:30:00Z");
    const line = getStylistStatusLine([booking({ status: "IN_SERVICE" })], now, format);
    expect(line).toContain("Busy until");
  });

  it("reports a waiting customer over everything else", () => {
    const now = new Date("2026-10-31T09:06:00Z");
    const line = getStylistStatusLine(
      [booking({ status: "CHECKED_IN", checkedInAt: new Date("2026-10-31T09:00:00Z") })],
      now,
      format,
    );
    expect(line).toBe("Customer waiting");
  });

  it("reports free-at-prep-end when mid-prep with nothing else going on", () => {
    const now = new Date("2026-10-31T10:05:00Z"); // after the 10:00 end, before 10:15 blockedUntil
    const line = getStylistStatusLine([booking({ status: "DONE" })], now, format);
    expect(line).toContain("Free at");
  });

  it("names the next upcoming booking", () => {
    const now = new Date("2026-10-31T07:00:00Z");
    const line = getStylistStatusLine([booking({ customerName: "Ngozi" })], now, format);
    expect(line).toBe(`Next: Ngozi at ${format(new Date("2026-10-31T09:00:00Z"))}`);
  });

  it("says free for the day when nothing is left", () => {
    const now = new Date("2026-10-31T12:00:00Z");
    const line = getStylistStatusLine([booking({ status: "DONE" })], now, format);
    expect(line).toBe("Free for the rest of today");
  });
});

describe("summarizeDay", () => {
  it("counts bookings, waiting customers (with the longest wait), in-service and no-shows", () => {
    const now = new Date("2026-10-31T09:06:00Z");
    const bookings = [
      booking({ id: "a", status: "CHECKED_IN", checkedInAt: new Date("2026-10-31T09:00:00Z") }),
      booking({ id: "b", status: "IN_SERVICE" }),
      booking({ id: "c", status: "NO_SHOW" }),
      booking({ id: "d", status: "CANCELLED" }),
    ];
    expect(summarizeDay(bookings, now)).toEqual({
      bookingsToday: 3,
      checkedInWaitingCount: 1,
      longestWaitMinutes: 6,
      inServiceCount: 1,
      noShowCount: 1,
    });
  });

  it("has a null longest wait when nobody is waiting", () => {
    const now = new Date("2026-10-31T07:00:00Z");
    expect(summarizeDay([booking()], now).longestWaitMinutes).toBeNull();
  });
});

describe("isOverdueForCheckIn", () => {
  // booking()'s default startsAt is 2026-10-31T09:00:00Z.

  it("is false before the appointment time has passed", () => {
    expect(isOverdueForCheckIn(booking(), new Date("2026-10-31T08:50:00Z"))).toBe(false);
  });

  it("is false up to 15 minutes after the appointment time", () => {
    expect(isOverdueForCheckIn(booking(), new Date("2026-10-31T09:14:00Z"))).toBe(false);
  });

  it("is true once 15 minutes have passed, still BOOKED", () => {
    expect(isOverdueForCheckIn(booking(), new Date("2026-10-31T09:15:00Z"))).toBe(true);
  });

  it("is false once checked in, even if 15+ minutes late", () => {
    const checkedIn = booking({ status: "CHECKED_IN", checkedInAt: new Date("2026-10-31T09:20:00Z") });
    expect(isOverdueForCheckIn(checkedIn, new Date("2026-10-31T09:30:00Z"))).toBe(false);
  });

  it("is false for a no-show or cancelled booking", () => {
    expect(isOverdueForCheckIn(booking({ status: "NO_SHOW" }), new Date("2026-10-31T09:30:00Z"))).toBe(false);
    expect(isOverdueForCheckIn(booking({ status: "CANCELLED" }), new Date("2026-10-31T09:30:00Z"))).toBe(false);
  });
});

describe("findOverdueBookings", () => {
  it("returns only overdue bookings, soonest-due first", () => {
    const now = new Date("2026-10-31T09:30:00Z");
    const soon = booking({ id: "soon", startsAt: new Date("2026-10-31T09:10:00Z") }); // 20 min late
    const later = booking({ id: "later", startsAt: new Date("2026-10-31T09:00:00Z") }); // 30 min late
    const notYet = booking({ id: "not-yet", startsAt: new Date("2026-10-31T09:20:00Z") }); // 10 min late
    const checkedIn = booking({ id: "checked-in", status: "CHECKED_IN", checkedInAt: now });

    expect(findOverdueBookings([soon, later, notYet, checkedIn], now).map((b) => b.id)).toEqual([
      "later",
      "soon",
    ]);
  });
});
