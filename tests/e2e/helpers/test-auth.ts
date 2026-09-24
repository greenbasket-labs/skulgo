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

  const existing = await db.user.findUnique({ where: { email: input.email.toLowerCase() }, select: { id: true } });

  if (existing) {
    await db.deviceSession.updateMany({ where: { userId: existing.id, revokedAt: null }, data: { revokedAt: new Date() } });
  }

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

  // Use the API as the authoritative E2E login path. This avoids depending on
  // the login page's multi-workspace UI state and guarantees the intended
  // school membership is selected before the dashboard is asserted.
  const loginResponse = await page.request.post("/api/auth/login", {
    data: { email: input.email, password },
  });
  if (!loginResponse.ok()) {
    throw new Error("Test login failed: " + loginResponse.status() + " " + await loginResponse.text());
  }

  const body = await loginResponse.json().catch(() => ({}));
  const workspaces = Array.isArray(body.workspaces) ? body.workspaces : [];

  if (workspaces.length > 0) {
    const workspace = input.membershipId
      ? workspaces.find((item: { membershipId: string }) => item.membershipId === input.membershipId)
      : workspaces.find((item: { role?: string }) => item.role === "ADMIN") ?? workspaces[0];

    if (!workspace) {
      throw new Error("Requested test workspace was not found.");
    }

    const selected = await page.request.post("/api/workspaces/select", {
      data: { membershipId: workspace.membershipId, pin },
    });

    if (!selected.ok()) {
      throw new Error("Workspace selection failed: " + selected.status() + " " + await selected.text());
    }
  }

  await page.goto("/dashboard");
  await page.waitForLoadState("domcontentloaded");
  await page.reload();
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
