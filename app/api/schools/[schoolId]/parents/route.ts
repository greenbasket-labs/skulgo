import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function GET(_: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  return NextResponse.json(await db.parent.findMany({
    where: { user: { schoolId } },
    include: { user: { select: { id: true, name: true, email: true } }, links: { include: { student: { select: { id: true, admissionId: true, firstName: true, lastName: true } } } } }
  }));
}

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "").trim();
  const studentId = String(body?.studentId ?? "");

  if (!name || !email || !password || !studentId)
    return NextResponse.json({ error: "name, email, password and studentId are required" }, { status: 400 });

  const student = await db.student.findFirst({ where: { id: studentId, schoolId } });
  if (!student) return NextResponse.json({ error: "Student not found in this school" }, { status: 404 });

  const existing = await db.user.findUnique({ where: { schoolId_email: { schoolId, email } } });
  if (existing) return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });

  const parent = await db.$transaction(async tx => {
    const user = await tx.user.create({ data: { schoolId, name, email, passwordHash: hashPassword(password), role: "PARENT" } });
    const created = await tx.parent.create({ data: { userId: user.id } });
    await tx.parentStudent.create({ data: { parentId: created.id, studentId, approved: true } });
    return tx.parent.findUnique({ where: { id: created.id }, include: { user: { select: { id: true, name: true, email: true } }, links: true } });
  });

  return NextResponse.json(parent, { status: 201 });
}