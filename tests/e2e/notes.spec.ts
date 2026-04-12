import { test, expect } from "@playwright/test";

test("notes autosave and persist", async ({ page }) => {
  await page.goto("/domains/3-secrets/kv-v2");
  const editor = page.locator("#note-editor");
  await editor.fill("nota de prueba e2e");
  await page.waitForTimeout(1200);
  await page.reload();
  await expect(page.locator("#note-editor")).toHaveValue("nota de prueba e2e");
});
