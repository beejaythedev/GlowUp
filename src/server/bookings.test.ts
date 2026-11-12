// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import {
  cancelBooking,
  checkIn,
  confirmDeposit,
  createReceptionBooking,
  finishService,
  holdSlot,
  markNoShow,
  moveBooking,
  shouldAutoCheckIn,
  startService,
  undoCheckIn,
} from "./bookings";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

let branchId: string;
let serviceId: string;
let stylistId: string;
let customerId: string;
const extraStylistIds: string[] = [];

beforeAll(async () => {
  const branch = await db.branch.create({
    data: {
      name: "M2-3 Test Branch",
      address: "Test address",
      offersNails: false,
      openingHours: { create: [{ weekday: 6, opensAtMinute: 9 * 60, closesAtMinute: 19 * 60 }] },
    },
  });
  branchId = branch.id;

  const service = await db.service.create({
    data: {
      name: "M2-3 Test Service",
      priceKobo: 800_000,
      minDurationMinutes: 60,
      maxDurationMinutes: 60,
      prepMinutes: 10,
      nailsOnly: false,
    },
  });
  serviceId = service.id;

  const stylist = await db.staff.create({
    data: {
      name: "M2-3 Test Stylist",
      phone: "07000000001",
      role: "STYLIST",
      branchId,
      passwordHash: "test",
    },
  });
  stylistId = stylist.id;

  const customer = await db.customer.create({
    data: { name: "M2-3 Test Customer", phone: "07000000002" },
  });
  customerId = customer.id;
});

afterAll(async () => {
  await db.booking.deleteMany({ where: { branchId } });
  for (const id of extraStylistIds) {
    await db.staff.delete({ where: { id } });
  }
  await db.staff.delete({ where: { id: stylistId } });
  await db.customer.delete({ where: { id: customerId } });
  await db.service.delete({ where: { id: serviceId } });
  await db.branch.delete({ where: { id: branchId } });
  await db.$disconnect();
});

function holdParams(startsAt: Date, overrides: Partial<Parameters<typeof holdSlot>[1]> = {}) {
  return {
    branchId,
    serviceId,
    stylistId,
    stylistRequested: false,
    customerId,
    bookerPhone: "07000000002",
    startsAt,
    endsAt: new Date(startsAt.getTime() + 60 * 60_000),
    blockedUntil: new Date(startsAt.getTime() + 70 * 60_000),
    depositAmountKobo: 160_000,
    source: "ONLINE" as const,
    ...overrides,
  };
}

describe("holdSlot", () => {
  it("holds a free slot and sets a 10-minute expiry", async () => {
    const startsAt = new Date("2026-11-07T10:00:00Z");
    const now = new Date("2026-11-07T09:00:00Z");

    const result = await holdSlot(db, holdParams(startsAt, { now }));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.holdExpiresAt).toEqual(new Date("2026-11-07T09:10:00Z"));
    }
  });

  it("refuses a second hold that overlaps an existing active booking", async () => {
    const startsAt = new Date("2026-11-07T12:00:00Z");
    const now = new Date("2026-11-07T09:00:00Z");

    const first = await holdSlot(db, holdParams(startsAt, { now }));
    expect(first.ok).toBe(true);

    const second = await holdSlot(db, holdParams(startsAt, { now }));
    expect(second).toEqual({ ok: false, reason: "SLOT_TAKEN" });
  });

  it("fires two simultaneous holds for the same slot — exactly one succeeds", async () => {
    const startsAt = new Date("2026-11-07T14:00:00Z");
    const now = new Date("2026-11-07T09:00:00Z");

    const [a, b] = await Promise.all([
      holdSlot(db, holdParams(startsAt, { now })),
      holdSlot(db, holdParams(startsAt, { now })),
    ]);

    const results = [a, b];
    const succeeded = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);

    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(failed[0]).toEqual({ ok: false, reason: "SLOT_TAKEN" });
  });

  it("ignores an expired, unpaid hold and reclaims the slot", async () => {
    const startsAt = new Date("2026-11-07T16:00:00Z");
    const past = new Date("2026-11-07T09:00:00Z");
    const later = new Date("2026-11-07T09:11:00Z"); // past the first hold's 10-minute expiry

    const first = await holdSlot(db, holdParams(startsAt, { now: past }));
    expect(first.ok).toBe(true);

    const second = await holdSlot(db, holdParams(startsAt, { now: later }));
    expect(second.ok).toBe(true);
  });

  it("allows a different stylist to hold the same time", async () => {
    const otherStylist = await db.staff.create({
      data: {
        name: "M2-3 Test Stylist 2",
        phone: "07000000003",
        role: "STYLIST",
        branchId,
        passwordHash: "test",
      },
    });
    extraStylistIds.push(otherStylist.id);

    const startsAt = new Date("2026-11-07T18:00:00Z");
    const now = new Date("2026-11-07T09:00:00Z");

    const first = await holdSlot(db, holdParams(startsAt, { now }));
    const second = await holdSlot(
      db,
      holdParams(startsAt, { now, stylistId: otherStylist.id }),
    );

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
  });
});

