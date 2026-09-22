import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const COOKIE = "skulgo_session";
const MAX_AGE = 60 * 60 * 24 * 7;

function secret() { return process.env.SESSION_SECRET || "skulgo-dev-session-secret-change-me"; }

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

type Session = { userId: string; schoolId: string; role: string; exp: number };

function sign(value: string) { return createHmac("sha256", secret()).update(value).digest("base64url"); }
function encode(session: Session) {
  const body = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${body}.${sign(body)}`;
}
function decode(token: string): Session | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = Buffer.from(sign(body));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const session = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Session;
    return session.exp > Math.floor(Date.now() / 1000) ? session : null;
  } catch { return null; }
}

export function setSession(response: Response, user: { id: string; schoolId: string; role: string }) {
  const token = encode({ userId: user.id, schoolId: user.schoolId, role: user.role, exp: Math.floor(Date.now() / 1000) + MAX_AGE });
  response.headers.append("Set-Cookie", `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
}
export function clearSession(response: Response) {
  response.headers.append("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}
export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  return token ? decode(token) : null;
}
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  return db.user.findFirst({
    where: { id: session.userId, schoolId: session.schoolId },
    select: { id: true, schoolId: true, name: true, email: true, role: true, teacher: { select: { id: true, teacherCode: true, approved: true } } }
  });
}
