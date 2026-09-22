import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  const assignments = await db.teacherAssignment.findMany({
    where: { schoolId },
    include: {
      teacher: { include: { user: { select: { name: true, email: true } } } },
      class: { include: { section: { select: { name: true } } } },
      subject: true,
    },
    orderBy: { id: "asc" },
  });
  return NextResponse.json(assignments);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  const body = await request.json();
  const teacherId = String(body.teacherId ?? "");
  const classId = String(body.classId ?? "");
  const subjectId = String(body.subjectId ?? "");

  if (!teacherId || !classId || !subjectId) {
    return NextResponse.json({ error: "teacherId, classId and subjectId are required" }, { status: 400 });
  }

  const [teacher, schoolClass, subject] = await Promise.all([
    db.teacher.findFirst({ where: { id: teacherId, user: { memberships: { some: { schoolId, active: true, role: "TEACHER" } } } } }),
    db.schoolClass.findFirst({ where: { id: classId, schoolId } }),
    db.subject.findFirst({ where: { id: subjectId, schoolId } }),
  ]);

  if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
  if (!schoolClass) return NextResponse.json({ error: "Class not found" }, { status: 404 });
  if (!subject) return NextResponse.json({ error: "Subject not found" }, { status: 404 });
  if (!teacher.approved) return NextResponse.json({ error: "Teacher must be approved first" }, { status: 400 });

  const assignment = await db.teacherAssignment.create({
    data: { schoolId, teacherId, classId, subjectId },
  });

  return NextResponse.json(assignment, { status: 201 });
}
