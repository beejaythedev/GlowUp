import { expect, test } from "@playwright/test";

test("welcome page shows the booking pitch and links to start booking", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Book your next glow in two minutes." }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Book an appointment" })).toHaveAttribute(
    "href",
    "/book",
  );
});
