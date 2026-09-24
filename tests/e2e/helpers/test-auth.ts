import { db } from "../../../lib/db";
import { hashPassword, hashPin } from "../../../lib/auth";
import type { Page } from "@playwright/test";

export const TEST_PIN = "2468";
export const TEST_PASSWORD = "SkulGoE2E123!";

export async function ensureTestUser(input: {
  name: string;
  email: string;
  password?: string;
  pin?: string;
}) {
  const password = input.password ?? TEST_PASSWORD;
  const pin = input.pin ?? TEST_PIN;
  if (!/^\d{4,6}$/.test(pin)) throw new Error("Test PIN must be 4-6 digits.");
  const passwordHash = hashPassword(password);
  const pinHash = hashPin(pin);

  await db.user.upsert({
    where: { email: input.email.toLowerCase() },
    create: {
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
      emailVerifiedAt: new Date(),
      pinHash,
      pinFailedAttempts: 0,
      pinLockedUntil: null,
    },
    update: {
      name: input.name,
      passwordHash,
      emailVerifiedAt: new Date(),
      pinHash,
      pinFailedAttempts: 0,
      pinLockedUntil: null,
    },
  });

  return { email: input.email.toLowerCase(), password, pin };
}

export async function loginTestUser(
  page: Page,
  input: { email: string; password?: string; membershipId?: string; pin?: string },
) {
  const password = input.password ?? TEST_PASSWORD;
  const pin = input.pin ?? TEST_PIN;

  await page.goto("/login");
  await page.getByLabel("Email").fill(input.email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  const pinInput = page.locator('input[placeholder="Workspace PIN"]');
  if (await pinInput.isVisible().catch(() => false)) {
    await pinInput.fill(pin);
    await page.getByRole("button", { name: "Unlock workspace" }).click();
  }

  await page.waitForURL(/\/dashboard(?:\?.*)?$/);
}

export async function createAndLoginTestUser(
  page: Page,
  input: { name: string; email: string; password?: string; pin?: string },
) {
  const account = await ensureTestUser(input);
  await loginTestUser(page, account);
  return account;
}

export async function selectTestWorkspace(
  page: Page,
  membershipId: string,
) {
  const response = await page.request.post("/api/workspaces/select", {
    data: { membershipId, pin: TEST_PIN },
  });
  return response;
}
