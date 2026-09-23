import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const user = await getCurrentUser();
  const { schoolId } = await params;

  if (!user?.membership || user.membership.schoolId !== schoolId) {
    return NextResponse.json({ error: "School access required" }, { status: 403 });
  }

  const classId = request.nextUrl.searchParams.get("classId");
  const dateValue = request.nextUrl.searchParams.get("date");

  if (!classId || !dateValue) {
    return NextResponse.json({ error: "classId and date are required" }, { status: 400 });
  }

  const schoolClass = await db.schoolClass.findFirst({
    where: { id: classId, schoolId },
    select: { id: true },
  });
  if (!schoolClass) return NextResponse.json({ error: "Class not found" }, { status: 404 });

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const students = await db.student.findMany({
    where: { schoolId, classId },
    select: { id: true, gender: true },
  });

  const records = await db.attendance.findMany({
    where: { schoolId, classId, date },
    select: { studentId: true, present: true },
  });

  const byStudent = new Map(records.map(record => [record.studentId, record.present]));
  const total = students.length;
  const present = students.filter(student => byStudent.get(student.id) === true).length;
  const absent = students.filter(student => byStudent.get(student.id) === false).length;
  const male = students.filter(student => String(student.gender ?? "").toUpperCase() === "MALE").length;
  const female = students.filter(student => String(student.gender ?? "").toUpperCase() === "FEMALE").length;

  return NextResponse.json({
    total,
    present,
    absent,
    unmarked: total - present - absent,
    male,
    female,
    attendancePercentage: total ? Number(((present / total) * 100).toFixed(1)) : 0,
  });
}
