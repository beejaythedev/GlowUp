/**
 * Sample data matching design/screens/*.dc.html, run with `npx prisma db seed`
 * (or directly: `node --env-file=.env prisma/seed.ts`).
 *
 * Addresses for Ikeja, Yaba and Surulere are placeholders pending Open
 * Question Q5 (docs/OPEN_QUESTIONS.md) — Tolu hasn't sent them yet.
 */
import { randomBytes, scryptSync } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

/**
 * Stand-in password hashing for seed data only. M4 wires up Better Auth,
 * which brings its own hashing — demo accounts will be re-seeded then.
 */
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const DEMO_PASSWORD = "password1";

// Nigeria is WAT (UTC+1) year-round — no DST, so a fixed offset is exact.
const LAGOS_OFFSET_MINUTES = 60;

function lagosToday(): { year: number; month: number; day: number; weekday: number } {
  const lagosNow = new Date(Date.now() + LAGOS_OFFSET_MINUTES * 60_000);
  return {
    year: lagosNow.getUTCFullYear(),
    month: lagosNow.getUTCMonth() + 1,
    day: lagosNow.getUTCDate(),
    weekday: lagosNow.getUTCDay(),
  };
}

/** The UTC instant for a given Africa/Lagos wall-clock time on "today". */
function lagosTime(hour: number, minute: number): Date {
  const { year, month, day } = lagosToday();
  return new Date(Date.UTC(year, month - 1, day, hour - LAGOS_OFFSET_MINUTES / 60, minute));
}

