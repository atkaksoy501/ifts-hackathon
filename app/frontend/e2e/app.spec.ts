import { expect, test } from "@playwright/test";

test("renders module 1 dashboard", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Predictive Sizing + Blockage Advisor" })).toBeVisible();
  await expect(page.getByRole("button", { name: /ICTFT-201/ })).toBeVisible();
});
