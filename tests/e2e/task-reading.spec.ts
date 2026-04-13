import { test, expect } from "@playwright/test";

test("task view loads and tabs switch", async ({ page }) => {
  await page.goto("/domains/3-secrets/kv-v2");
  await expect(page.getByRole("heading", { name: /KV v2/i })).toBeVisible();
  await page.getByRole("tab", { name: /Notas técnicas/i }).click();
  await expect(page.locator('[role="tabpanel"]')).toBeVisible();
});
