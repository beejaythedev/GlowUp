/**
 * Dev utility: prints today's Lekki schedule from the database, so M1-2's
 * seed data can be checked by eye. Run with `npm run db:print-lekki`.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const LAGOS_OFFSET_MINUTES = 60; // WAT = UTC+1, no DST.

function formatLagosTime(date: Date): string {
  const lagos = new Date(date.getTime() + LAGOS_OFFSET_MINUTES * 60_000);
  const hours = lagos.getUTCHours();
  const minutes = lagos.getUTCMinutes().toString().padStart(2, "0");
  const period = hours >= 12 ? "pm" : "am";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${minutes}${period}`;
}

async function main() {
  const lekki = await db.branch.findUnique({ where: { name: "GlowUp Lekki" } });
  if (!lekki) {
    console.error("GlowUp Lekki not found — run `npx prisma db seed` first.");
    process.exitCode = 1;
    return;
  }

  const bookings = await db.booking.findMany({
    where: { branchId: lekki.id },
    include: { service: true, stylist: true, customer: true },
    orderBy: [{ stylistId: "asc" }, { startsAt: "asc" }],
  });

  if (bookings.length === 0) {
    console.log("No bookings found at Lekki — run `npx prisma db seed` first.");
    return;
  }

  console.log(`GlowUp Lekki — ${bookings.length} bookings today\n`);

  let currentStylist = "";
  for (const booking of bookings) {
    if (booking.stylist.name !== currentStylist) {
      currentStylist = booking.stylist.name;
      console.log(`${currentStylist}:`);
    }
    const requested = booking.stylistRequested ? " · Requested" : "";
    console.log(
      `  ${formatLagosTime(booking.startsAt)}–${formatLagosTime(booking.endsAt)} ` +
        `${booking.service.name} — ${booking.customer.name} ` +
        `[${booking.status}${requested}]`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