describe("confirmDeposit", () => {
  it("marks a held booking's deposit as paid", async () => {
    const startsAt = new Date("2026-11-08T10:00:00Z");
    const now = new Date("2026-11-08T09:00:00Z");

    const held = await holdSlot(db, holdParams(startsAt, { now }));
    expect(held.ok).toBe(true);
    if (!held.ok) return;

    const result = await confirmDeposit(db, held.bookingId, now);
    expect(result).toEqual({ ok: true });

    const booking = await db.booking.findUniqueOrThrow({ where: { id: held.bookingId } });
    expect(booking.depositStatus).toBe("PAID");
  });

  it("refuses a booking whose hold already expired", async () => {
    const startsAt = new Date("2026-11-08T12:00:00Z");
    const now = new Date("2026-11-08T09:00:00Z");
    const later = new Date("2026-11-08T09:11:00Z");

    const held = await holdSlot(db, holdParams(startsAt, { now }));
    expect(held.ok).toBe(true);
    if (!held.ok) return;

    const result = await confirmDeposit(db, held.bookingId, later);
    expect(result).toEqual({ ok: false, reason: "HOLD_EXPIRED" });
  });

  it("refuses an unknown booking id", async () => {
    const result = await confirmDeposit(db, "does-not-exist");
    expect(result).toEqual({ ok: false, reason: "NOT_FOUND" });
  });
});

interface CreateBookingOverrides {
  startsAt?: Date;
  endsAt?: Date;
  blockedUntil?: Date;
  stylistId?: string;
  status?: "BOOKED" | "CHECKED_IN" | "IN_SERVICE" | "DONE" | "NO_SHOW" | "CANCELLED";
  checkedInAt?: Date;
  startedAt?: Date;
  depositStatus?: "NONE" | "PENDING" | "PAID" | "REFUNDED" | "KEPT";
  depositAmountKobo?: number;
}

function createBooking(overrides: CreateBookingOverrides = {}) {
  return db.booking.create({
    data: {
      branchId,
      serviceId,
      stylistId,
      stylistRequested: false,
      customerId,
      bookerPhone: "07000000002",
      startsAt: new Date("2026-11-09T10:00:00Z"),
      endsAt: new Date("2026-11-09T11:00:00Z"),
      blockedUntil: new Date("2026-11-09T11:10:00Z"),
      status: "BOOKED",
      source: "ONLINE",
      depositAmountKobo: 160_000,
      depositStatus: "PAID",
      ...overrides,
    },
  });
}

// Each test below creates its own booking for the same stylist, so every
// test needs a time slot that doesn't overlap any other test's — the
// no-double-booking exclusion constraint applies just as much here as to
// a real concurrent hold.
function slot(hoursFromBase: number) {
  const startsAt = new Date(new Date("2026-11-09T06:00:00Z").getTime() + hoursFromBase * 2 * 60 * 60_000);
  return { startsAt, endsAt: new Date(startsAt.getTime() + 60 * 60_000), blockedUntil: new Date(startsAt.getTime() + 70 * 60_000) };
}

