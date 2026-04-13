import { test, expect } from "@playwright/test";

test("keyboard shortcuts switch tabs", async ({ page }) => {
  await page.goto("/domains/3-secrets/kv-v2");
  await page.keyboard.press("2");
  await expect(page.getByRole("tab", { name: /Notas técnicas/i })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});