async function main() {
  // ---------------------------------------------------------------------
  // Branches and opening hours
  // ---------------------------------------------------------------------
  const branches = await Promise.all(
    [
      {
        name: "GlowUp Lekki",
        address: "14 Admiralty Way, Lekki Phase 1, Lagos",
        offersNails: true,
        // Mon–Sat 9am–7pm, Sun 12pm–6pm (the only branch open Sunday).
        openingHours: [
          { weekday: 0, opensAtMinute: 12 * 60, closesAtMinute: 18 * 60 },
          { weekday: 1, opensAtMinute: 9 * 60, closesAtMinute: 19 * 60 },
          { weekday: 2, opensAtMinute: 9 * 60, closesAtMinute: 19 * 60 },
          { weekday: 3, opensAtMinute: 9 * 60, closesAtMinute: 19 * 60 },
          { weekday: 4, opensAtMinute: 9 * 60, closesAtMinute: 19 * 60 },
          { weekday: 5, opensAtMinute: 9 * 60, closesAtMinute: 19 * 60 },
          { weekday: 6, opensAtMinute: 9 * 60, closesAtMinute: 19 * 60 },
        ],
      },
      {
        name: "GlowUp Ikeja",
        address: "Ikeja, Lagos (address pending — see Open Question Q5)",
        offersNails: true,
        openingHours: weekdayHoursMonToSat(),
      },
      {
        name: "GlowUp Yaba",
        address: "Yaba, Lagos (address pending — see Open Question Q5)",
        offersNails: false,
        openingHours: weekdayHoursMonToSat(),
      },
      {
        name: "GlowUp Surulere",
        address: "Surulere, Lagos (address pending — see Open Question Q5)",
        offersNails: false,
        openingHours: weekdayHoursMonToSat(),
      },
    ].map((branch) =>
      db.branch.upsert({
        where: { name: branch.name },
        create: {
          name: branch.name,
          address: branch.address,
          offersNails: branch.offersNails,
          openingHours: { create: branch.openingHours },
        },
        update: {
          address: branch.address,
          offersNails: branch.offersNails,
        },
      }),
    ),
  );
  const lekki = branches.find((b) => b.name === "GlowUp Lekki")!;
  const ikeja = branches.find((b) => b.name === "GlowUp Ikeja")!;

  // ---------------------------------------------------------------------
  // Services
  // ---------------------------------------------------------------------
  const serviceData = [
    { name: "Knotless braids", priceKobo: 25_000_00, minDurationMinutes: 240, maxDurationMinutes: 300, prepMinutes: 15, nailsOnly: false },
    { name: "Makeup", priceKobo: 20_000_00, minDurationMinutes: 90, maxDurationMinutes: 90, prepMinutes: 10, nailsOnly: false },
    { name: "Wig installation", priceKobo: 15_000_00, minDurationMinutes: 120, maxDurationMinutes: 120, prepMinutes: 15, nailsOnly: false },
    { name: "Relaxer and styling", priceKobo: 12_000_00, minDurationMinutes: 90, maxDurationMinutes: 90, prepMinutes: 10, nailsOnly: false },
    { name: "Wash and set", priceKobo: 8_000_00, minDurationMinutes: 60, maxDurationMinutes: 60, prepMinutes: 10, nailsOnly: false },
    { name: "Pedicure", priceKobo: 8_000_00, minDurationMinutes: 60, maxDurationMinutes: 60, prepMinutes: 5, nailsOnly: true },
    { name: "Manicure", priceKobo: 6_000_00, minDurationMinutes: 45, maxDurationMinutes: 45, prepMinutes: 5, nailsOnly: true },
  ];
  const services = await Promise.all(
    serviceData.map((service) =>
      db.service.upsert({
        where: { name: service.name },
        create: service,
        update: service,
      }),
    ),
  );
  const serviceByName = Object.fromEntries(services.map((s) => [s.name, s]));

  // ---------------------------------------------------------------------
  // Staff
  // ---------------------------------------------------------------------
  const passwordHash = hashPassword(DEMO_PASSWORD);
  const staffData = [
    { name: "Tolu", phone: "08020000001", role: "OWNER" as const, branchId: null },
    { name: "Ada", phone: "08020000002", role: "RECEPTIONIST" as const, branchId: lekki.id },
    { name: "Grace", phone: "08020000003", role: "BRANCH_MANAGER" as const, branchId: lekki.id },
    { name: "Blessing", phone: "08020000004", role: "STYLIST" as const, branchId: lekki.id },
    { name: "Zainab", phone: "08020000005", role: "STYLIST" as const, branchId: lekki.id },
    { name: "Ronke", phone: "08020000006", role: "STYLIST" as const, branchId: lekki.id },
    { name: "Ifeoma", phone: "08020000007", role: "STYLIST" as const, branchId: lekki.id },
    { name: "Kelechi", phone: "08020000008", role: "RECEPTIONIST" as const, branchId: ikeja.id },
  ];
  const staff = await Promise.all(
    staffData.map((member) =>
      db.staff.upsert({
        where: { phone: member.phone },
        create: { ...member, passwordHash },
        update: { name: member.name, role: member.role, branchId: member.branchId },
      }),
    ),
  );
  const staffByName = Object.fromEntries(staff.map((s) => [s.name, s]));

  // ---------------------------------------------------------------------
  // Settings (single global row — re-created each time the seed runs)
  // ---------------------------------------------------------------------
  await db.settings.deleteMany();
  await db.settings.create({
    data: {
      depositPercent: 20,
      freeCancellationHours: 24,
      arriveEarlyMinutes: 10,
      checkInPromptAfterMinutes: 15,
    },
  });

  // ---------------------------------------------------------------------
  // Sample bookings for "today" at Lekki
  // ---------------------------------------------------------------------
  await db.booking.deleteMany({ where: { branchId: lekki.id } });
  const customers = await Promise.all(
    [
      { name: "Bisi Adeyemi", phone: "08030000001" },
      { name: "Funke Lawal", phone: "08030000002" },
      { name: "Ngozi Eze", phone: "08030000003" },
      { name: "Tola Martins", phone: "08030000004" },
      { name: "Amaka Chukwu", phone: "08030000005" },
      { name: "Yemi Okoro", phone: "08030000006" },
      { name: "Ife Nwosu", phone: "08030000007" },
      { name: "Kemi Afolabi", phone: "08030000008" },
      { name: "Joy Bello", phone: "08030000009" },
      { name: "Chiamaka Obi", phone: "08030000010" },
    ].map((customer) =>
      db.customer.upsert({
        where: { phone: customer.phone },
        create: customer,
        update: { name: customer.name },
      }),
    ),
  );
  const customerByName = Object.fromEntries(customers.map((c) => [c.name, c]));

  const { weekday } = lagosToday();
  const isSunday = weekday === 0;

  type SeedBooking = {
    stylist: string;
    service: string;
    customer: string;
    startHour: number;
    startMinute: number;
    status: "BOOKED" | "CHECKED_IN" | "IN_SERVICE" | "DONE" | "NO_SHOW";
    source: "ONLINE" | "PHONE" | "WALK_IN";
    stylistRequested: boolean;
    checkedInAt?: { hour: number; minute: number };
    startedAt?: { hour: number; minute: number };
    finishedAt?: { hour: number; minute: number };
  };

  const bookingPlan: SeedBooking[] = isSunday
    ? [
        { stylist: "Blessing", service: "Wash and set", customer: "Bisi Adeyemi", startHour: 12, startMinute: 0, status: "BOOKED", source: "ONLINE", stylistRequested: false },
        { stylist: "Zainab", service: "Manicure", customer: "Funke Lawal", startHour: 13, startMinute: 0, status: "BOOKED", source: "ONLINE", stylistRequested: false },
        { stylist: "Ronke", service: "Wash and set", customer: "Ngozi Eze", startHour: 14, startMinute: 0, status: "BOOKED", source: "PHONE", stylistRequested: true },
      ]
    : [
        // Blessing
        { stylist: "Blessing", service: "Wash and set", customer: "Bisi Adeyemi", startHour: 9, startMinute: 0, status: "DONE", source: "ONLINE", stylistRequested: false, checkedInAt: { hour: 8, minute: 55 }, startedAt: { hour: 9, minute: 0 }, finishedAt: { hour: 9, minute: 58 } },
        { stylist: "Blessing", service: "Relaxer and styling", customer: "Funke Lawal", startHour: 10, startMinute: 10, status: "IN_SERVICE", source: "ONLINE", stylistRequested: false, checkedInAt: { hour: 10, minute: 5 }, startedAt: { hour: 10, minute: 10 } },
        { stylist: "Blessing", service: "Wig installation", customer: "Ngozi Eze", startHour: 11, startMinute: 50, status: "BOOKED", source: "PHONE", stylistRequested: false },
        // Zainab
        { stylist: "Zainab", service: "Makeup", customer: "Tola Martins", startHour: 9, startMinute: 0, status: "DONE", source: "ONLINE", stylistRequested: false, checkedInAt: { hour: 8, minute: 58 }, startedAt: { hour: 9, minute: 0 }, finishedAt: { hour: 10, minute: 25 } },
        { stylist: "Zainab", service: "Knotless braids", customer: "Amaka Chukwu", startHour: 11, startMinute: 0, status: "CHECKED_IN", source: "ONLINE", stylistRequested: true, checkedInAt: { hour: 11, minute: 14 } },
        { stylist: "Zainab", service: "Wash and set", customer: "Yemi Okoro", startHour: 16, startMinute: 0, status: "BOOKED", source: "ONLINE", stylistRequested: false },
        // Ronke
        { stylist: "Ronke", service: "Wash and set", customer: "Ife Nwosu", startHour: 10, startMinute: 0, status: "NO_SHOW", source: "ONLINE", stylistRequested: false },
        { stylist: "Ronke", service: "Relaxer and styling", customer: "Kemi Afolabi", startHour: 11, startMinute: 10, status: "IN_SERVICE", source: "WALK_IN", stylistRequested: false, checkedInAt: { hour: 11, minute: 10 }, startedAt: { hour: 11, minute: 10 } },
        { stylist: "Ronke", service: "Wash and set", customer: "Joy Bello", startHour: 12, startMinute: 50, status: "BOOKED", source: "ONLINE", stylistRequested: false },
        // Ifeoma
        { stylist: "Ifeoma", service: "Manicure", customer: "Chiamaka Obi", startHour: 9, startMinute: 0, status: "DONE", source: "ONLINE", stylistRequested: false, checkedInAt: { hour: 8, minute: 56 }, startedAt: { hour: 9, minute: 0 }, finishedAt: { hour: 9, minute: 42 } },
      ];

  const depositPercent = 20;

  for (const plan of bookingPlan) {
    const service = serviceByName[plan.service];
    const stylist = staffByName[plan.stylist];
    const customer = customerByName[plan.customer];
    const startsAt = lagosTime(plan.startHour, plan.startMinute);
    const endsAt = new Date(startsAt.getTime() + service.minDurationMinutes * 60_000);
    const blockedUntil = new Date(endsAt.getTime() + service.prepMinutes * 60_000);

    const isWalkIn = plan.source === "WALK_IN";
    const depositAmountKobo = isWalkIn ? 0 : Math.round((service.priceKobo * depositPercent) / 100);
    const depositStatus = isWalkIn ? "NONE" : plan.status === "NO_SHOW" ? "KEPT" : "PAID";

    await db.booking.create({
      data: {
        branchId: lekki.id,
        serviceId: service.id,
        stylistId: stylist.id,
        stylistRequested: plan.stylistRequested,
        customerId: customer.id,
        bookerPhone: customer.phone,
        startsAt,
        endsAt,
        blockedUntil,
        status: plan.status,
        source: plan.source,
        depositAmountKobo,
        depositStatus,
        checkedInAt: plan.checkedInAt ? lagosTime(plan.checkedInAt.hour, plan.checkedInAt.minute) : null,
        startedAt: plan.startedAt ? lagosTime(plan.startedAt.hour, plan.startedAt.minute) : null,
        finishedAt: plan.finishedAt ? lagosTime(plan.finishedAt.hour, plan.finishedAt.minute) : null,
      },
    });
  }

  console.log(`Seeded ${branches.length} branches, ${services.length} services, ${staff.length} staff, ${bookingPlan.length} bookings at Lekki for today.`);
}

function weekdayHoursMonToSat() {
  return [1, 2, 3, 4, 5, 6].map((weekday) => ({
    weekday,
    opensAtMinute: 9 * 60,
    closesAtMinute: 19 * 60,
  }));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