describe("reception actions", () => {
  it("checks in a booked appointment", async () => {
    const booking = await createBooking(slot(0));
    const now = new Date("2026-11-09T10:00:00Z");

    const result = await checkIn(db, booking.id, now);
    expect(result).toEqual({ ok: true });

    const updated = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(updated.status).toBe("CHECKED_IN");
    expect(updated.checkedInAt).toEqual(now);
  });

  it("refuses to check in a booking that's already checked in", async () => {
    const booking = await createBooking({ ...slot(1), status: "CHECKED_IN", checkedInAt: new Date() });
    const result = await checkIn(db, booking.id);
    expect(result).toEqual({ ok: false, reason: "NOT_ALLOWED" });
  });

  it("starts service for a checked-in booking", async () => {
    const booking = await createBooking({
      ...slot(2),
      status: "CHECKED_IN",
      checkedInAt: new Date("2026-11-09T10:00:00Z"),
    });
    const now = new Date("2026-11-09T10:05:00Z");

    const result = await startService(db, booking.id, now);
    expect(result).toEqual({ ok: true });

    const updated = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(updated.status).toBe("IN_SERVICE");
    expect(updated.startedAt).toEqual(now);
  });

  it("refuses to start a booking that hasn't been checked in", async () => {
    const booking = await createBooking(slot(3));
    const result = await startService(db, booking.id);
    expect(result).toEqual({ ok: false, reason: "NOT_ALLOWED" });
  });

  it("finishes an in-service booking", async () => {
    const booking = await createBooking({
      ...slot(4),
      status: "IN_SERVICE",
      startedAt: new Date("2026-11-09T10:05:00Z"),
    });
    const now = new Date("2026-11-09T11:00:00Z");

    const result = await finishService(db, booking.id, now);
    expect(result).toEqual({ ok: true });

    const updated = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(updated.status).toBe("DONE");
    expect(updated.finishedAt).toEqual(now);
  });

  it("undoes a check-in back to booked", async () => {
    const booking = await createBooking({ ...slot(5), status: "CHECKED_IN", checkedInAt: new Date() });

    const result = await undoCheckIn(db, booking.id);
    expect(result).toEqual({ ok: true });

    const updated = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(updated.status).toBe("BOOKED");
    expect(updated.checkedInAt).toBeNull();
  });

  it("marks a booked appointment as a no-show and keeps the paid deposit", async () => {
    const booking = await createBooking(slot(6));
    const result = await markNoShow(db, booking.id);
    expect(result).toEqual({ ok: true });

    const updated = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(updated.status).toBe("NO_SHOW");
    expect(updated.depositStatus).toBe("KEPT");
  });

  it("leaves a never-paid deposit alone when marking a no-show", async () => {
    const booking = await createBooking({ ...slot(11), depositStatus: "PENDING", depositAmountKobo: 0 });
    const result = await markNoShow(db, booking.id);
    expect(result).toEqual({ ok: true });

    const updated = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(updated.depositStatus).toBe("PENDING");
  });

  it("refuses to mark an already-checked-in booking as a no-show", async () => {
    const booking = await createBooking({ ...slot(7), status: "CHECKED_IN", checkedInAt: new Date() });
    const result = await markNoShow(db, booking.id);
    expect(result).toEqual({ ok: false, reason: "NOT_ALLOWED" });
  });

  it("cancels a booked appointment", async () => {
    const booking = await createBooking(slot(8));
    const now = new Date("2026-11-09T09:00:00Z");

    const result = await cancelBooking(db, booking.id, now);
    expect(result).toEqual({ ok: true });

    const updated = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(updated.status).toBe("CANCELLED");
    expect(updated.cancelledAt).toEqual(now);
  });

  it("refuses to cancel a booking already in service", async () => {
    const booking = await createBooking({ ...slot(9), status: "IN_SERVICE", startedAt: new Date() });
    const result = await cancelBooking(db, booking.id);
    expect(result).toEqual({ ok: false, reason: "NOT_ALLOWED" });
  });

  it("moves a booking to a different, free stylist", async () => {
    const otherStylist = await db.staff.create({
      data: {
        name: "M5-2 Test Stylist",
        phone: "07000000004",
        role: "STYLIST",
        branchId,
        passwordHash: "test",
      },
    });
    extraStylistIds.push(otherStylist.id);

    const booking = await createBooking({
      startsAt: new Date("2026-11-10T10:00:00Z"),
      endsAt: new Date("2026-11-10T11:00:00Z"),
      blockedUntil: new Date("2026-11-10T11:10:00Z"),
    });

    const result = await moveBooking(db, booking.id, otherStylist.id);
    expect(result).toEqual({ ok: true });

    const updated = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(updated.stylistId).toBe(otherStylist.id);
  });

  it("refuses to move a booking onto a stylist who's already busy then", async () => {
    const otherStylist = await db.staff.create({
      data: {
        name: "M5-2 Test Stylist 2",
        phone: "07000000005",
        role: "STYLIST",
        branchId,
        passwordHash: "test",
      },
    });
    extraStylistIds.push(otherStylist.id);

    const startsAt = new Date("2026-11-11T10:00:00Z");
    const endsAt = new Date("2026-11-11T11:00:00Z");
    const blockedUntil = new Date("2026-11-11T11:10:00Z");

    await createBooking({ startsAt, endsAt, blockedUntil, stylistId: otherStylist.id });
    const booking = await createBooking({ startsAt, endsAt, blockedUntil });

    const result = await moveBooking(db, booking.id, otherStylist.id);
    expect(result).toEqual({ ok: false, reason: "SLOT_TAKEN" });
  });

  it("refuses to move a booking that's already in service", async () => {
    const booking = await createBooking({ ...slot(10), status: "IN_SERVICE", startedAt: new Date() });
    const result = await moveBooking(db, booking.id, stylistId);
    expect(result).toEqual({ ok: false, reason: "NOT_ALLOWED" });
  });
});

