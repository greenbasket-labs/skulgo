import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { makeStudentId } from "@/lib/ids";
import { hashPassword } from "@/lib/auth";

export async function GET(_: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  return NextResponse.json(await db.student.findMany({
    where: { schoolId }, include: { class: true, user: { select: { id: true, email: true } } },
    orderBy: { lastName: "asc" }
  }));
}

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  const body = await request.json().catch(() => null);
  const firstName = String(body?.firstName ?? "").trim();
  const lastName = String(body?.lastName ?? "").trim();
  const classId = String(body?.classId ?? "");
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "").trim();

  if (!firstName || !lastName || !classId || !email || !password)
    return NextResponse.json({ error: "firstName, lastName, classId, email and password are required" }, { status: 400 });

  const school = await db.school.findUnique({ where: { id: schoolId } });
  const schoolClass = await db.schoolClass.findFirst({ where: { id: classId, schoolId }, include: { section: true } });
  if (!school || !schoolClass) return NextResponse.json({ error: "Class does not belong to this school" }, { status: 404 });

  const existing = await db.user.findUnique({ where: { schoolId_email: { schoolId, email } } });
  if (existing) return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });

  const existingIds = await db.student.findMany({ where: { schoolId }, select: { admissionId: true } });
  const admissionId = makeStudentId(school.abbr, new Date().getFullYear(), schoolClass.section.name, existingIds.map(x => x.admissionId));

  const student = await db.$transaction(async tx => {
    const user = await tx.user.create({
      data: { schoolId, name: `${firstName} ${lastName}`, email, passwordHash: hashPassword(password), role: "STUDENT" }
    });
    return tx.student.create({
      data: { schoolId, firstName, lastName, classId, admissionId, userId: user.id },
      include: { user: { select: { id: true, email: true } } }
    });
  });

  return NextResponse.json(student, { status: 201 });
}