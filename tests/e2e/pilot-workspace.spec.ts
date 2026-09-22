import { test, expect } from "@playwright/test";

test("personal account can create and enter a school workspace", async ({ page }) => {
  const email = `pilot-${Date.now()}@example.com`;

  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: /create your personal account/i })).toBeVisible();

  const inputs = page.locator("input");
  await inputs.nth(0).fill("Pilot Owner");
  await inputs.nth(1).fill(email);
  await inputs.nth(2).fill("PilotPassword123!");

  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText(/personal skulgo account/i)).toBeVisible();

  await page.goto("/register");
  await expect(page).toHaveURL(/\/schools\/new/);
  await page.getByPlaceholder("School name").fill("Pilot Community School");
  await page.getByPlaceholder("School abbreviation").fill(`PCS${String(Date.now()).slice(-4)}`);
  await page.getByPlaceholder("Address").fill("Pilot Road");
  await page.getByPlaceholder("Phone").fill("08000000000");
  await page.getByPlaceholder("School email").fill(`school-${Date.now()}@example.com`);
  await page.getByRole("button", { name: /create school/i }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText(/good morning, pilot/i)).toBeVisible();
  await expect(page.getByRole("complementary").getByText(/pilot community school/i)).toBeVisible();
  await expect(page.getByText(/admin/i)).toBeVisible();
  await expect(page.getByRole("link", { name: "Applications" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Classes" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Subjects" })).toBeVisible();
});
