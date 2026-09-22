import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { setSession, verifyPassword } from "@/lib/auth";

function clean(value: unknown) { return typeof value === "string" ? value.trim() : ""; }

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const schoolEmail = clean(body.schoolEmail).toLowerCase();
  const email = clean(body.email).toLowerCase();
  const password = clean(body.password);

  if (!schoolEmail || !email || !password)
    return NextResponse.json({ error: "School email, email and password are required" }, { status: 400 });

  const school = await db.school.findUnique({ where: { email: schoolEmail } });
  if (!school) return NextResponse.json({ error: "Invalid login details" }, { status: 401 });

  const user = await db.user.findUnique({ where: { schoolId_email: { schoolId: school.id, email } } });
  if (!user || !verifyPassword(password, user.passwordHash))
    return NextResponse.json({ error: "Invalid login details" }, { status: 401 });

  const response = NextResponse.json({ ok: true, role: user.role, name: user.name });
  setSession(response, user);
  return response;
}