describe("shouldAutoCheckIn", () => {
  const now = new Date("2026-11-12T10:00:00Z");

  it("is true for a walk-in starting right now", () => {
    expect(shouldAutoCheckIn("WALK_IN", now, now)).toBe(true);
  });

  it("is true for a walk-in starting within the next slot step", () => {
    expect(shouldAutoCheckIn("WALK_IN", new Date("2026-11-12T10:05:00Z"), now)).toBe(true);
  });

  it("is false for a walk-in booked later today", () => {
    expect(shouldAutoCheckIn("WALK_IN", new Date("2026-11-12T15:00:00Z"), now)).toBe(false);
  });

  it("is always false for a phone booking, even one starting now", () => {
    expect(shouldAutoCheckIn("PHONE", now, now)).toBe(false);
  });
});

describe("createReceptionBooking", () => {
  function receptionParams(overrides: Partial<Parameters<typeof createReceptionBooking>[1]> = {}) {
    return {
      branchId,
      serviceId,
      stylistId,
      customerId,
      bookerPhone: "07000000002",
      startsAt: new Date("2026-11-12T10:00:00Z"),
      endsAt: new Date("2026-11-12T11:00:00Z"),
      blockedUntil: new Date("2026-11-12T11:10:00Z"),
      depositAmountKobo: 0,
      source: "WALK_IN" as const,
      ...overrides,
    };
  }

  it("checks a walk-in in automatically when served right away", async () => {
    const now = new Date("2026-11-12T10:00:00Z");
    const result = await createReceptionBooking(db, receptionParams({ now }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const booking = await db.booking.findUniqueOrThrow({ where: { id: result.bookingId } });
    expect(booking.status).toBe("CHECKED_IN");
    expect(booking.checkedInAt).toEqual(now);
    expect(booking.depositStatus).toBe("NONE");
    expect(booking.stylistRequested).toBe(true);
  });

  it("leaves a walk-in booked for later today as a plain booking", async () => {
    const now = new Date("2026-11-12T09:00:00Z");
    const result = await createReceptionBooking(
      db,
      receptionParams({ startsAt: new Date("2026-11-12T15:00:00Z"), endsAt: new Date("2026-11-12T16:00:00Z"), blockedUntil: new Date("2026-11-12T16:10:00Z"), now }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const booking = await db.booking.findUniqueOrThrow({ where: { id: result.bookingId } });
    expect(booking.status).toBe("BOOKED");
    expect(booking.checkedInAt).toBeNull();
  });

  it("gives a phone booking a pending deposit instead of checking in", async () => {
    const now = new Date("2026-11-12T20:00:00Z");
    const result = await createReceptionBooking(
      db,
      receptionParams({
        startsAt: new Date("2026-11-12T20:00:00Z"),
        endsAt: new Date("2026-11-12T21:00:00Z"),
        blockedUntil: new Date("2026-11-12T21:10:00Z"),
        depositAmountKobo: 160_000,
        source: "PHONE",
        now,
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const booking = await db.booking.findUniqueOrThrow({ where: { id: result.bookingId } });
    expect(booking.status).toBe("BOOKED");
    expect(booking.depositStatus).toBe("PENDING");
    expect(booking.depositAmountKobo).toBe(160_000);
  });

  it("refuses an overlapping slot for the same stylist", async () => {
    const startsAt = new Date("2026-11-12T22:00:00Z");
    const endsAt = new Date("2026-11-12T23:00:00Z");
    const blockedUntil = new Date("2026-11-12T23:10:00Z");

    const first = await createReceptionBooking(db, receptionParams({ startsAt, endsAt, blockedUntil, now: startsAt }));
    expect(first.ok).toBe(true);

    const second = await createReceptionBooking(db, receptionParams({ startsAt, endsAt, blockedUntil, now: startsAt }));
    expect(second).toEqual({ ok: false, reason: "SLOT_TAKEN" });
  });
});
