// Run via `tsx` as a child process from e2e/booking.spec.ts. Playwright Test
// transforms test files to CommonJS, which can't load the Prisma generated
// client's ESM-only `import.meta` usage — the same mismatch `tsx` was added
// to fix for the seed/print scripts (docs/DECISIONS.md). Keeping DB access
// here, run through `tsx`, sidesteps that instead of reaching for a second
// Postgres client just for e2e.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const [, , command, phone] = process.argv;

async function main() {
  if (command === "verify") {
    if (!phone) throw new Error("Usage: verify <bookerPhone>");
    const booking = await db.booking.findFirstOrThrow({
      where: { bookerPhone: phone },
      include: { branch: true, service: true },
    });
    process.stdout.write(
      JSON.stringify({
        branchName: booking.branch.name,
        serviceName: booking.service.name,
        depositStatus: booking.depositStatus,
        status: booking.status,
      }),
    );
  } else if (command === "cleanup") {
    if (!phone) throw new Error("Usage: cleanup <bookerPhone>");
    await db.booking.deleteMany({ where: { bookerPhone: phone } });
    await db.customer.deleteMany({ where: { phone } });
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
