import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const COOKIE = "skulgo_session";
const MAX_AGE = 60 * 60 * 24 * 7;

type Session = {
  userId: string;
  membershipId: string | null;
  exp: number;
};

function secret() {
  const value = process.env.SESSION_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET is required in production");
  return "skulgo-dev-session-secret-change-me";
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password: string, stored: string) {
  const [kind, salt, hex] = stored.split(":");
  if (kind !== "scrypt" || !salt || !hex) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(hex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
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
    const session = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as Session;

    return session.exp > Math.floor(Date.now() / 1000) ? session : null;
  } catch {
    return null;
  }
}

export function setSession(
  response: Response,
  user: { id: string },
  membershipId: string | null = null
) {
  const token = encode({
    userId: user.id,
    membershipId,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE,
  });

  response.headers.append(
    "Set-Cookie",
    `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
  );
}

export function clearSession(response: Response) {
  response.headers.append(
    "Set-Cookie",
    `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}

export async function getSession() {
  const token = (await cookies()).get(COOKIE)?.value;
  return token ? decode(token) : null;
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      memberships: {
        where: { active: true },
        include: {
          school: {
            select: { id: true, name: true, abbr: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      teacher: {
        select: { id: true, teacherCode: true, approved: true },
      },
      student: {
        select: { id: true, admissionId: true, classId: true },
      },
      parent: {
        select: { id: true },
      },
    },
  });

  if (!user) return null;

  const membership = session.membershipId
    ? user.memberships.find(m => m.id === session.membershipId) ?? null
    : null;

  return {
    ...user,
    membership,
    session,
  };
}
