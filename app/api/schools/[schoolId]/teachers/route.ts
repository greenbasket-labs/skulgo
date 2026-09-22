import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { makeTeacherId } from "@/lib/ids";
import { randomBytes, scryptSync } from "node:crypto";

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  const teachers = await db.teacher.findMany({
    where: { user: { schoolId } },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { user: { name: "asc" } },
  });
  return NextResponse.json(teachers);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "").trim();

  if (!name || !email || !password) {
    return NextResponse.json({ error: "name, email and password are required" }, { status: 400 });
  }

  const school = await db.school.findUnique({ where: { id: schoolId } });
  if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

  const existing = await db.user.findUnique({
    where: { schoolId_email: { schoolId, email } },
  });
  if (existing) return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });

  const teacherCode = makeTeacherId(school.abbr, new Date().getFullYear());
  const teacher = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { schoolId, name, email, passwordHash: hashPassword(password), role: "TEACHER" },
    });
    return tx.teacher.create({
      data: { userId: user.id, teacherCode },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  });

  return NextResponse.json(teacher, { status: 201 });
}
