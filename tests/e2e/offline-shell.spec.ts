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
        return Boolean(registration?.active);
      });
    }, { timeout: 10000 }).toBeTruthy();

    const offlinePage = await page.evaluate(async () => {
      const cache = await caches.open("skulgo-shell-v4");
      const response = await cache.match("/offline");
      return Boolean(response && response.ok);
    });

    expect(offlinePage).toBeTruthy();

    const attendancePage = await page.evaluate(async () => {
      const cache = await caches.open("skulgo-shell-v4");
      const response = await cache.match("/attendance");
      return Boolean(response && response.ok);
    });
    expect(attendancePage).toBeTruthy();

    await context.setOffline(true);

    await page.goto("/attendance");
    await expect(page).toHaveTitle(/SkulGo/i);

    const offlineResponse = await page.evaluate(async () => {
      const cache = await caches.open("skulgo-shell-v4");
      const response = await cache.match("/offline");
      return response ? await response.text() : "";
    });

    expect(offlineResponse).toContain("You are offline");
  } finally {
    await context.close();
  }
});
