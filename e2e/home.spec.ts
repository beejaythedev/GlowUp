import { expect, test } from "@playwright/test";

test("home page shows the GlowUp placeholder and links to the design tokens", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "GlowUp Salons" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "/dev/tokens" })).toHaveAttribute(
    "href",
    "/dev/tokens",
  );
});
