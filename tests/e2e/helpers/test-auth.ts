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

  await page.goto("/login");
  await page.getByLabel("Email").fill(input.email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  const pinInput = page.locator('input[placeholder="Workspace PIN"]');
  if (await pinInput.isVisible().catch(() => false)) {
    await pinInput.fill(pin);
    await page.getByRole("button", { name: "Unlock workspace" }).click();
  }

  // Deterministically select a school workspace when the account has multiple
  // memberships and the login page has not selected one.
  const meResponse = await page.request.get("/api/auth/me");
  if (meResponse.ok()) {
    const me = await meResponse.json().catch(() => ({}));
    if (!me?.user?.membership) {
      const loginResponse = await page.request.post("/api/auth/login", {
        data: { email: input.email, password },
      });
      if (loginResponse.ok()) {
        const body = await loginResponse.json().catch(() => ({}));
        const workspaces = Array.isArray(body.workspaces) ? body.workspaces : [];
        const workspace = input.membershipId
          ? workspaces.find((item: { membershipId: string }) => item.membershipId === input.membershipId)
          : workspaces[0];
        if (workspace) {
          const selected = await page.request.post("/api/workspaces/select", {
            data: { membershipId: workspace.membershipId, pin },
          });
          if (!selected.ok()) {
            throw new Error("Workspace selection failed: " + selected.status() + " " + await selected.text());
          }
        }
      }
    }
  }

  await page.waitForURL(/\/dashboard(?:\?.*)?$/);
  // Workspace selection is performed through an API request above. Reload so
  // the server-rendered dashboard observes the newly selected membership.
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
