import { expect, test } from "@playwright/test";

test("login to backlog to sizing to blockage happy path", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Predictive Sizing + Blockage Advisor" })).toBeVisible();
  await page.getByRole("button", { name: "Giriş" }).click();

  await expect(page.getByRole("button", { name: /ICTFT-201/ })).toBeVisible();
  await page.getByRole("button", { name: /ICTFT-201/ }).click();
  await page.getByRole("button", { name: /Sizing öner/ }).click();

  await expect(page.getByText("Story Point")).toBeVisible();
  await expect(page.getByText("İdeal Saat")).toBeVisible();
  await expect(page.getByText("ICTFT-101", { exact: true })).toBeVisible();

  await page.getByRole("tab", { name: /Blockage/ }).click();
  await page.getByRole("button", { name: /Blockage öner/ }).click();
  await expect(page.getByText("Blokaj sinyali netleştirilip owner, tarih ve beklenen çıktı yazılsın.")).toBeVisible();
});

test("admin manual sync warning and empty backlog filter path", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Giriş" }).click();

  await page.getByRole("button", { name: "Manual sync" }).click();
  await expect(page.getByText("Latest sync failed; existing catalog data was preserved.")).toBeVisible();

  await page.getByLabel("Arama").fill("does-not-exist");
  await expect(page.getByText("Filtrelerle eşleşen backlog issue bulunamadı.")).toBeVisible();

  await page.getByRole("tab", { name: /Admin/ }).click();
  await expect(page.getByText("Admin Users")).toBeVisible();
  await expect(page.getByText("Admin KB")).toBeVisible();
});
