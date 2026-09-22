import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, setSession } from "@/lib/auth";

export async function POST(request: Request) {
  const b = await request.json().catch(() => null);
  const name = String(b?.name ?? "").trim(), email = String(b?.email ?? "").trim().toLowerCase(), password = String(b?.password ?? "").trim();
  if (!name || !email || !password) return NextResponse.json({ error: "name, email and password are required" }, { status: 400 });
  if (await db.user.findUnique({ where: { email } })) return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  const user = await db.user.create({ data: { name, email, passwordHash: hashPassword(password) } });
  const response = NextResponse.json({ id: user.id, name: user.name, email: user.email }, { status: 201 });
  setSession(response, { id: user.id, schoolId: "", role: "" });
  return response;
}
