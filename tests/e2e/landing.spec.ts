import { test, expect } from "@playwright/test";

test("dashboard renders and shows at least one objective", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Bienvenido" })).toBeVisible();
  await expect(page.getByText(/Objetivo \d+/).first()).toBeVisible();
});
