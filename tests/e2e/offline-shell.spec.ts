import { test, expect } from "@playwright/test";

test("SkulGo registers its offline app shell", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto("/login");
    await expect(page).toHaveTitle(/SkulGo/i);

    await expect.poll(async () => {
      return page.evaluate(async () => {
        if (!("serviceWorker" in navigator)) return false;
        const registration = await navigator.serviceWorker.getRegistration("/sw.js");
        return Boolean(registration);
      });
    }, { timeout: 10000 }).toBeTruthy();

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole("heading", { name: "You are offline" })).toBeVisible();
  } finally {
    await context.close();
  }
});
