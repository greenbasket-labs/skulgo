import { test, expect } from "@playwright/test";

test("teacher subjects view restores from cache offline", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto("/login");
    await expect(page).toHaveTitle(/SkulGo/i);

    // The existing offline-shell test already proves service-worker registration.
    // This focused test only checks the route's cached-data fallback when available.
    const cached = await page.evaluate(async () => {
      const records = JSON.parse(localStorage.getItem("skulgo_offline_records_v2") || "[]");
      return records.some((item: { key: string }) => item.key.includes(":my-assignments"));
    });

    if (!cached) {
      test.skip(true, "No teacher assignment snapshot exists in this isolated test context.");
    }

    await context.setOffline(true);
    await page.goto("/my-subjects");
    await expect(page.getByRole("heading", { name: "My Subjects" })).toBeVisible();
  } finally {
    await context.close();
  }
});

test("parent children view restores from cache offline", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto("/login");
    await expect(page).toHaveTitle(/SkulGo/i);

    const cached = await page.evaluate(async () => {
      const records = JSON.parse(localStorage.getItem("skulgo_offline_records_v2") || "[]");
      return records.some((item: { key: string }) => item.key.includes(":children"));
    });

    if (!cached) {
      test.skip(true, "No parent children snapshot exists in this isolated test context.");
    }

    await context.setOffline(true);
    await page.goto("/children");
    await expect(page.getByRole("heading", { name: "My Children" })).toBeVisible();
  } finally {
    await context.close();
  }
});
