import { test, expect } from "@playwright/test";

test("advancing status persists across reload", async ({ page }) => {
  await page.goto("/domains/3-secrets/kv-v2");
  await page.getByRole("button", { name: /No empezado|Leyendo|Revisado|Dominado/ }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: /Leyendo|Revisado|Dominado/ })).toBeVisible();
});
