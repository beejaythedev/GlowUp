// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { confirmDeposit, holdSlot } from "./bookings";

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
