import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function GET(_: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  return NextResponse.json(await db.user.findMany({
    where: { schoolId, role: "CASHIER" },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" }
  }));
}

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "").trim();

  if (!name || !email || !password)
    return NextResponse.json({ error: "name, email and password are required" }, { status: 400 });

  const school = await db.school.findUnique({ where: { id: schoolId } });
  if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

  const existing = await db.user.findUnique({ where: { schoolId_email: { schoolId, email } } });
  if (existing) return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });

  const user = await db.user.create({
    data: { schoolId, name, email, passwordHash: hashPassword(password), role: "CASHIER" }
  });
  return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role }, { status: 201 });
}