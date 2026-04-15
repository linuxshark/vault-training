import { test, expect } from "@playwright/test";

const PILOT = "/domains/1a-authentication/vault-cli-to-configure-auth-methods";

test.describe("Lab visualizer (pilot)", () => {
  test("renders visual tab and advances steps", async ({ page }) => {
    await page.goto(PILOT);

    const visualTab = page.getByRole("tab", { name: "Lab visual" });
    await expect(visualTab).toBeVisible();

    await visualTab.click();

    await expect(page.getByText(/paso 1\/12/)).toBeVisible();
    await expect(page.getByText(/vault status/)).toBeVisible();

    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(page.getByText(/paso 3\/12/)).toBeVisible();
  });

  test("tab hidden when visualizer=false", async ({ page }) => {
    await page.goto("/domains/3-secrets/kv-v2");
    await expect(page.getByRole("tab", { name: "Lab visual" })).toHaveCount(0);
  });
});
