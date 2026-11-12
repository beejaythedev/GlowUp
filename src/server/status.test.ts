import { describe, expect, it } from "vitest";
import { allowedFromStatuses, getDisplayStatus, getWaitMinutes, isActionAllowed } from "./status";

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

describe("isActionAllowed", () => {
  it("only checks in a booked appointment", () => {
    expect(isActionAllowed("BOOKED", "CHECK_IN")).toBe(true);
    expect(isActionAllowed("CHECKED_IN", "CHECK_IN")).toBe(false);
    expect(isActionAllowed("DONE", "CHECK_IN")).toBe(false);
  });

  it("only starts a checked-in appointment", () => {
    expect(isActionAllowed("CHECKED_IN", "START")).toBe(true);
    expect(isActionAllowed("BOOKED", "START")).toBe(false);
  });

  it("only finishes an in-service appointment", () => {
    expect(isActionAllowed("IN_SERVICE", "FINISH")).toBe(true);
    expect(isActionAllowed("CHECKED_IN", "FINISH")).toBe(false);
  });

  it("only undoes a check-in from checked-in", () => {
    expect(isActionAllowed("CHECKED_IN", "UNDO_CHECK_IN")).toBe(true);
    expect(isActionAllowed("IN_SERVICE", "UNDO_CHECK_IN")).toBe(false);
  });

  it("only marks a booked (not yet checked in) appointment as a no-show", () => {
    expect(isActionAllowed("BOOKED", "NO_SHOW")).toBe(true);
    expect(isActionAllowed("CHECKED_IN", "NO_SHOW")).toBe(false);
  });

  it("cancels only before service starts", () => {
    expect(isActionAllowed("BOOKED", "CANCEL")).toBe(true);
    expect(isActionAllowed("CHECKED_IN", "CANCEL")).toBe(true);
    expect(isActionAllowed("IN_SERVICE", "CANCEL")).toBe(false);
    expect(isActionAllowed("DONE", "CANCEL")).toBe(false);
  });

  it("moves only before service starts", () => {
    expect(isActionAllowed("BOOKED", "MOVE")).toBe(true);
    expect(isActionAllowed("CHECKED_IN", "MOVE")).toBe(true);
    expect(isActionAllowed("IN_SERVICE", "MOVE")).toBe(false);
  });

  it("reschedules only before service starts", () => {
    expect(isActionAllowed("BOOKED", "RESCHEDULE")).toBe(true);
    expect(isActionAllowed("CHECKED_IN", "RESCHEDULE")).toBe(true);
    expect(isActionAllowed("IN_SERVICE", "RESCHEDULE")).toBe(false);
  });
});

describe("allowedFromStatuses", () => {
  it("matches isActionAllowed for every status", () => {
    const allStatuses = ["BOOKED", "CHECKED_IN", "IN_SERVICE", "DONE", "NO_SHOW", "CANCELLED"] as const;
    const allActions = [
      "CHECK_IN", "START", "FINISH", "UNDO_CHECK_IN", "NO_SHOW", "CANCEL", "MOVE", "RESCHEDULE",
    ] as const;
    for (const action of allActions) {
      for (const status of allStatuses) {
        expect(allowedFromStatuses(action).includes(status)).toBe(isActionAllowed(status, action));
      }
    }
  });
});
