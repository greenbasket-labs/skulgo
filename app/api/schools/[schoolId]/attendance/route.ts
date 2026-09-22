import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  const user = await getCurrentUser();
  if (!user?.membership || user.membership.schoolId !== schoolId) {
    return NextResponse.json({ error: "School access required" }, { status: 403 });
  }
  const classId = request.nextUrl.searchParams.get("classId");
  const date = request.nextUrl.searchParams.get("date");

  const records = await db.attendance.findMany({
    where: {
      schoolId,
      ...(classId ? { classId } : {}),
      ...(date ? { date: new Date(date) } : {}),
    },
    include: {
      student: { select: { id: true, admissionId: true, firstName: true, lastName: true } },
      class: { select: { id: true, name: true, arm: true } },
    },
    orderBy: [{ date: "desc" }, { student: { lastName: "asc" } }],
  });

  return NextResponse.json(records);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  const user = await getCurrentUser();
  if (!user?.membership || user.membership.schoolId !== schoolId || user.membership.role !== "TEACHER") {
    return NextResponse.json({ error: "Teacher access required" }, { status: 403 });
  }

  const teacher = await db.teacher.findUnique({
    where: { userId: user.id },
    select: { id: true, approved: true },
  });
  if (!teacher?.approved) return NextResponse.json({ error: "Teacher is not approved" }, { status: 403 });

  const body = await request.json().catch(() => null);

  const studentId = String(body?.studentId ?? "");
  const classId = String(body?.classId ?? "");
  const session = String(body?.session ?? "morning").trim();
  const dateValue = String(body?.date ?? "");
  const present = body?.present;

  if (!studentId || !classId || !dateValue || typeof present !== "boolean") {
    return NextResponse.json(
      { error: "studentId, classId, date and present are required" },
      { status: 400 }
    );
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const assignment = await db.teacherAssignment.findFirst({
    where: { schoolId, teacherId: teacher.id, classId },
    select: { id: true },
  });
  if (!assignment) return NextResponse.json({ error: "Teacher is not assigned to this class" }, { status: 403 });

  const student = await db.student.findFirst({
    where: { id: studentId, schoolId, classId },
  });
  if (!student) {
    return NextResponse.json({ error: "Student does not belong to this school/class" }, { status: 404 });
  }

  const record = await db.attendance.upsert({
    where: { studentId_date_session: { studentId, date, session } },
    update: { present },
    create: { schoolId, studentId, classId, date, session, present },
  });

  return NextResponse.json(record, { status: 201 });
}
