import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const COOKIE = "skulgo_session";
const OWNER_COOKIE = "skulgo_owner_session";
const DEVICE_COOKIE = "skulgo_device";
const MAX_AGE = 60 * 60 * 24 * 7;
const DEVICE_MAX_AGE = 60 * 60 * 24 * 30;
const OWNER_DEVICE_INACTIVITY_DAYS = 7;
const DEFAULT_DEVICE_INACTIVITY_DAYS = 30;

type Session = {
  userId: string;
  membershipId: string | null;
  deviceId: string;
  exp: number;
};

function secret() {
  const value = process.env.SESSION_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET is required in production");
  return "skulgo-dev-session-secret-change-me";
}

function hashValue(value: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(value, salt, 64).toString("hex")}`;
}

function verifyValue(value: string, stored: string) {
  const [kind, salt, hex] = stored.split(":");
  if (kind !== "scrypt" || !salt || !hex) return false;
  const actual = scryptSync(value, salt, 64);
  const expected = Buffer.from(hex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function hashPassword(password: string) {
  return hashValue(password);
}

export function verifyPassword(password: string, stored: string) {
  return verifyValue(password, stored);
}

export function hashPin(pin: string) {
  return hashValue(pin);
}

export function verifyPin(pin: string, stored: string) {
  return verifyValue(pin, stored);
}

function hashDeviceToken(token: string) {
  return createHmac("sha256", secret()).update(`device:${token}`).digest("hex");
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function encode(session: Session) {
  const body = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decode(token: string): Session | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const a = Buffer.from(signature);
  const b = Buffer.from(sign(body));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const session = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Session;
    if (!session.userId || !session.deviceId || session.exp <= Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch {
    return null;
  }
}

function isStale(lastSeenAt: Date, now: Date, inactivityDays: number) {
  return now.getTime() - lastSeenAt.getTime() >= inactivityDays * 24 * 60 * 60 * 1000;
}

export async function createOrReuseDevice(
  userId: string,
  response: Response,
  maxActiveDevices = 2,
  inactivityDays = DEFAULT_DEVICE_INACTIVITY_DAYS
) {
  const cookieToken = (await cookies()).get(DEVICE_COOKIE)?.value;
  const now = new Date();

  if (cookieToken) {
    const existing = await db.deviceSession.findFirst({
      where: { userId, deviceHash: hashDeviceToken(cookieToken), revokedAt: null },
    });

    if (existing) {
      if (isStale(existing.lastSeenAt, now, inactivityDays)) {
        await db.deviceSession.update({
          where: { id: existing.id },
          data: { revokedAt: now },
        });
      } else {
        await db.deviceSession.update({ where: { id: existing.id }, data: { lastSeenAt: now } });
        return existing.id;
      }
    }
  }

  const activeDevices = await db.deviceSession.findMany({
    where: { userId, revokedAt: null },
    select: { id: true, lastSeenAt: true },
  });

  const staleIds = activeDevices
    .filter(device => isStale(device.lastSeenAt, now, inactivityDays))
    .map(device => device.id);

  if (staleIds.length) {
    await db.deviceSession.updateMany({
      where: { id: { in: staleIds } },
      data: { revokedAt: now },
    });
  }

  const active = activeDevices.length - staleIds.length;
  if (active >= maxActiveDevices) return null;

  const raw = randomBytes(32).toString("base64url");
  const device = await db.deviceSession.create({
    data: { userId, deviceHash: hashDeviceToken(raw), lastSeenAt: now },
  });

  response.headers.append(
    "Set-Cookie",
    `${DEVICE_COOKIE}=${raw}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${DEVICE_MAX_AGE}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
  );

  return device.id;
}

export function setSession(
  response: Response,
  user: { id: string },
  membershipId: string | null = null,
  deviceId: string
) {
  const token = encode({
    userId: user.id,
    membershipId,
    deviceId,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE,
  });

  response.headers.append(
    "Set-Cookie",
    `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
  );
}

export function setOwnerSession(response: Response, user: { id: string }, deviceId: string) {
  const token = encode({
    userId: user.id,
    membershipId: null,
    deviceId,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE,
  });

  response.headers.append(
    "Set-Cookie",
    `${OWNER_COOKIE}=${token}; Path=/owner; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
  );
}

export async function clearSession(response: Response) {
  const session = await getSession();
  if (session) {
    await db.deviceSession.updateMany({
      where: { id: session.deviceId, userId: session.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  response.headers.append("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  response.headers.append("Set-Cookie", `${OWNER_COOKIE}=; Path=/owner; HttpOnly; SameSite=Lax; Max-Age=0`);
  response.headers.append("Set-Cookie", `${DEVICE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

export async function getSession() {
  const token = (await cookies()).get(COOKIE)?.value;
  return token ? decode(token) : null;
}

export async function getOwnerSession() {
  const token = (await cookies()).get(OWNER_COOKIE)?.value;
  return token ? decode(token) : null;
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const device = await db.deviceSession.findFirst({
    where: { id: session.deviceId, userId: session.userId, revokedAt: null },
    select: { id: true, lastSeenAt: true },
  });
  if (!device) return null;

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      pinHash: true,
      pinFailedAttempts: true,
      pinLockedUntil: true,
      memberships: {
        where: { active: true },
        include: { school: { select: { id: true, name: true, abbr: true } } },
        orderBy: { createdAt: "asc" },
      },
      teacher: { select: { id: true, teacherCode: true, approved: true } },
      student: { select: { id: true, admissionId: true, classId: true } },
      parent: { select: { id: true } },
    },
  });

  if (!user) return null;

  const ownerEmail = process.env.SKULGO_OWNER_EMAIL?.trim().toLowerCase();
  const inactivityDays =
    ownerEmail && user.email.toLowerCase() === ownerEmail
      ? OWNER_DEVICE_INACTIVITY_DAYS
      : DEFAULT_DEVICE_INACTIVITY_DAYS;
  const now = new Date();

  if (isStale(device.lastSeenAt, now, inactivityDays)) {
    await db.deviceSession.update({
      where: { id: device.id },
      data: { revokedAt: now },
    });
    return null;
  }

  await db.deviceSession.update({
    where: { id: device.id },
    data: { lastSeenAt: now },
  });

  const membership = session.membershipId
    ? user.memberships.find(m => m.id === session.membershipId) ?? null
    : null;

  return { ...user, membership, session };
}
