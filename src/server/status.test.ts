import { describe, expect, it } from "vitest";
import { getDisplayStatus, getWaitMinutes } from "./status";

const appointmentStart = new Date("2026-10-31T10:00:00Z");

describe("getDisplayStatus", () => {
  it("is booked before check-in", () => {
    expect(
      getDisplayStatus(
        { status: "BOOKED", startsAt: appointmentStart, checkedInAt: null },
        new Date("2026-10-31T09:50:00Z"),
      ),
    ).toBe("booked");
  });

  it("is checked in, early when checked in before the appointment time", () => {
    const checkedInAt = new Date("2026-10-31T09:50:00Z");
    expect(
      getDisplayStatus(
        { status: "CHECKED_IN", startsAt: appointmentStart, checkedInAt },
        new Date("2026-10-31T09:55:00Z"),
      ),
    ).toBe("checkedInEarly");
  });

  it("is waiting once the appointment time has passed and not started", () => {
    const checkedInAt = new Date("2026-10-31T10:14:00Z");
    expect(
      getDisplayStatus(
        { status: "CHECKED_IN", startsAt: appointmentStart, checkedInAt },
        new Date("2026-10-31T10:20:00Z"),
      ),
    ).toBe("waiting");
  });

  it("is in service, done or no-show as stored, regardless of the clock", () => {
    const base = { startsAt: appointmentStart, checkedInAt: null };
    const now = new Date("2026-10-31T11:00:00Z");
    expect(getDisplayStatus({ ...base, status: "IN_SERVICE" }, now)).toBe("inService");
    expect(getDisplayStatus({ ...base, status: "DONE" }, now)).toBe("done");
    expect(getDisplayStatus({ ...base, status: "NO_SHOW" }, now)).toBe("noShow");
    expect(getDisplayStatus({ ...base, status: "CANCELLED" }, now)).toBe("cancelled");
  });
});

describe("getWaitMinutes", () => {
  it("is zero for an early arrival — arriving early never counts as waiting", () => {
    const checkedInAt = new Date("2026-10-31T09:50:00Z"); // 10 min early
    const startedAt = appointmentStart; // started exactly on time
    expect(
      getWaitMinutes({ checkedInAt, appointmentStart, comparedTo: startedAt }),
    ).toBe(0);
  });

  it("counts from the appointment time, not check-in, for a late arrival", () => {
    // Checked in 14 minutes late (docs/DESIGN.md's ReceptionSchedule example).
    const checkedInAt = new Date("2026-10-31T10:14:00Z");
    const now = new Date("2026-10-31T10:20:00Z");
    expect(getWaitMinutes({ checkedInAt, appointmentStart, comparedTo: now })).toBe(6);
  });

  it("is zero for a walk-in served and checked in immediately", () => {
    const walkInTime = new Date("2026-10-31T11:10:00Z");
    expect(
      getWaitMinutes({
        checkedInAt: walkInTime,
        appointmentStart: walkInTime,
        comparedTo: walkInTime,
      }),
    ).toBe(0);
  });
});
