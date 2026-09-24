import { test, expect, type Page } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const adminPin = process.env.E2E_ADMIN_PIN;

test.describe("SkulGo public/auth smoke", () => {
  test("login page is usable", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Create one" })).toHaveAttribute("href", "/signup");
  });
});

async function loginAsAdmin(page: Page) {
  test.skip(!adminEmail || !adminPassword || !adminPin,
    "Set E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD and E2E_ADMIN_PIN for authenticated E2E tests.");

  await page.goto("/login");
  await page.getByLabel("Email").fill(adminEmail!);
  await page.getByLabel("Password").fill(adminPassword!);
  await page.getByRole("button", { name: "Sign in" }).click();

  const workspaceUnlock = page.getByRole("heading", { name: /workspace/i });
  const dashboard = page.getByRole("heading", { name: /dashboard/i });

  await expect(workspaceUnlock.or(dashboard)).toBeVisible({ timeout: 10000 });

  if (await page.getByText(/Enter your 4-6 digit PIN/i).isVisible().catch(() => false)) {
    const pinInput = page.locator('input[inputmode="numeric"], input[type="password"]').last();
    await pinInput.fill(adminPin!);
    const unlock = page.getByRole("button", { name: /unlock|continue/i });
    await unlock.click();
  }

  await page.waitForURL(/\/dashboard(?:\?.*)?$/);
}

test.describe("SkulGo authenticated admin smoke", () => {
  test("admin can enter workspace and open core pages", async ({ page }) => {
    await loginAsAdmin(page);

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/Students/i).first()).toBeVisible();

    await page.goto("/applications");
    await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();

    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: /Result Settings/i })).toBeVisible();

    await page.goto("/results");
    await expect(page.getByRole("heading", { name: /Results/i })).toBeVisible();

    await page.goto("/fees");
    await expect(page.getByRole("heading", { name: /Fees/i })).toBeVisible();
  });

  test("admin settings page exposes school-controlled result configuration", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/settings");

    await expect(page.getByText(/Result unlock/i).first()).toBeVisible();
    await expect(page.getByText(/Grading/i).first()).toBeVisible();
    await expect(page.getByText(/Report card/i).first()).toBeVisible();
  });

  test("admin can reach applications without losing workspace", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/applications");

    await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();
    await expect(page).toHaveURL(/\/applications/);
  });
});
