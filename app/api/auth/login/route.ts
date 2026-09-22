import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { setSession, verifyPassword } from "@/lib/auth";

function clean(v: unknown) { return typeof v === "string" ? v.trim() : ""; }

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const email = clean(body.email).toLowerCase();
  const password = clean(body.password);
  if (!email || !password) return NextResponse.json({ error: "Email and password are required" }, { status: 400 });

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordHash))
    return NextResponse.json({ error: "Invalid login details" }, { status: 401 });

  if (!user.schoolId || !user.role)
    return NextResponse.json({ ok: true, pending: true, name: user.name, message: "Your account is waiting for school approval." });

  const response = NextResponse.json({ ok: true, role: user.role, name: user.name });
  setSession(response, user);
  return response;
}
