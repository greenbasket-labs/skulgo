import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { percentage } from "@/lib/grading";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  const classId = request.nextUrl.searchParams.get("classId");
  const subjectId = request.nextUrl.searchParams.get("subjectId");
  const term = request.nextUrl.searchParams.get("term");

  const assessments = await db.assessment.findMany({
    where: {
      schoolId,
      ...(classId ? { classId } : {}),
      ...(subjectId ? { subjectId } : {}),
      ...(term ? { term } : {}),
    },
    include: {
      student: { select: { id: true, admissionId: true, firstName: true, lastName: true } },
      subject: { select: { id: true, name: true } },
    },
    orderBy: { student: { lastName: "asc" } },
  });

  return NextResponse.json(assessments);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  const body = await request.json().catch(() => null);

  const studentId = String(body?.studentId ?? "");
  const classId = String(body?.classId ?? "");
  const subjectId = String(body?.subjectId ?? "");
  const term = String(body?.term ?? "").trim();
  const ca = Number(body?.ca);
  const exam = Number(body?.exam);

  if (!studentId || !classId || !subjectId || !term || !Number.isFinite(ca) || !Number.isFinite(exam)) {
    return NextResponse.json(
      { error: "studentId, classId, subjectId, term, ca and exam are required" },
      { status: 400 }
    );
  }

  if (ca < 0 || ca > 30 || exam < 0 || exam > 70) {
    return NextResponse.json({ error: "CA must be 0-30 and exam must be 0-70" }, { status: 400 });
  }

  const [student, schoolClass, subject] = await Promise.all([
    db.student.findFirst({ where: { id: studentId, schoolId, classId } }),
    db.schoolClass.findFirst({ where: { id: classId, schoolId } }),
    db.subject.findFirst({ where: { id: subjectId, schoolId } }),
  ]);

  if (!student) return NextResponse.json({ error: "Student does not belong to this school/class" }, { status: 404 });
  if (!schoolClass) return NextResponse.json({ error: "Class not found" }, { status: 404 });
  if (!subject) return NextResponse.json({ error: "Subject not found" }, { status: 404 });

  const assigned = await db.teacherAssignment.findFirst({
    where: { schoolId, classId, subjectId, teacher: { approved: true } },
  });
  if (!assigned) {
    return NextResponse.json({ error: "No approved teacher is assigned to this class and subject" }, { status: 400 });
  }

  const assessment = await db.assessment.upsert({
    where: { studentId_subjectId_term: { studentId, subjectId, term } },
    update: { classId, ca, exam },
    create: { schoolId, studentId, classId, subjectId, term, ca, exam },
  });

  return NextResponse.json({
    ...assessment,
    total: percentage(ca, exam),
  }, { status: 201 });
}
