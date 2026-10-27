import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";

// Distinctive enough not to collide with real seed/dev data.
const TEST_PHONE = "08099998877";

/**
 * Runs the DB check/cleanup through `tsx` in a child process. Playwright
 * Test compiles spec files to CommonJS, which can't load the Prisma
 * generated client's `import.meta` usage directly (see
 * scripts/e2e-booking-db.ts).
 */
function runDbScript(command: "verify" | "cleanup", phone: string): string {
  return execFileSync(
    "node",
    ["--env-file=.env", "--import", "tsx", "scripts/e2e-booking-db.ts", command, phone],
    { encoding: "utf8" },
  );
}

test.afterEach(() => {
  runDbScript("cleanup", TEST_PHONE);
});

test("a guest books knotless braids at Lekki from start to confirmation", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Book an appointment" }).click();
  await expect(page).toHaveURL(/\/book$/);

  // Lekki is the default (and first-seeded) branch — no branch change needed.
  await expect(page.getByText("GlowUp Lekki")).toBeVisible();
  await page.getByRole("button", { name: /Knotless braids/ }).click();
  await page.getByRole("link", { name: "Continue" }).click();

  await expect(page).toHaveURL(/\/book\/time/);

  // Find the first day (within the 6-day window shown) with a real available
  // time — "today" may already be past the service's last-start cutoff.
  const dayButtons = page.locator(".grid-cols-6 button");
  const dayCount = await dayButtons.count();
  const timeButtons = page.getByRole("button", { name: /^\d{1,2}:\d{2}\s?(am|pm)$/i });
  let foundTimes = false;
  for (let day = 0; day < dayCount; day++) {
    if (day > 0) await dayButtons.nth(day).click();
    if ((await timeButtons.count()) > 0) {
      foundTimes = true;
      break;
    }
  }
  expect(foundTimes).toBe(true);

  await timeButtons.first().click();
  await page.getByRole("link", { name: "Continue" }).click();

  await expect(page).toHaveURL(/\/book\/review/);
  await page.getByLabel("Your name").fill("E2E Guest");
  await page.getByLabel("Phone number").fill(TEST_PHONE);
  await page.getByRole("button", { name: /Pay .* deposit/ }).click();

  await page.waitForURL(/\/book\/pay/);
  await page.getByRole("button", { name: /^Pay .* deposit$/ }).click();

  await page.waitForURL(/\/book\/confirmed/);
  await expect(page.getByRole("heading", { name: "You're booked, E2E" })).toBeVisible();
  await expect(page.getByText(/Please arrive by/)).toBeVisible();
  await expect(page.getByText(/GU-[A-Z0-9]{6}/)).toBeVisible();

  const booking = JSON.parse(runDbScript("verify", TEST_PHONE));
  expect(booking.branchName).toBe("GlowUp Lekki");
  expect(booking.serviceName).toBe("Knotless braids");
  expect(booking.depositStatus).toBe("PAID");
  expect(booking.status).toBe("BOOKED");
});
