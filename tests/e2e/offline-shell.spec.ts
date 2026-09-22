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
        if (!registration) return false;

        await registration.update();
        return registration.active !== null && navigator.serviceWorker.controller !== null;
      });
    }, { timeout: 10000 }).toBeTruthy();

    await context.setOffline(true);

    await page.goto("/login", { waitUntil: "commit" }).catch(() => {});
    await expect(page.getByRole("heading", { name: /offline/i })).toBeVisible();
  } finally {
    await context.close();
  }
});
