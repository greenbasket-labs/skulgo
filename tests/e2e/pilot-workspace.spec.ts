import { test, expect } from "@playwright/test";

test("personal account can open the school workspace doorway", async ({ page }) => {
  const email = `pilot-${Date.now()}@example.com`;

  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: /create.*account|sign up/i })).toBeVisible();

  const inputs = page.locator("input");
  await inputs.nth(0).fill("Pilot Owner");
  await inputs.nth(1).fill(email);
  await inputs.nth(2).fill("PilotPassword123!");

  await page.getByRole("button").filter({ hasText: /create|sign up/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText(/personal skulgo account/i)).toBeVisible();
});
